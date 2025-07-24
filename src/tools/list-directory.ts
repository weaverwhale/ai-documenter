import type { Tool, DirectoryListing } from '../types';
import { FileOperationError, getErrorMessage } from '../classes/errors';
import { validateToolInput, ListDirectoryInputSchema } from '../helpers/validation';
import { listDirectoryOptimized } from '../helpers/file-operations';

// Directory listing tool
export const listDirectoryTool: Tool = {
  type: 'function',
  name: 'list_directory',
  description: 'List the contents of a directory to understand project structure',
  parameters: {
    type: 'object',
    properties: {
      directory_path: {
        type: 'string',
        description: 'The path to the directory to list (defaults to current directory)',
      },
      include_hidden: {
        type: 'boolean',
        description: 'Whether to include hidden files and directories',
      },
    },
    required: ['directory_path', 'include_hidden'],
    additionalProperties: false,
  },
  strict: true,
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateToolInput(ListDirectoryInputSchema, input, 'list_directory');

      // Use optimized directory listing with parallel operations
      const result = await listDirectoryOptimized(args.directory_path, args.include_hidden);
      return JSON.stringify(result);
    } catch (error) {
      const result: DirectoryListing = {
        success: false,
        directory_path: error instanceof FileOperationError ? error.filePath : 'unknown',
        error: getErrorMessage(error),
      };

      return JSON.stringify(result);
    }
  },
};
