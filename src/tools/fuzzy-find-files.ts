import path from 'node:path';
import type { Tool } from '../types';
import { getErrorMessage } from '../classes/errors';
import { fuzzySearchFiles } from '../helpers/file-operations';

// New intelligent fuzzy file finder tool
export const fuzzyFindFilesTool: Tool = {
  type: 'function',
  name: 'fuzzy_find_files',
  description: 'Intelligently find files using fuzzy matching with multiple search strategies',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description:
          'File name or partial name to search for (e.g., "config", "test.js", "component")',
      },
      directory_path: {
        type: 'string',
        description: 'The root directory to search in (defaults to current directory)',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 30)',
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const parsed = JSON.parse(input);
      const query = parsed.query as string;
      const directoryPath = parsed.directory_path || process.cwd();
      const maxResults = parsed.max_results || 30;

      if (!query || typeof query !== 'string') {
        return JSON.stringify({
          success: false,
          error: 'Query is required and must be a string',
        });
      }

      // Use dedicated fuzzy search function
      const results = await fuzzySearchFiles({
        query,
        directory_path: directoryPath,
        max_results: maxResults,
        min_score: 0.3,
        include_directories: true,
        case_sensitive: false,
      });

      return JSON.stringify({
        success: true,
        query,
        directory_path: path.resolve(directoryPath),
        results: results.map(result => ({
          file_path: result.file_path,
          relative_path: result.relative_path,
          filename: result.filename,
          directory: result.directory,
          size: result.size,
          last_modified: result.last_modified,
          score: result.score,
          match_type: result.match_type,
        })),
        total_found: results.length,
        truncated: false,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      });
    }
  },
};
