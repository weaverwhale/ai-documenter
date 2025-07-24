import type { Tool } from '../types';
import { readFileTool } from './read-file';
import { listDirectoryTool } from './list-directory';
import { getFileInfoTool } from './get-file-info';
import { writeFileTool } from './write-file';
import { searchFilesTool } from './search-files';
import { analyzeProjectTool } from './analyze-project';
import { searchFileContentTool } from './search-file-content';
import { fuzzyFindFilesTool } from './fuzzy-find-files';

// Export all tools as an array
export const tools: Tool[] = [
  readFileTool,
  listDirectoryTool,
  getFileInfoTool,
  writeFileTool,
  searchFilesTool,
  analyzeProjectTool,
  searchFileContentTool,
  fuzzyFindFilesTool,
];
