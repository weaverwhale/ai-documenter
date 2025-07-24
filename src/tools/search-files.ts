import path from 'node:path';
import type { Tool } from '../types';
import { getErrorMessage } from '../classes/errors';
import { validateSearchFilesInput } from '../helpers/validation';
import { fuzzySearchFiles, searchFilesByPattern } from '../helpers/file-operations';

// Search for files by name pattern
export const searchFilesTool: Tool = {
  type: 'function',
  name: 'search_files',
  description: 'Search for files by name pattern in a directory tree with optional fuzzy matching',
  parameters: {
    type: 'object',
    properties: {
      directory_path: {
        type: 'string',
        description: 'The root directory to search in',
      },
      pattern: {
        type: 'string',
        description:
          'Search pattern (supports wildcards like *.ts, *test*, etc. or fuzzy search terms)',
      },
      file_extensions: {
        type: 'array',
        items: { type: 'string', description: 'File extension' },
        description: 'Optional array of file extensions to filter by (e.g., [".ts", ".js"])',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 50)',
      },
      case_sensitive: {
        type: 'boolean',
        description: 'Whether the search should be case sensitive (default: false)',
      },
      fuzzy_search: {
        type: 'boolean',
        description: 'Enable fuzzy matching for partial file names (default: false)',
      },
      min_score: {
        type: 'number',
        description: 'Minimum similarity score for fuzzy matches (0.0-1.0, default: 0.3)',
      },
      include_directories: {
        type: 'boolean',
        description: 'Include directories in search results (default: false)',
      },
    },
    required: ['directory_path', 'pattern'],
    additionalProperties: false,
  },
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateSearchFilesInput(input);

      // Use fuzzy search if enabled
      if (args.fuzzy_search) {
        const fuzzyResults = await fuzzySearchFiles({
          query: args.pattern,
          directory_path: args.directory_path,
          file_extensions: args.file_extensions || [],
          max_results: args.max_results,
          case_sensitive: args.case_sensitive,
          min_score: args.min_score || 0.3,
          include_directories: args.include_directories || false,
        });

        return JSON.stringify({
          success: true,
          directory_path: path.resolve(args.directory_path),
          pattern: args.pattern,
          fuzzy_search: true,
          results: fuzzyResults.map(result => ({
            file_path: result.file_path,
            relative_path: result.relative_path,
            filename: result.filename,
            directory: result.directory,
            size: result.size,
            last_modified: result.last_modified,
            score: result.score,
            match_type: result.match_type,
          })),
          total_found: fuzzyResults.length,
          truncated: false, // fuzzySearchFiles handles truncation internally
        });
      }

      // Use optimized wildcard pattern matching
      const results = await searchFilesByPattern(args.directory_path, args.pattern, {
        ...(args.file_extensions && { fileExtensions: args.file_extensions }),
        maxResults: args.max_results || 50,
        caseSensitive: args.case_sensitive || false,
        includeDirectories: args.include_directories || false,
      });

      return JSON.stringify({
        success: true,
        directory_path: path.resolve(args.directory_path),
        pattern: args.pattern,
        fuzzy_search: false,
        results,
        total_found: results.length,
        truncated: results.length >= (args.max_results || 50),
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      });
    }
  },
};
