import type { Tool, FileInfo } from '../types';
import { FileOperationError, getErrorMessage } from '../classes/errors';
import { validateToolInput, GetFileInfoInputSchema } from '../helpers/validation';
import { getFileInfoOptimized } from '../helpers/file-operations';

// File information tool
export const getFileInfoTool: Tool = {
  type: 'function',
  name: 'get_file_info',
  description: 'Get detailed information about a file or directory',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The path to the file or directory to analyze',
      },
    },
    required: ['file_path'],
    additionalProperties: false,
  },
  strict: true,
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateToolInput(GetFileInfoInputSchema, input, 'get_file_info');

      // Use optimized file info with additional metadata
      const result = await getFileInfoOptimized(args.file_path);
      return JSON.stringify(result);
    } catch (error) {
      const result: FileInfo = {
        success: false,
        file_path: error instanceof FileOperationError ? error.filePath : 'unknown',
        error: getErrorMessage(error),
      };

      return JSON.stringify(result);
    }
  },
};
