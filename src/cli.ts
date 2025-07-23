import { Agent, run } from '@openai/agents';
import chalk from 'chalk';
import readline from 'node:readline/promises';
import dotenv from 'dotenv';
import { prompt } from './prompt';

dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Loading animation
class LoadingAnimation {
  private interval: NodeJS.Timeout | null = null;
  private frame = 0;
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private message = '';

  start(message: string = 'Thinking') {
    this.message = message;
    this.frame = 0;

    process.stdout.write('\n');
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${chalk.cyan(this.frames[this.frame])} ${chalk.gray(this.message)}...`,
      );
      this.frame = (this.frame + 1) % this.frames.length;
    }, 100);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(50) + '\r'); // Clear the line
    }
  }
}

// File operations will be added later
// For now, the agent works without tools

// Beautiful welcome message
function displayWelcome() {
  console.clear();
  console.log(chalk.bgBlue.white.bold('  📝 Technical Documentation Writer  '));
  console.log(chalk.blue('━'.repeat(50)));
  console.log(chalk.cyan('Welcome to your AI technical documentation assistant!'));
  console.log(chalk.gray('I can help you create documentation for:'));
  console.log(chalk.gray('• Individual files (code, config, data files)'));
  console.log(chalk.gray('• Directory structures and project layouts'));
  console.log(chalk.gray('• API documentation from source code'));
  console.log(chalk.gray('• README files and project overviews'));
  console.log(chalk.gray('• Code explanations and technical guides'));
  console.log();
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('• Ask me to document any file: "Document the file src/app.js"'));
  console.log(chalk.gray('• Ask about directories: "Explain the src/ folder structure"'));
  console.log(chalk.gray('• Request specific documentation: "Write API docs for this project"'));
  console.log();
  console.log(
    chalk.yellow(
      'Type "exit" to quit, "help" for assistance, or ask me to document any file or folder!',
    ),
  );
  console.log(chalk.blue('━'.repeat(50)));
  console.log();
}

// Display help information
function displayHelp() {
  console.log(chalk.bgGreen.white.bold('  📚 HELP - Technical Documentation Writer  '));
  console.log(chalk.green('━'.repeat(50)));
  console.log(chalk.white('General commands:'));
  console.log(chalk.gray('• "exit" or "quit" - Exit the application'));
  console.log(chalk.gray('• "clear" - Clear the screen and reset conversation'));
  console.log(chalk.gray('• "help" - Show this help message'));
  console.log();
  console.log(chalk.white('Documentation requests:'));
  console.log(chalk.gray('• "Document the file config.json"'));
  console.log(chalk.gray('• "Explain what the src/ directory contains"'));
  console.log(chalk.gray('• "Write documentation for the main.py file"'));
  console.log(chalk.gray('• "Create a README for this project"'));
  console.log(chalk.gray('• "Explain how this code works" (after showing me a file)'));
  console.log();
  console.log(chalk.white('I can read and analyze:'));
  console.log(chalk.gray('• Source code files (.js, .py, .java, .ts, etc.)'));
  console.log(chalk.gray('• Configuration files (.json, .yaml, .toml, etc.)'));
  console.log(chalk.gray('• Documentation files (.md, .txt, .rst, etc.)'));
  console.log(chalk.gray('• Directory structures and project layouts'));
  console.log();
  console.log(chalk.yellow("Just tell me which file or folder you'd like documented!"));
  console.log(chalk.green('━'.repeat(50)));
  console.log();
}

// Handle stream responses
async function handleStream(stream: any, loader: LoadingAnimation): Promise<string> {
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
    }
  } catch (error) {
    loader.stop();
    console.log(chalk.red('\n❌ Streaming error:'), error);
  }

  loader.stop();
  return accumulatedResponse.trim();
}

// Create the technical writer agent without tools for now
const documentationAgent = new Agent({
  name: 'Technical Documentation Writer',
  instructions: prompt,
});

// Main conversation loop
async function startConversation() {
  displayWelcome();

  while (true) {
    try {
      const userInput = await rl.question(chalk.blue('You: '));

      // Handle special commands
      if (userInput.toLowerCase().trim() === 'exit' || userInput.toLowerCase().trim() === 'quit') {
        console.log(chalk.green('\n👋 Thank you for using the Technical Documentation Writer!'));
        break;
      }

      if (userInput.toLowerCase().trim() === 'clear') {
        displayWelcome();
        continue;
      }

      if (userInput.toLowerCase().trim() === 'help') {
        displayHelp();
        continue;
      }

      if (userInput.trim() === '') {
        continue;
      }

      // Start loading animation
      const loader = new LoadingAnimation();
      loader.start('Analyzing your request');

      try {
        // Run the agent with just the user input
        const stream = await run(documentationAgent, userInput, { stream: true });

        // Handle the response stream
        const agentResponse = await handleStream(stream, loader);

        console.log('\n');
      } catch (streamError) {
        loader.stop();
        throw streamError;
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error occurred:'), error);
      console.log(chalk.yellow('Please try again with a different request.\n'));
    }
  }

  rl.close();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.green('\n\n👋 Thank you for using the Technical Documentation Writer!'));
  rl.close();
  process.exit(0);
});

// Start the application
async function main() {
  try {
    await startConversation();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Export for potential use as a module
export { documentationAgent };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
