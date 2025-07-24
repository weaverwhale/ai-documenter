import chalk from 'chalk';
import readline from 'node:readline/promises';
import { prompt } from '../llm/prompt';
import { tools } from '../tools/index';
import { Agent } from '../classes/agent';
import { createProvider } from '../llm/providers';
import { ConfigManager } from '../classes/config';
import { ConfigSummary } from '../classes/display';
import { HistoryManager } from '../classes/history';
import type { ProviderConfig, DocumenterConfig, CLIManager } from '../types';

/**
 * CLI Manager class that encapsulates application state and configuration
 */
export class DocumenterCLI implements CLIManager {
  public historyManager: HistoryManager;
  private config: DocumenterConfig = {};
  private configManager: ConfigManager;
  private documentationAgent?: Agent;
  private rl: readline.Interface;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.historyManager = new HistoryManager();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Initialize the CLI with configuration and agent setup
   */
  async initialize(): Promise<void> {
    // Load configuration using ConfigManager
    this.config = await this.configManager.loadConfig();

    // Configure history manager with max history from config
    const maxHistory = this.config.max_conversation_history || 10;
    this.historyManager.setMaxHistory(maxHistory);

    // Validate configuration based on provider
    if (this.config.provider === 'openai' && !this.config.openai_api_key) {
      console.log(chalk.red('❌ Error: OpenAI API key not found.'));
      console.log(chalk.yellow('Please either:'));
      console.log(chalk.gray('• Run "documenter init" to set up configuration'));
      console.log(chalk.gray('• Set OPENAI_API_KEY environment variable'));
      console.log(chalk.gray('• Create a .env file with OPENAI_API_KEY'));
      console.log(chalk.gray('• Add API key to .documenter.json config file'));
      process.exit(1);
    } else if (this.config.provider === 'lmstudio') {
      console.log(chalk.blue('🏠 Using LMStudio local server'));
      console.log(chalk.gray(`Connecting to: ${this.config.lmstudio_endpoint}`));
      console.log(chalk.gray('Make sure LMStudio is running and has a model loaded.'));
    }

    // Create provider based on configuration
    const providerConfig: ProviderConfig = {
      provider: this.config.provider || 'openai',
      ...(this.config.openai_api_key && { openai_api_key: this.config.openai_api_key }),
      ...(this.config.openai_model && { openai_model: this.config.openai_model }),
      ...(this.config.lmstudio_endpoint && { lmstudio_endpoint: this.config.lmstudio_endpoint }),
      ...(this.config.lmstudio_model && { lmstudio_model: this.config.lmstudio_model }),
      ...(this.config.timeout && { timeout: this.config.timeout }),
    };

    const provider = createProvider(providerConfig);

    // Create agent with loaded configuration
    this.documentationAgent = new Agent({
      name: 'Technical Documentation Writer',
      instructions: prompt,
      tools,
      provider,
    });
  }

  // Public methods for external access
  public get agent(): Agent | undefined {
    return this.documentationAgent;
  }

  public get readline(): readline.Interface {
    return this.rl;
  }

  public async getConfigSummary(): Promise<ConfigSummary> {
    return this.configManager.getConfigSummary();
  }

  /**
   * Clean up resources
   */
  async dispose(): Promise<void> {
    this.rl.close();
  }
}
