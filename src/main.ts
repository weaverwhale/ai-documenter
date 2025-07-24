import chalk from 'chalk';
import { ConfigManager } from './classes/config';
import { DocumenterCLI } from './classes/cli';
import { initDocumenter } from './helpers/init';
import { startConversation } from './helpers/conversation';

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.green('\n\n👋 Thank you for using the Technical Documentation Writer!'));
  process.exit(0);
});

/**
 * Main application entry point
 */
export async function main(): Promise<void> {
  const configManager = ConfigManager.getInstance();
  const cli = new DocumenterCLI(configManager);

  try {
    // Check for init command
    if (process.argv.includes('init')) {
      await initDocumenter();
      return;
    }

    await cli.initialize();
    await startConversation(cli);
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

// Export the CLI manager and ConfigManager for potential use as a module
export { DocumenterCLI, ConfigManager };

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}
