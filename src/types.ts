/**
 * Type definitions for AI Documenter
 */

import type { OpenAI } from 'openai';
import type { Interface } from 'node:readline/promises';
import type { Agent } from './classes/agent';
import type { HistoryManager } from './classes/history';
import type { ConfigSummary } from './classes/display';
import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'openai/resources/chat/completions';

// Configuration types
export interface DocumenterConfig {
  // Provider selection
  provider?: 'openai' | 'lmstudio' | undefined;
  // OpenAI specific
  openai_api_key?: string | undefined;
  openai_model?: string | undefined;
  // LMStudio specific
  lmstudio_endpoint?: string | undefined;
  lmstudio_model?: string | undefined;
  // Common settings
  max_conversation_history?: number | undefined;
  default_output_dir?: string | undefined;
  timeout?: number | undefined;
}

// Default configuration with required properties
export interface DefaultDocumenterConfig {
  provider: 'openai' | 'lmstudio';
  openai_model: string;
  lmstudio_endpoint: string;
  lmstudio_model: string;
  max_conversation_history: number;
  default_output_dir: string;
  timeout: number;
}

export interface ProviderConfig {
  provider: 'openai' | 'lmstudio';
  // OpenAI specific
  openai_api_key?: string;
  openai_model?: string;
  // LMStudio specific
  lmstudio_endpoint?: string;
  lmstudio_model?: string;
  // Common
  timeout?: number;
}

// Provider types
export interface LLMProvider {
  name: string;
  client: OpenAI;
  defaultModel: string;
}

// Chat message types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Tool system types
export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  items?: ToolParameter; // For array types
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameter>;
  required: string[];
  additionalProperties: boolean;
  [key: string]: any; // Index signature for OpenAI compatibility
}

export interface Tool {
  type: 'function';
  name: string;
  description: string;
  parameters: ToolParameters;
  strict?: boolean;
  needsApproval?: () => Promise<boolean>;
  invoke: (runContext: unknown, input: string) => Promise<string>;
}

// File operation types
export interface FileInfo {
  success: boolean;
  file_path: string;
  name?: string;
  extension?: string;
  type?: 'directory' | 'file' | 'other';
  size?: number;
  last_modified?: string;
  created?: string;
  permissions?: string;
  is_readable?: boolean;
  is_binary?: boolean;
  is_large?: boolean;
  item_count?: number;
  error?: string;
}

export interface FileContent {
  success: boolean;
  file_path: string;
  size?: number;
  content?: string;
  last_modified?: string;
  error?: string;
}

export interface DirectoryItem {
  name: string;
  type: 'directory' | 'file';
  size: number | null;
  last_modified: string | null;
}

export interface DirectoryListing {
  success: boolean;
  directory_path: string;
  contents?: DirectoryItem[];
  total_items?: number;
  error?: string;
}

export interface WriteFileResult {
  success: boolean;
  file_path: string;
  size?: number;
  created?: string;
  last_modified?: string;
  message?: string;
  error?: string;
}

// Fuzzy search types
export interface FuzzySearchResult {
  file_path: string;
  relative_path: string;
  filename: string;
  directory: string;
  size: number;
  last_modified: string;
  score: number;
  match_type: 'exact' | 'substring' | 'fuzzy' | 'path';
}

export interface FuzzySearchOptions {
  query: string;
  directory_path: string;
  file_extensions?: string[];
  max_results?: number;
  case_sensitive?: boolean;
  search_content?: boolean;
  min_score?: number;
  include_directories?: boolean;
}

// Agent types
export interface AgentConfig {
  name: string;
  instructions: string;
  tools: Tool[];
  provider: LLMProvider;
}

// CLI Manager interface
export interface CLIManager {
  agent: Agent | undefined;
  readline: Interface;
  historyManager: HistoryManager;
  getConfigSummary(): Promise<ConfigSummary>;
  dispose(): Promise<void>;
}

export interface RunOptions {
  stream?: boolean;
  conversationHistory?: ChatMessage[];
}

export interface RunResult {
  finalOutput: string;
  toStream?: () => AsyncGenerator<StreamEvent, void, unknown>;
}

// Stream event types
export interface RawModelStreamEvent {
  type: 'raw_model_stream_event';
  data: {
    type: 'output_text_delta';
    delta: string;
  };
}

export interface RunItemStreamEvent {
  type: 'run_item_stream_event';
  item: {
    type: 'tool_call_item' | 'tool_call_output_item';
    rawItem?: {
      name: string;
    };
  };
}

export type StreamEvent = RawModelStreamEvent | RunItemStreamEvent;

// Tool validation input types
export interface ValidAnalyzeProjectInput {
  project_path: string;
  max_depth: number;
}

export interface ValidSearchFileContentInput {
  directory_path: string;
  search_term: string;
  file_extensions?: string[];
  max_results: number;
  case_sensitive: boolean;
}

/**
 * State management interface for stream processing
 */
export interface StreamProcessorState {
  accumulatedContent: string;
  toolCalls: ChatCompletionMessageToolCall[];
  currentToolCall: ChatCompletionMessageToolCall | null;
  contentSize: number;
  currentMessages: ChatCompletionMessageParam[];
}

/**
 * Tool execution result interface
 */
export interface ToolExecutionResult {
  toolCallId: string;
  success: boolean;
  response: string;
  error?: string;
}
