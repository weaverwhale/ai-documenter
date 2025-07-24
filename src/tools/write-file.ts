import type { Tool, WriteFileResult } from '../types';
import { FileOperationError, getErrorMessage } from '../classes/errors';
import { validateToolInput, WriteFileInputSchema } from '../helpers/validation';
import { writeFileOptimized } from '../helpers/file-operations';

// File writing tool
export const writeFileTool: Tool = {
  type: 'function',
  name: 'write_file',
  description: 'Create or write content to a file',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The path where to create/write the file',
      },
      content: {
        type: 'string',
        description: 'The content to write to the file',
      },
      overwrite: {
        type: 'boolean',
        description: 'Whether to overwrite the file if it already exists',
      },
    },
    required: ['file_path', 'content', 'overwrite'],
    additionalProperties: false,
  },
  strict: true,
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateToolInput(WriteFileInputSchema, input, 'write_file');

      // Use optimized file writing with directory creation and caching
      const result = await writeFileOptimized(args.file_path, args.content, args.overwrite);
      return JSON.stringify(result);
    } catch (error) {
      const result: WriteFileResult = {
        success: false,
        file_path: error instanceof FileOperationError ? error.filePath : 'unknown',
        error: getErrorMessage(error),
      };

      return JSON.stringify(result);
    }
  },
};
