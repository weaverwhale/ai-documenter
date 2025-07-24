import path from 'node:path';
import type { Tool } from '../types';
import { getErrorMessage } from '../classes/errors';
import { validateSearchFileContentInput } from '../helpers/validation';
import { readFileOptimized, isLikelyBinary, traverseDirectory } from '../helpers/file-operations';

// Search for content within files
export const searchFileContentTool: Tool = {
  type: 'function',
  name: 'search_file_content',
  description: 'Search for text content within files in a directory tree',
  parameters: {
    type: 'object',
    properties: {
      directory_path: {
        type: 'string',
        description: 'The root directory to search in',
      },
      search_term: {
        type: 'string',
        description: 'The text to search for within files',
      },
      file_extensions: {
        type: 'array',
        items: { type: 'string', description: 'File extension' },
        description: 'Optional array of file extensions to search in (e.g., [".ts", ".js"])',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 20)',
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Whether the search should be case sensitive (default: false)',
      },
    },
    required: ['directory_path', 'search_term'],
    additionalProperties: false,
  },
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateSearchFileContentInput(input);

      const results: Array<{
        file_path: string;
        relative_path: string;
        matches: Array<{ line_number: number; line_content: string; match_position: number }>;
        total_matches: number;
      }> = [];

      const searchRegex = new RegExp(
        args.search_term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), // Escape regex special chars
        args.case_sensitive ? 'g' : 'gi'
      );

      // Use optimized directory traversal and file reading
      await traverseDirectory(args.directory_path, {
        maxDepth: 10,
        fileExtensions: args.file_extensions,
        visitFile: async (filePath, relativePath) => {
          if (results.length >= args.max_results) return false; // Stop traversal

          try {
            // Skip binary files
            if (await isLikelyBinary(filePath)) return undefined;

            // Use optimized file reading with caching
            const fileResult = await readFileOptimized(filePath);
            if (!fileResult.success || !fileResult.content) return undefined;

            const lines = fileResult.content.split('\n');
            const matches: Array<{
              line_number: number;
              line_content: string;
              match_position: number;
            }> = [];

            lines.forEach((line, index) => {
              const match = searchRegex.exec(line);
              if (match) {
                matches.push({
                  line_number: index + 1,
                  line_content: line.trim(),
                  match_position: match.index,
                });
              }
              searchRegex.lastIndex = 0; // Reset regex state
            });

            if (matches.length > 0) {
              results.push({
                file_path: filePath,
                relative_path: relativePath,
                matches: matches.slice(0, 5), // Limit to 5 matches per file
                total_matches: matches.length,
              });
            }
            return undefined;
          } catch {
            // Skip files we can't read
            return undefined;
          }
        },
      });

      return JSON.stringify({
        success: true,
        directory_path: path.resolve(args.directory_path),
        search_term: args.search_term,
        results,
        total_files_with_matches: results.length,
        truncated: results.length >= args.max_results,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      });
    }
  },
};
