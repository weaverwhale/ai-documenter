# AI Documenter

**AI Documenter** is an AI-powered technical documentation assistant designed to analyze codebases, files, and directories, generating accurate, well-structured documentation, README files, API docs, and technical guides. It supports both OpenAI models (cloud) and LMStudio (local) for deep code and documentation analysis, making it an ideal tool for developers and technical writers who value flexibility and privacy.

## Features

- **Interactive CLI**: Engage in natural conversations with the documentation assistant via a terminal-based interface.
- **Multiple AI Providers**: Choose between OpenAI (cloud) or LMStudio (local) for AI processing.
- **Automated Documentation**: Generate documentation for source files, project directories, configuration files, and more.
- **Inline Documentation**: Add technical documentation directly inside source files (JSDoc, docstrings, etc.) using language-specific standards.
- **AI-Powered Analysis**: Integrates OpenAI's latest models or local LMStudio models for advanced understanding and generation.
- **Privacy-First Option**: Use LMStudio for completely local processing without sending code to external APIs.
- **Multi-Language Support**: Supports documentation standards for JavaScript/TypeScript, Python, Java, C#, Go, Rust, PHP, and Ruby.
- **Customizable Tools**: File system read/write, directory and file info, project structure analysis, and more.
- **Project-Specific Configuration**: Configurable per-project with `.documenter.json` config files.
- **Global Installation**: Install once, use anywhere in your projects.
- **Built-in Help & Guidance**: Easily accessible help and usage examples within the CLI.

## Installation

### Global Installation (Recommended)

Install AI Documenter globally to use it in any project:

```sh
npm install -g ai-documenter
```

### Local Installation

Install in a specific project:

```sh
npm install ai-documenter
npx ai-documenter
```

### From Source

1. **Clone the Repository**:

   ```sh
   git clone <repository-url>
   cd documenter
   ```

2. **Install Dependencies**:

   ```sh
   npm install
   ```

3. **Build and Install**:

   ```sh
   npm run build
   npm link  # For global installation
   ```

## Quick Start

1. **Initialize AI Documenter in your project**:

   ```sh
   cd your-project
   ai-documenter init
   ```

2. **Start the documentation assistant**:

   ```sh
   ai-documenter
   ```

3. **Start documenting**! Try commands like:
   - "Document the file src/app.js"
   - "Create a README for this project"
   - "Explain the src/ folder structure"

## Configuration

AI Documenter supports both **OpenAI** (cloud) and **LMStudio** (local) providers for maximum flexibility.

### Environment Variables

#### Common Settings

- **LLM_PROVIDER** _(Optional)_: Choose provider: `openai` or `lmstudio` (default: `openai`)
- **MAX_CONVERSATION_HISTORY** _(Optional)_: Number of conversation turns to remember (default: 10)
- **DEFAULT_OUTPUT_DIR** _(Optional)_: Default directory for generated documentation (default: `./docs`)
- **LLM_TIMEOUT** _(Optional)_: Request timeout in milliseconds (default: 3600000)

#### OpenAI Provider

- **OPENAI_API_KEY** _(Required for OpenAI)_: Your OpenAI API key
- **OPENAI_MODEL** _(Optional)_: Model to use (default: `gpt-4o-mini`)

#### LMStudio Provider

- **LMSTUDIO_ENDPOINT** _(Optional)_: LMStudio API endpoint (default: `http://localhost:1234/v1`)
- **LMSTUDIO_MODEL** _(Optional)_: Model name in LMStudio (default: `local-model`)

### Configuration File

Create a `.documenter.json` file in your project root (this file is automatically added to `.gitignore`):

#### OpenAI Configuration

```json
{
  "provider": "openai",
  "openai_api_key": "your-api-key-here",
  "openai_model": "gpt-4o-mini",
  "max_conversation_history": 10,
  "default_output_dir": "./docs"
}
```

#### LMStudio Configuration

```json
{
  "provider": "lmstudio",
  "lmstudio_endpoint": "http://localhost:1234/v1",
  "lmstudio_model": "your-local-model-name",
  "max_conversation_history": 10,
  "default_output_dir": "./docs"
}
```

### Configuration Priority

1. `.documenter.json` in current directory
2. `documenter.config.json` in current directory
3. Environment variables
4. `.env` file in current directory
5. Global `.env` file in `~/.documenter/.env`

> **Note**: Configuration files (`.documenter.json`, `documenter.config.json`) are automatically excluded from git to prevent committing sensitive API keys. For team projects, document the required configuration in your project's README instead of committing the actual config files.

### LMStudio Setup

To use LMStudio for local AI models:

1. **Download and Install LMStudio** from [https://lmstudio.ai](https://lmstudio.ai)
2. **Download a Model** (e.g., Code Llama, Mistral, or other coding-focused models)
3. **Start the Local Server** in LMStudio (typically runs on port 1234)
4. **Configure AI Documenter**:

   ```sh
   ai-documenter init
   # Select option 2 for LMStudio when prompted
   ```

5. **Set Environment Variables** (optional):

   ```sh
   export LLM_PROVIDER=lmstudio
   export LMSTUDIO_ENDPOINT=http://localhost:1234/v1
   export LMSTUDIO_MODEL=your-model-name
   ```

**Benefits of LMStudio**:

- ✅ Complete privacy - your code never leaves your machine
- ✅ No API costs - run unlimited documentation generation
- ✅ Works offline - no internet connection required
- ✅ Custom models - use specialized coding models

## Usage

### Interactive Mode

Run `ai-documenter` to start the interactive documentation assistant:

```sh
ai-documenter
```

### Initialize a Project

Set up AI Documenter configuration for your project:

```sh
ai-documenter init
```

### Example Commands

Once in interactive mode, try these commands:

**External Documentation:**

- _Document the file `src/app.js`_
- _Explain the `src/` folder structure_
- _Write API docs for this project_
- _Create a README for this project_
- _Explain how this code works_
- _Generate documentation for the entire codebase_

**Inline Documentation:**

- _Add JSDoc comments to src/utils.js_
- _Add docstrings to all functions in models.py_
- _Document the UserService class with proper JSDoc_
- _Add inline documentation to utils/helpers.ts_
- _Document all methods in the PaymentProcessor class_
- _Add Python docstrings following PEP 257 standards_

### CLI Commands

- `exit` or `quit` - Exit the application
- `clear` - Reset conversation and clear the screen
- `help` - Display help message
- `init` - Initialize documenter in current directory

## Inline Documentation

AI Documenter now supports writing technical documentation directly inside your source files using industry-standard formats for each programming language.

### Supported Languages & Standards

- **JavaScript/TypeScript**: JSDoc format with `@param`, `@returns`, `@throws`, `@example` tags
- **Python**: PEP 257 compliant docstrings with Args, Returns, Raises, Examples sections
- **Java**: JavaDoc format with `@param`, `@return`, `@throws`, `@since` tags
- **C#**: XML documentation with `<summary>`, `<param>`, `<returns>`, `<exception>` tags
- **Go**: Standard Go documentation comments
- **Rust**: Documentation comments with `///` syntax
- **PHP**: PHPDoc standards with `/** */` comments
- **Ruby**: YARD documentation format

### How It Works

1. **Analyze**: The AI reads your source files to understand function signatures, parameters, and behavior
2. **Generate**: Creates appropriate inline documentation using language-specific standards
3. **Preserve**: Maintains existing code logic and formatting while adding documentation
4. **Update**: Uses the `write_file` tool to update your source files with enhanced documentation

### Example Usage

```bash
# Add JSDoc comments to a JavaScript file
"Add JSDoc comments to src/api/userService.js"

# Document Python functions with proper docstrings
"Add docstrings to all functions in data/models.py"

# Document a specific class
"Document the PaymentProcessor class with comprehensive JSDoc"

# Bulk documentation for a file
"Add inline documentation to utils/helpers.ts following TypeScript standards"
```

### What Gets Documented

- **Functions/Methods**: Parameters, return values, exceptions, usage examples
- **Classes**: Purpose, constructor parameters, public methods, properties
- **Interfaces/Types**: Property descriptions and usage patterns
- **Modules**: Overall purpose, exports, and important usage notes
- **Complex Logic**: Step-by-step explanations for algorithms and business logic

## Project Structure

```sh
ai-documenter/
├── src/
│   ├── main.ts                    # Main CLI application and entry point
│   ├── types.ts                   # TypeScript type definitions
│   ├── classes/                   # Core application classes
│   │   ├── agent.ts               # Custom agent implementation for multiple providers
│   │   ├── animation.ts           # CLI loading animations and visual effects
│   │   ├── cache.ts               # Caching utilities and management
│   │   ├── cli.ts                 # CLI interface management and command handling
│   │   ├── config.ts              # Configuration management and validation
│   │   ├── display.ts             # Terminal display utilities and formatting
│   │   ├── errors.ts              # Error handling and custom error types
│   │   └── history.ts             # Conversation history management
│   ├── helpers/                   # Utility helper functions
│   │   ├── conversation.ts        # Conversation management utilities
│   │   ├── file-operations.ts     # File system operations and utilities
│   │   ├── init.ts                # Project initialization and setup
│   │   └── validation.ts          # Input validation and sanitization
│   ├── llm/                       # AI/LLM provider integration
│   │   ├── prompt.ts              # Agent instructions and prompt templates
│   │   └── providers.ts           # Provider abstraction (OpenAI, LMStudio)
│   └── tools/                     # File and directory tools used by the agent
│       ├── index.ts               # Tool exports and registration
│       ├── analyze-project.ts     # Project structure analysis
│       ├── fuzzy-find-files.ts    # Fuzzy file search functionality
│       ├── get-file-info.ts       # File information retrieval
│       ├── list-directory.ts      # Directory listing tool
│       ├── read-file.ts           # File reading tool
│       ├── search-file-content.ts # Content search within files
│       ├── search-files.ts        # File search by name/pattern
│       └── write-file.ts          # File writing tool
├── bin/                           # Built executable (generated)
├── package.json                   # Project configuration and dependencies
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## Configuration Examples

### Basic Setup

1. **Global API Key** (works everywhere):

   ```sh
   echo "OPENAI_API_KEY=your-key-here" >> ~/.zshrc  # or ~/.bashrc
   source ~/.zshrc
   ```

2. **Project-Specific Setup**:

   ```sh
   cd your-project
   ai-documenter init
   # Follow the prompts to configure
   ```

### Advanced Configuration

Create `.documenter.json` for project-specific settings:

```json
{
  "openai_model": "gpt-4o",
  "default_output_dir": "./documentation",
  "max_conversation_history": 20
}
```

## Development

### Running from Source

```sh
npm run dev
```

### Building

```sh
npm run build
./bin/ai-documenter
```

### Publishing

```sh
npm run build
npm publish
```

## Customization

- **Edit `src/prompt.ts`** to change instructions for the technical writer agent
- **Enhance `src/tools.ts`** to extend or modify file system tools
- **Modify `src/main.ts`** to add new commands or change behavior
- **Customize `src/display.ts`** to modify terminal output formatting and styling
- **Extend `src/cli.ts`** to add new CLI features and command handling

## Use Cases

- **API Documentation**: Generate comprehensive API docs from source code
- **README Files**: Create project overviews and setup instructions
- **Code Explanations**: Understand and document complex codebases
- **Technical Guides**: Create step-by-step implementation guides
- **Architecture Documentation**: Document system design and structure
- **Configuration Documentation**: Explain config files and settings
- **Inline Code Documentation**: Add JSDoc, docstrings, and comments directly to source files
- **Legacy Code Documentation**: Document existing codebases that lack proper inline documentation
- **Team Onboarding**: Ensure consistent documentation standards across development teams

## Tips

- Use specific file paths for targeted documentation
- Ask for explanations of code patterns and architecture
- Request documentation in specific formats (Markdown, HTML, etc.)
- Combine multiple requests in conversation for comprehensive docs
- Use the `clear` command to start fresh documentation sessions
- **For inline documentation**: Specify the documentation standard you prefer (e.g., "JSDoc", "PEP 257")
- **Batch documentation**: Ask to document multiple files at once for consistency
- **Review changes**: Always review generated inline documentation before committing to ensure accuracy

## Troubleshooting

### API Key Issues

If you get an API key error:

1. **Run `ai-documenter init`** to set up configuration
2. **Check environment variables**: `echo $OPENAI_API_KEY`
3. **Verify .env file** exists in your project or home directory
4. **Check .documenter.json** configuration file

### Permission Issues

If you get permission errors:

```sh
# Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Build Issues

If the build fails:

```sh
# Clean and rebuild
rm -rf bin/
npm run build
```

## Contributing

Pull requests, bug reports, and feature suggestions are welcome! Please open an issue for discussion before making major changes.

## License

MIT License
