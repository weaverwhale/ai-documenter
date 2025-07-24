import chalk from 'chalk';
import { run } from '../classes/agent';
import { initDocumenter } from '../helpers/init';
import { LoadingAnimation } from '../classes/animation';
import { displayWelcome, displayHelp } from '../classes/display';
import type { CLIManager } from '../types';

/**
 * Handle stream responses from the AI agent
 */
export async function handleStream(stream: any, loader: LoadingAnimation): Promise<string> {
  let accumulatedResponse = '';
  let isFirstChunk = true;

  try {
    for await (const event of stream) {
      if (event.type === 'raw_model_stream_event') {
        if (event.data?.type === 'output_text_delta' && event.data?.delta) {
          if (isFirstChunk) {
            loader.stop();
            process.stdout.write(chalk.green('📝 '));
            isFirstChunk = false;
          }
          process.stdout.write(chalk.white(event.data.delta));
          accumulatedResponse += event.data.delta;
        }
      }
      // Handle tool usage display
      else if (event.type === 'run_item_stream_event') {
        if (event.item?.type === 'tool_call_item') {
          const toolName = event.item.rawItem?.name || 'unknown_tool';

          // Show what file operation is being performed
          if (!isFirstChunk) {
            process.stdout.write('\n');
          }
          loader.stop();

          const emoji =
            toolName === 'read_file'
              ? '📖'
              : toolName === 'list_directory'
                ? '📁'
                : toolName === 'write_file'
                  ? '✍️'
                  : '📄';
          console.log(
            chalk.bgCyan.black.bold(`  ${emoji} ${toolName.replace(/_/g, ' ').toUpperCase()}  `)
          );

          loader.start('Processing file operation');
        } else if (event.item?.type === 'tool_call_output_item') {
          loader.stop();
          loader.start('Analyzing and writing documentation');
        }
      }
    }
  } catch (error) {
    loader.stop();
    console.log(chalk.red('\n❌ Streaming error:'), error);
  }

  loader.stop();
  return accumulatedResponse.trim();
}

/**
 * Main conversation loop
 */
export async function startConversation(cli: CLIManager): Promise<void> {
  await displayWelcome(await cli.getConfigSummary());

  while (true) {
    try {
      const userInput = await cli.readline.question(chalk.blue('You: '));

      // Handle special commands
      if (userInput.toLowerCase().trim() === 'exit' || userInput.toLowerCase().trim() === 'quit') {
        console.log(chalk.green('\n👋 Thank you for using the Technical Documentation Writer!'));
        break;
      }

      if (userInput.toLowerCase().trim() === 'clear') {
        cli.historyManager.clear();
        await displayWelcome(await cli.getConfigSummary());
        continue;
      }

      if (userInput.toLowerCase().trim() === 'help') {
        displayHelp();
        continue;
      }

      if (userInput.toLowerCase().trim() === 'init') {
        await initDocumenter();
        continue;
      }

      if (userInput.trim() === '') {
        continue;
      }

      // Start loading animation
      const loader = new LoadingAnimation();
      loader.start('Analyzing your request');

      try {
        // Get conversation history for context
        const recentHistory = cli.historyManager.getRecent();

        // Run the agent with conversation context - try with streaming options
        const result = await run(cli.agent!, userInput, {
          stream: true,
          conversationHistory: recentHistory,
        });

        // Check if we can use handleStream with the result
        if (result && typeof result.toStream === 'function') {
          const stream = result.toStream();
          const response = await handleStream(stream, loader);

          // Add user message and response to history
          cli.historyManager.add('user', userInput);
          cli.historyManager.add('assistant', response);

          console.log('\n');
        } else {
          // Fallback to the existing approach
          const response = result.finalOutput || 'No response';

          // Add user message and response to history
          cli.historyManager.add('user', userInput);
          cli.historyManager.add('assistant', response);

          // Stop loading animation and display the response
          loader.stop();
          console.log(chalk.green('📝 ') + chalk.white(response));

          console.log('\n');
        }
      } catch (streamError) {
        loader.stop();
        throw streamError;
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error occurred:'), error);
      console.log(chalk.yellow('Please try again with a different request.\n'));
    }
  }

  await cli.dispose();
  process.exit(0);
}
