import path from 'node:path';
import type { Tool } from '../types';
import { getErrorMessage } from '../classes/errors';
import { validateAnalyzeProjectInput } from '../helpers/validation';
import { isLikelyBinary, traverseDirectory } from '../helpers/file-operations';

// Analyze project structure and provide insights
export const analyzeProjectTool: Tool = {
  type: 'function',
  name: 'analyze_project',
  description:
    'Analyze project structure and provide insights about file types, sizes, and organization',
  parameters: {
    type: 'object',
    properties: {
      project_path: {
        type: 'string',
        description: 'The root path of the project to analyze',
      },
      max_depth: {
        type: 'number',
        description: 'Maximum directory depth to analyze (default: 5)',
      },
    },
    required: ['project_path'],
    additionalProperties: false,
  },
  needsApproval: async () => false,
  invoke: async (_runContext: unknown, input: string): Promise<string> => {
    try {
      const args = validateAnalyzeProjectInput(input);

      const analysis = {
        total_files: 0,
        total_size: 0,
        file_types: new Map<string, { count: number; size: number }>(),
        directories: new Map<string, number>(),
        large_files: [] as Array<{ path: string; size: number }>,
        binary_files: 0,
        text_files: 0,
      };

      // Use optimized directory traversal
      await traverseDirectory(args.project_path, {
        maxDepth: args.max_depth,
        visitFile: async (filePath, relativePath, stats) => {
          const ext = path.extname(path.basename(filePath)) || '(no extension)';

          analysis.total_files++;
          analysis.total_size += stats.size;

          // Track file types
          const fileType = analysis.file_types.get(ext) || { count: 0, size: 0 };
          fileType.count++;
          fileType.size += stats.size;
          analysis.file_types.set(ext, fileType);

          // Track large files (> 1MB)
          if (stats.size > 1024 * 1024) {
            analysis.large_files.push({
              path: relativePath,
              size: stats.size,
            });
          }

          // Check if binary using optimized function
          const isBinary = await isLikelyBinary(filePath);
          if (isBinary) {
            analysis.binary_files++;
          } else {
            analysis.text_files++;
          }
          return undefined;
        },
        visitDirectory: async (_dirPath, relativePath) => {
          const dirCount = analysis.directories.get(relativePath) || 0;
          analysis.directories.set(relativePath, dirCount + 1);
          return undefined;
        },
      });

      // Sort large files by size
      analysis.large_files.sort((a, b) => b.size - a.size);
      analysis.large_files = analysis.large_files.slice(0, 10); // Top 10 largest

      // Convert Maps to objects for JSON serialization
      const fileTypesObj = Object.fromEntries(
        Array.from(analysis.file_types.entries())
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 20) // Top 20 file types
      );

      return JSON.stringify({
        success: true,
        project_path: path.resolve(args.project_path),
        summary: {
          total_files: analysis.total_files,
          total_size: analysis.total_size,
          total_size_mb: Math.round((analysis.total_size / (1024 * 1024)) * 100) / 100,
          binary_files: analysis.binary_files,
          text_files: analysis.text_files,
        },
        file_types: fileTypesObj,
        large_files: analysis.large_files,
        total_directories: analysis.directories.size,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: getErrorMessage(error),
      });
    }
  },
};
