import type {
  LLMProvider,
  Tool,
  AgentConfig,
  RunResult,
  RunOptions,
  StreamEvent,
  ToolExecutionResult,
  StreamProcessorState,
} from '../types';
import { ProviderError, getErrorMessage } from '../classes/errors';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionChunk,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';
import type { Stream } from 'openai/streaming';

export class Agent {
  private instructions: string;
  private tools: Tool[];
  private provider: LLMProvider;

  constructor(config: AgentConfig) {
    this.instructions = config.instructions;
    this.tools = config.tools;
    this.provider = config.provider;
  }

  async run(input: string, options: RunOptions = {}): Promise<RunResult> {
    // Build messages array starting with system message
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.instructions,
      },
    ];

    // Add conversation history if provided
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      for (const message of options.conversationHistory) {
        messages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: input,
    });

    // Convert tools to OpenAI format
    const openaiTools: ChatCompletionTool[] = this.tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        strict: tool.strict ?? false,
      },
    }));

    try {
      if (options.stream) {
        return this.runWithStreaming(messages, openaiTools);
      } else {
        return this.runWithoutStreaming(messages, openaiTools);
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error('Error in agent run:', error);

      throw new ProviderError(`Failed to process request: ${errorMessage}`, this.provider.name, {
        originalError: error,
        input,
      });
    }
  }

  private async runWithStreaming(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[]
  ): Promise<RunResult> {
    const createParams: {
      model: string;
      messages: ChatCompletionMessageParam[];
      stream: true;
      tools?: ChatCompletionTool[];
      tool_choice?: 'auto';
    } = {
      model: this.provider.defaultModel,
      messages,
      stream: true,
    };

    if (tools.length > 0) {
      createParams.tools = tools;
      createParams.tool_choice = 'auto';
    }

    const stream = await this.provider.client.chat.completions.create(createParams);

    return {
      finalOutput: '',
      toStream: () => this.processStream(stream, tools, messages),
    };
  }

  private async runWithoutStreaming(
    messages: ChatCompletionMessageParam[],
    tools: ChatCompletionTool[]
  ): Promise<RunResult> {
    let currentMessages = [...messages];
    let finalResponse = '';

    // Keep running until we get a final response without tool calls
    while (true) {
      const createParams: {
        model: string;
        messages: ChatCompletionMessageParam[];
        tools?: ChatCompletionTool[];
        tool_choice?: 'auto';
      } = {
        model: this.provider.defaultModel,
        messages: currentMessages,
      };

      if (tools.length > 0) {
        createParams.tools = tools;
        createParams.tool_choice = 'auto';
      }

      const response = await this.provider.client.chat.completions.create(createParams);

      const message = response.choices[0]?.message;
      if (!message) {
        throw new Error('No response from the model');
      }

      // Add assistant message to conversation
      currentMessages.push(message);

      if (message.tool_calls && message.tool_calls.length > 0) {
        // Process tool calls
        const toolResults = await this.executeToolCalls(message.tool_calls);

        // Add tool responses to conversation
        for (const result of toolResults) {
          currentMessages.push({
            role: 'tool',
            tool_call_id: result.toolCallId,
            content: result.response,
          });
        }
      } else {
        // No tool calls, we have our final response
        finalResponse = message.content || 'No response generated';
        break;
      }
    }

    return {
      finalOutput: finalResponse,
    };
  }

  /**
   * Execute multiple tool calls and return results
   */
  private async executeToolCalls(
    toolCalls: ChatCompletionMessageToolCall[]
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const toolCall of toolCalls) {
      const tool = this.tools.find(t => t.name === toolCall.function.name);

      if (tool) {
        try {
          const toolResponse = await tool.invoke(null, toolCall.function.arguments);
          results.push({
            toolCallId: toolCall.id,
            success: true,
            response: toolResponse,
          });
        } catch (error) {
          const errorMessage = getErrorMessage(error);
          results.push({
            toolCallId: toolCall.id,
            success: false,
            response: JSON.stringify({
              success: false,
              error: `Tool execution failed: ${errorMessage}`,
            }),
            error: errorMessage,
          });
        }
      } else {
        results.push({
          toolCallId: toolCall.id,
          success: false,
          response: JSON.stringify({
            success: false,
            error: `Unknown tool: ${toolCall.function.name}`,
          }),
          error: `Unknown tool: ${toolCall.function.name}`,
        });
      }
    }

    return results;
  }

  private async *processStream(
    stream: Stream<ChatCompletionChunk>,
    tools: ChatCompletionTool[],
    initialMessages: ChatCompletionMessageParam[]
  ): AsyncGenerator<StreamEvent, void, never> {
    // Initialize stream processor state
    const state: StreamProcessorState = {
      accumulatedContent: '',
      toolCalls: [],
      currentToolCall: null,
      contentSize: 0,
      currentMessages: [...initialMessages],
    };

    // Performance optimizations
    const MAX_ACCUMULATED_SIZE = 50 * 1024; // 50KB limit for accumulated content

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      // Handle content streaming with size limit
      if (delta.content) {
        // Check if adding this delta would exceed our memory limit
        const deltaSize = Buffer.byteLength(delta.content, 'utf8');
        if (state.contentSize + deltaSize > MAX_ACCUMULATED_SIZE) {
          // Yield a warning and skip accumulation, but still emit the delta
          yield {
            type: 'raw_model_stream_event',
            data: {
              type: 'output_text_delta',
              delta: '\n[Content truncated due to size limit]\n',
            },
          };
        } else {
          state.accumulatedContent += delta.content;
          state.contentSize += deltaSize;

          yield {
            type: 'raw_model_stream_event',
            data: {
              type: 'output_text_delta',
              delta: delta.content,
            },
          };
        }
      }

      // Handle tool calls with proper state management
      if (delta.tool_calls) {
        // Check if this is the start of a new tool call
        for (const toolCallDelta of delta.tool_calls) {
          if (toolCallDelta.index !== undefined && !state.toolCalls[toolCallDelta.index]) {
            // This is a new tool call, emit the event for UI display
            yield {
              type: 'run_item_stream_event',
              item: {
                type: 'tool_call_item',
                rawItem: {
                  name: toolCallDelta.function?.name || 'unknown_tool',
                },
              },
            };
          }
        }

        this.handleToolCallDeltas(delta.tool_calls, state);
      }

      // Handle end of stream
      if (choice.finish_reason === 'tool_calls' && state.toolCalls.length > 0) {
        // Execute all tool calls and get their responses
        const toolResults = await this.executeToolCalls(state.toolCalls);

        // Emit tool completion events
        for (const result of toolResults) {
          if (result.success) {
            yield {
              type: 'run_item_stream_event',
              item: {
                type: 'tool_call_output_item',
              },
            };
          } else {
            yield {
              type: 'raw_model_stream_event',
              data: {
                type: 'output_text_delta',
                delta: `\n\nError executing tool: ${result.error}`,
              },
            };
          }
        }

        // Continue conversation with tool responses
        const followupMessages: ChatCompletionMessageParam[] = [
          ...state.currentMessages,
          {
            role: 'assistant',
            content: state.accumulatedContent || null,
            tool_calls: state.toolCalls,
          },
          ...toolResults.map(result => ({
            role: 'tool' as const,
            tool_call_id: result.toolCallId,
            content: result.response,
          })),
        ];

        // Get follow-up response
        const followupParams: {
          model: string;
          messages: ChatCompletionMessageParam[];
          tools: ChatCompletionTool[];
          tool_choice: 'auto';
          stream: true;
        } = {
          model: this.provider.defaultModel,
          messages: followupMessages,
          tools,
          tool_choice: 'auto',
          stream: true,
        };

        const followupStream = await this.provider.client.chat.completions.create(followupParams);

        // Continue streaming the follow-up response
        yield* this.processStream(followupStream, tools, followupMessages);
        return;
      }
    }
  }

  /**
   * Handle tool call deltas and update stream state
   */
  private handleToolCallDeltas(
    toolCallDeltas: Array<{
      index?: number;
      id?: string;
      type?: 'function';
      function?: {
        name?: string;
        arguments?: string;
      };
    }>,
    state: StreamProcessorState
  ): void {
    for (const toolCallDelta of toolCallDeltas) {
      if (toolCallDelta.index !== undefined) {
        // Initialize tool call if it doesn't exist
        if (!state.toolCalls[toolCallDelta.index]) {
          state.toolCalls[toolCallDelta.index] = {
            id: toolCallDelta.id || '',
            type: 'function',
            function: {
              name: toolCallDelta.function?.name || '',
              arguments: toolCallDelta.function?.arguments || '',
            },
          };
          state.currentToolCall = state.toolCalls[toolCallDelta.index] ?? null;
        } else {
          // Update existing tool call
          const existingToolCall = state.toolCalls[toolCallDelta.index];
          if (existingToolCall && toolCallDelta.function?.arguments) {
            existingToolCall.function.arguments += toolCallDelta.function.arguments;
          }
        }
      }
    }
  }
}

// Compatibility function to mimic the original run function
export const run = async (
  agent: Agent,
  input: string,
  options: RunOptions = {}
): Promise<RunResult> => {
  return agent.run(input, options);
};
