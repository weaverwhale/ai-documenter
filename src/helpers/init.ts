/**
 * Project initialization functionality for AI Documenter
 */

import chalk from 'chalk';
import readline from 'node:readline/promises';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DocumenterConfig } from '../types';

/**
 * Initialize documenter in a project with interactive setup
 */
export const initDocumenter = async (): Promise<void> => {
  const cwd = process.cwd();
  const configPath = path.join(cwd, '.documenter.json');

  console.log(chalk.bgGreen.white.bold('  🚀 Initializing Documenter  '));
  console.log(chalk.green('━'.repeat(50)));

  // Check if config already exists
  try {
    await fs.access(configPath);
    console.log(chalk.yellow('⚠️  Documenter is already initialized in this directory.'));
    console.log(chalk.gray(`Config file exists at: ${configPath}`));
    return;
  } catch {
    // Config doesn't exist, create it
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(chalk.white("Let's set up documenter for your project.\n"));

    // Ask for provider selection
    console.log(chalk.white('Choose your LLM provider:'));
    console.log(chalk.gray('1. OpenAI (gpt-4o-mini, gpt-4o, etc.)'));
    console.log(chalk.gray('2. LMStudio (Local models)'));
    const providerChoice = await rl.question(chalk.cyan('Select provider [1]: '));
    const provider = providerChoice === '2' ? 'lmstudio' : 'openai';

    // Config object for JSON file - not constrained by discriminated union since it's just for serialization
    let config: DocumenterConfig;

    if (provider === 'openai') {
      const apiKey = await rl.question(
        chalk.cyan('OpenAI API Key (or press Enter to use environment variable): ')
      );
      const model =
        (await rl.question(chalk.cyan('OpenAI Model [gpt-4o-mini]: '))) || 'gpt-4o-mini';

      config = {
        provider: 'openai',
        openai_model: model,
        max_conversation_history: 10,
      };

      if (apiKey.trim()) {
        config.openai_api_key = apiKey.trim();
      }
    } else {
      const endpoint =
        (await rl.question(chalk.cyan('LMStudio Endpoint [http://localhost:1234/v1]: '))) ||
        'http://localhost:1234/v1';
      const model = (await rl.question(chalk.cyan('Model name [local-model]: '))) || 'local-model';

      config = {
        provider: 'lmstudio',
        lmstudio_endpoint: endpoint,
        lmstudio_model: model,
        max_conversation_history: 10,
      };
    }

    const outputDir =
      (await rl.question(chalk.cyan('Default output directory [./docs]: '))) || './docs';
    config.default_output_dir = outputDir;

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Create .env file if needed
    if (config.provider === 'openai' && config.openai_api_key) {
      const envPath = path.join(cwd, '.env');
      const envContent = `LLM_PROVIDER=${config.provider}\nOPENAI_API_KEY=${config.openai_api_key}\nOPENAI_MODEL=${config.openai_model}\n`;

      try {
        await fs.access(envPath);
        console.log(
          chalk.yellow(
            '\n⚠️  .env file already exists. Please manually add your configuration if needed.'
          )
        );
      } catch {
        await fs.writeFile(envPath, envContent);
        console.log(chalk.green('\n✅ Created .env file with your configuration.'));
      }
    } else if (config.provider === 'lmstudio') {
      const envPath = path.join(cwd, '.env');
      const envContent = `LLM_PROVIDER=${config.provider}\nLMSTUDIO_ENDPOINT=${config.lmstudio_endpoint}\nLMSTUDIO_MODEL=${config.lmstudio_model}\n`;

      try {
        await fs.access(envPath);
        console.log(
          chalk.yellow(
            '\n⚠️  .env file already exists. Please manually add your LMStudio configuration if needed.'
          )
        );
      } catch {
        await fs.writeFile(envPath, envContent);
        console.log(chalk.green('\n✅ Created .env file with your LMStudio configuration.'));
      }
    }

    console.log(chalk.green(`\n✅ Documenter initialized successfully!`));
    console.log(chalk.gray(`Config saved to: ${configPath}`));
    console.log(
      chalk.white('\nYou can now run "documenter" to start the documentation assistant.')
    );
  } finally {
    rl.close();
  }
};
