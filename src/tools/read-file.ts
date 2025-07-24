import path from 'node:path';
import type { Tool, FileContent } from '../types';
import { FileOperationError, getErrorMessage } from '../classes/errors';
import { validateToolInput, ReadFileInputSchema } from '../helpers/validation';
import { readFileOptimized, isLikelyBinary } from '../helpers/file-operations';

// File reading tool
export const readFileTool: Tool = {
  type: 'function',
  name: 'read_file',
  description: 'Read the contents of a file for analysis and documentation',
  parameters: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'The path to the file to read (relative or absolute)',
      },
    },
    required: ['file_path'],
    additionalProperties: false,
  },
  strict: true,
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateToolInput(ReadFileInputSchema, input, 'read_file');

      // Check if file is likely binary before reading
      const isBinary = await isLikelyBinary(args.file_path);
      if (isBinary) {
        const result: FileContent = {
          success: false,
          file_path: path.resolve(args.file_path),
          error: 'File appears to be binary and cannot be read as text',
        };
        return JSON.stringify(result);
      }

      // Use optimized file reading with caching and streaming
      const result = await readFileOptimized(args.file_path);
      return JSON.stringify(result);
    } catch (error) {
      const result: FileContent = {
        success: false,
        file_path: error instanceof FileOperationError ? error.filePath : 'unknown',
        error: getErrorMessage(error),
      };

      return JSON.stringify(result);
    }
  },
};
