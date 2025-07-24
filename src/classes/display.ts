import chalk from 'chalk';

export interface ConfigSummary {
  workingDir: string;
  provider: string;
  endpoint?: string;
  model: string;
}

/**
 * Display the beautiful welcome message with configuration info
 */
export async function displayWelcome(configSummary: ConfigSummary): Promise<void> {
  console.clear();
  console.log(chalk.bgBlue.white.bold('  📝 Technical Documentation Writer  '));
  console.log(chalk.blue('━'.repeat(50)));
  console.log(chalk.cyan('Welcome to your AI technical documentation assistant!'));

  try {
    console.log(chalk.gray(`Working directory: ${configSummary.workingDir}`));
    console.log(chalk.gray(`Provider: ${configSummary.provider}`));
    if (configSummary.endpoint) {
      console.log(chalk.gray(`Endpoint: ${configSummary.endpoint}`));
    }
    console.log(chalk.gray(`Model: ${configSummary.model}`));
  } catch (error) {
    console.log(chalk.gray(`Working directory: ${process.cwd()}`));
    console.log(chalk.red('Configuration error - please check your setup'));
  }

  console.log();
  console.log(chalk.gray('I can help you create documentation for:'));
  console.log(chalk.gray('• Individual files with smart binary detection and caching'));
  console.log(chalk.gray('• Directory structures with parallel processing'));
  console.log(chalk.gray('• Complete project analysis and insights'));
  console.log(chalk.gray('• File search by name patterns or content'));
  console.log(chalk.gray('• API documentation from source code'));
  console.log(chalk.gray('• README files and project overviews'));
  console.log(chalk.gray('• Code explanations and technical guides'));
  console.log(
    chalk.gray('• Inline documentation (JSDoc, docstrings, etc.) directly in source files')
  );
  console.log();
  console.log(chalk.white('Available commands:'));
  console.log(chalk.gray('• Document files: "Document the file src/app.js"'));
  console.log(chalk.gray('• Analyze projects: "Analyze this project structure"'));
  console.log(chalk.gray('• Search files: "Find all TypeScript test files"'));
  console.log(chalk.gray('• Search content: "Find where UserService is used"'));
  console.log(chalk.gray('• Create docs: "Write API docs for this project"'));
  console.log(chalk.gray('• Generate files: "Create a README for this project"'));
  console.log(chalk.gray('• Add inline docs: "Add JSDoc comments to src/utils.js"'));
  console.log(chalk.gray('• Document functions: "Add docstrings to all functions in main.py"'));
  console.log();
  console.log(
    chalk.yellow(
      'Type "exit" to quit, "help" for assistance, or ask me to document any file or folder!'
    )
  );
  console.log(chalk.blue('━'.repeat(50)));
  console.log();
}

/**
 * Display comprehensive help information
 */
export function displayHelp(): void {
  console.log(chalk.bgGreen.white.bold('  📚 HELP - Technical Documentation Writer  '));
  console.log(chalk.green('━'.repeat(50)));
  console.log(chalk.white('General commands:'));
  console.log(chalk.gray('• "exit" or "quit" - Exit the application'));
  console.log(chalk.gray('• "clear" - Clear the screen and reset conversation'));
  console.log(chalk.gray('• "help" - Show this help message'));
  console.log(chalk.gray('• "init" - Initialize documenter in current directory'));
  console.log();
  console.log(chalk.white('Documentation requests:'));
  console.log(chalk.gray('• "Document the file config.json"'));
  console.log(chalk.gray('• "Analyze this project structure and file types"'));
  console.log(chalk.gray('• "Find all files containing authentication logic"'));
  console.log(chalk.gray('• "Search for files matching *test*.ts"'));
  console.log(chalk.gray('• "Write documentation for the main.py file"'));
  console.log(chalk.gray('• "Create a README for this project"'));
  console.log(chalk.gray('• "Generate API documentation and save it to docs/"'));
  console.log();
  console.log(chalk.white('Inline documentation:'));
  console.log(chalk.gray('• "Add JSDoc comments to src/api.js"'));
  console.log(chalk.gray('• "Add docstrings to all functions in models.py"'));
  console.log(chalk.gray('• "Document the UserService class with JSDoc"'));
  console.log(chalk.gray('• "Add inline documentation to utils/helpers.ts"'));
  console.log(chalk.gray('• "Document all methods in the PaymentProcessor class"'));
  console.log();
  console.log(chalk.white('Supported inline documentation formats:'));
  console.log(chalk.gray('• JavaScript/TypeScript: JSDoc (@param, @returns, @throws, @example)'));
  console.log(chalk.gray('• Python: PEP 257 docstrings (Args, Returns, Raises, Examples)'));
  console.log(chalk.gray('• Java: JavaDoc (@param, @return, @throws, @since)'));
  console.log(chalk.gray('• C#: XML documentation (summary, param, returns, exception)'));
  console.log(chalk.gray('• Go, Rust, PHP, Ruby: Language-specific standards'));
  console.log();
  console.log(chalk.white('Configuration:'));
  console.log(chalk.gray('• Create .documenter.json in your project root'));
  console.log(chalk.gray('• Run "documenter init" to set up project-specific config'));
  console.log(chalk.gray('• Supports OpenAI (cloud) and LMStudio (local) providers'));
  console.log(chalk.gray('• For OpenAI: Set OPENAI_API_KEY in environment or .env file'));
  console.log(chalk.gray('• For LMStudio: Set LLM_PROVIDER=lmstudio and configure endpoint'));
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
