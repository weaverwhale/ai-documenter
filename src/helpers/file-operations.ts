/**
 * Optimized file operations with adaptive caching and memory management
 */

import fs from 'node:fs/promises';
import { createReadStream, Stats } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileOperationError, getErrorMessage } from '../classes/errors';
import { fileCache, FILE_CONFIG } from '../classes/cache';
import type {
  FileContent,
  DirectoryListing,
  FileInfo,
  WriteFileResult,
  FuzzySearchResult,
  FuzzySearchOptions,
} from '../types';

/**
 * Enhanced streaming with backpressure handling and memory monitoring
 */
async function streamLargeFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    const stream = createReadStream(filePath, {
      encoding: 'utf8',
      highWaterMark: FILE_CONFIG.CHUNK_SIZE,
    });

    stream.on('data', (chunk: string | Buffer) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
      chunks.push(buffer);
      totalSize += buffer.length;

      // Check memory pressure and abort if necessary
      const memoryPressure = 1 - os.freemem() / os.totalmem();
      if (memoryPressure > FILE_CONFIG.MEMORY_PRESSURE_THRESHOLD) {
        stream.destroy();
        reject(
          new FileOperationError(
            `File streaming aborted due to high memory pressure (${Math.round(memoryPressure * 100)}%)`,
            filePath,
            'read'
          )
        );
        return;
      }

      // Abort if file is unexpectedly large
      if (totalSize > FILE_CONFIG.MAX_FILE_SIZE * 2) {
        stream.destroy();
        reject(
          new FileOperationError(
            `File too large for streaming: ${totalSize} bytes (max: ${FILE_CONFIG.MAX_FILE_SIZE * 2})`,
            filePath,
            'read'
          )
        );
        return;
      }
    });

    stream.on('end', () => {
      try {
        const content = Buffer.concat(chunks).toString('utf8');
        resolve(content);
      } catch (error) {
        reject(
          new FileOperationError(
            `Failed to concatenate file chunks: ${getErrorMessage(error)}`,
            filePath,
            'read'
          )
        );
      }
    });

    stream.on('error', error => {
      reject(new FileOperationError(`Stream error: ${getErrorMessage(error)}`, filePath, 'read'));
    });
  });
}

/**
 * Optimized file reading with caching and streaming support
 */
export async function readFileOptimized(filePath: string): Promise<FileContent> {
  const resolvedPath = path.resolve(filePath);

  try {
    const stats = await fs.stat(resolvedPath);

    // Check cache first
    const cachedContent = fileCache.get(resolvedPath, stats.size, stats.mtime.getTime());
    if (cachedContent) {
      return {
        success: true,
        file_path: resolvedPath,
        size: stats.size,
        content: cachedContent,
        last_modified: stats.mtime.toISOString(),
      };
    }

    let content: string;

    // Use streaming for large files
    if (stats.size > FILE_CONFIG.MAX_FILE_SIZE) {
      content = await streamLargeFile(resolvedPath);
    } else {
      content = await fs.readFile(resolvedPath, 'utf-8');
      // Cache smaller files
      fileCache.set(resolvedPath, content, stats.size);
    }

    return {
      success: true,
      file_path: resolvedPath,
      size: stats.size,
      content,
      last_modified: stats.mtime.toISOString(),
    };
  } catch (error) {
    throw new FileOperationError(
      `Failed to read file: ${getErrorMessage(error)}`,
      resolvedPath,
      'read',
      { originalError: error }
    );
  }
}

/**
 * Optimized directory listing with parallel stat operations
 */
export async function listDirectoryOptimized(
  directoryPath: string,
  includeHidden: boolean = false
): Promise<DirectoryListing> {
  const resolvedPath = path.resolve(directoryPath);

  try {
    const items = await fs.readdir(resolvedPath, { withFileTypes: true });

    const filteredItems = includeHidden ? items : items.filter(item => !item.name.startsWith('.'));

    // Process items in parallel for better performance
    const contents = await Promise.allSettled(
      filteredItems.map(async item => {
        const itemPath = path.join(resolvedPath, item.name);
        try {
          const stats = await fs.stat(itemPath);
          return {
            name: item.name,
            type: item.isDirectory() ? ('directory' as const) : ('file' as const),
            size: item.isFile() ? stats.size : null,
            last_modified: stats.mtime.toISOString(),
          };
        } catch {
          // Return basic info if stat fails
          return {
            name: item.name,
            type: item.isDirectory() ? ('directory' as const) : ('file' as const),
            size: null,
            last_modified: null,
          };
        }
      })
    );

    // Filter out failed operations and extract successful results
    const successfulContents = contents
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    return {
      success: true,
      directory_path: resolvedPath,
      contents: successfulContents,
      total_items: successfulContents.length,
    };
  } catch (error) {
    throw new FileOperationError(
      `Failed to list directory: ${getErrorMessage(error)}`,
      resolvedPath,
      'list',
      { originalError: error }
    );
  }
}

/**
 * Check if file is likely binary to avoid processing
 */
export async function isLikelyBinary(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);

    // Very large files are likely binary
    if (stats.size > 100 * 1024 * 1024) {
      // 100MB
      return true;
    }

    // Check file extension
    const ext = path.extname(filePath).toLowerCase();
    const binaryExtensions = new Set([
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.bin',
      '.dat',
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.bmp',
      '.ico',
      '.mp3',
      '.mp4',
      '.avi',
      '.mov',
      '.wav',
      '.flac',
      '.zip',
      '.tar',
      '.gz',
      '.rar',
      '.7z',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.woff',
      '.woff2',
      '.ttf',
      '.otf',
      '.eot',
    ]);

    if (binaryExtensions.has(ext)) {
      return true;
    }

    // Sample first few bytes for binary content detection
    if (stats.size > 0) {
      const sampleSize = Math.min(1024, stats.size);
      const buffer = Buffer.alloc(sampleSize);

      const fd = await fs.open(filePath, 'r');
      try {
        await fd.read(buffer, 0, sampleSize, 0);

        // Check for null bytes (common in binary files)
        for (let i = 0; i < sampleSize; i++) {
          if (buffer[i] === 0) {
            return true;
          }
        }
      } finally {
        await fd.close();
      }
    }

    return false;
  } catch {
    // If we can't determine, assume it's text
    return false;
  }
}

/**
 * Get file info with additional metadata
 */
export async function getFileInfoOptimized(filePath: string): Promise<FileInfo> {
  const resolvedPath = path.resolve(filePath);

  try {
    const stats = await fs.stat(resolvedPath);
    const isBinary = await isLikelyBinary(resolvedPath);

    const info: FileInfo = {
      success: true,
      file_path: resolvedPath,
      name: path.basename(resolvedPath),
      extension: path.extname(resolvedPath),
      type: stats.isDirectory() ? 'directory' : stats.isFile() ? 'file' : 'other',
      size: stats.size,
      last_modified: stats.mtime.toISOString(),
      created: stats.birthtime.toISOString(),
      permissions: stats.mode.toString(8),
      is_readable: true,
    };

    // Add additional metadata
    if (stats.isDirectory()) {
      try {
        const items = await fs.readdir(resolvedPath);
        info.item_count = items.length;
      } catch {
        // Ignore if we can't read directory
      }
    } else {
      // Add binary detection result
      info.is_binary = isBinary;
      info.is_large = stats.size > FILE_CONFIG.MAX_FILE_SIZE;
    }

    return info;
  } catch (error) {
    throw new FileOperationError(
      `Failed to get file info: ${getErrorMessage(error)}`,
      resolvedPath,
      'stat',
      { originalError: error }
    );
  }
}

/**
 * Write file with directory creation and backup support
 */
export async function writeFileOptimized(
  filePath: string,
  content: string,
  overwrite: boolean = false,
  createBackup: boolean = false
): Promise<WriteFileResult> {
  const resolvedPath = path.resolve(filePath);

  try {
    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(resolvedPath);
      fileExists = true;
    } catch {
      // File doesn't exist
    }

    if (fileExists && !overwrite) {
      return {
        success: false,
        error: 'File already exists and overwrite is set to false',
        file_path: resolvedPath,
      };
    }

    // Create backup if requested
    if (fileExists && createBackup) {
      const backupPath = `${resolvedPath}.backup.${Date.now()}`;
      await fs.copyFile(resolvedPath, backupPath);
    }

    // Create directory if it doesn't exist
    const dir = path.dirname(resolvedPath);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(resolvedPath, content, 'utf-8');

    // Clear cache for this file
    fileCache.delete(resolvedPath);

    // Get file stats for confirmation
    const stats = await fs.stat(resolvedPath);

    return {
      success: true,
      file_path: resolvedPath,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      last_modified: stats.mtime.toISOString(),
      message: fileExists ? 'File overwritten successfully' : 'File created successfully',
    };
  } catch (error) {
    throw new FileOperationError(
      `Failed to write file: ${getErrorMessage(error)}`,
      resolvedPath,
      'write',
      { originalError: error }
    );
  }
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Initialize 2D array with explicit dimensions
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1).fill(0);
  }

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j]! + 1, // deletion
          dp[i]![j - 1]! + 1, // insertion
          dp[i - 1]![j - 1]! + 1 // substitution
        );
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Calculate fuzzy match score using multiple algorithms
 */
function calculateFuzzyScore(
  query: string,
  target: string,
  caseSensitive: boolean = false
): number {
  const q = caseSensitive ? query : query.toLowerCase();
  const t = caseSensitive ? target : target.toLowerCase();

  // Exact match gets highest score
  if (q === t) return 1.0;

  // Substring match gets high score
  if (t.includes(q)) {
    const ratio = q.length / t.length;
    return 0.9 * ratio;
  }

  // Fuzzy matching using Levenshtein distance
  const maxLen = Math.max(q.length, t.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(q, t);
  const similarity = 1 - distance / maxLen;

  // Bonus for matching characters in sequence
  let sequenceBonus = 0;
  let queryIndex = 0;
  for (let i = 0; i < t.length && queryIndex < q.length; i++) {
    if (t[i] === q[queryIndex]) {
      sequenceBonus += 0.1;
      queryIndex++;
    }
  }

  // Bonus for matching at word boundaries
  let boundaryBonus = 0;
  const words = t.split(/[\s\-_.]/);
  for (const word of words) {
    if (word.startsWith(q.substring(0, Math.min(3, q.length)))) {
      boundaryBonus += 0.2;
      break;
    }
  }

  return Math.min(1.0, similarity + sequenceBonus + boundaryBonus);
}

/**
 * Advanced fuzzy file search with intelligent ranking and performance optimizations
 */
export async function fuzzySearchFiles(options: FuzzySearchOptions): Promise<FuzzySearchResult[]> {
  const {
    query,
    directory_path,
    file_extensions = [],
    max_results = 50,
    case_sensitive = false,
    min_score = FILE_CONFIG.FUZZY_SEARCH_THRESHOLD,
    include_directories = false,
  } = options;

  const resolvedPath = path.resolve(directory_path);
  const results: FuzzySearchResult[] = [];
  const MAX_FILES_PROCESSED = max_results * 10; // Limit processing for performance
  let filesProcessed = 0;

  async function searchRecursive(currentPath: string, depth: number = 0): Promise<void> {
    // Early termination conditions for performance
    if (
      depth > FILE_CONFIG.MAX_SEARCH_DEPTH ||
      results.length >= max_results * 2 ||
      filesProcessed >= MAX_FILES_PROCESSED
    ) {
      return;
    }

    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      // Process items in smaller batches to avoid blocking the event loop
      const BATCH_SIZE = 50;
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        for (const item of batch) {
          if (results.length >= max_results * 2 || filesProcessed >= MAX_FILES_PROCESSED) break;

          const itemPath = path.join(currentPath, item.name);
          const relativePath = path.relative(resolvedPath, itemPath);

          if (item.isFile() || (include_directories && item.isDirectory())) {
            filesProcessed++;

            // Skip hidden files unless explicitly searching for them
            if (item.name.startsWith('.') && !query.startsWith('.')) continue;

            // Filter by extensions if specified
            if (file_extensions.length > 0 && item.isFile()) {
              const ext = path.extname(item.name);
              if (!file_extensions.includes(ext)) continue;
            }

            // Calculate scores for different parts of the path
            const filename = item.name;
            const directory = path.dirname(relativePath);
            const fullPath = relativePath;

            const filenameScore = calculateFuzzyScore(query, filename, case_sensitive);
            const directoryScore = calculateFuzzyScore(query, directory, case_sensitive) * 0.7;
            const pathScore = calculateFuzzyScore(query, fullPath, case_sensitive) * 0.9;

            const bestScore = Math.max(filenameScore, directoryScore, pathScore);

            if (bestScore >= min_score) {
              try {
                const stats = await fs.stat(itemPath);

                let matchType: FuzzySearchResult['match_type'] = 'fuzzy';
                if (filenameScore === 1.0 || pathScore === 1.0) matchType = 'exact';
                else if (
                  filenameScore > 0.8 ||
                  filename.toLowerCase().includes(query.toLowerCase())
                )
                  matchType = 'substring';
                else if (pathScore > filenameScore) matchType = 'path';

                results.push({
                  file_path: itemPath,
                  relative_path: relativePath,
                  filename,
                  directory,
                  size: stats.size,
                  last_modified: stats.mtime.toISOString(),
                  score: bestScore,
                  match_type: matchType,
                });
              } catch {
                // Skip files we can't stat
              }
            }
          } else if (item.isDirectory() && !item.name.startsWith('.')) {
            await searchRecursive(itemPath, depth + 1);
          }
        }

        // Yield control to prevent blocking
        if (i + BATCH_SIZE < items.length) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    } catch {
      // Skip directories we can't read
    }
  }

  await searchRecursive(resolvedPath);

  // Sort by score (highest first), then by match type preference, then by path length
  return results
    .sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.1) {
        return b.score - a.score;
      }

      // Prefer certain match types
      const typeOrder = { exact: 4, substring: 3, path: 2, fuzzy: 1 };
      const typeDiff = typeOrder[b.match_type] - typeOrder[a.match_type];
      if (typeDiff !== 0) return typeDiff;

      // Prefer shorter paths (more specific matches)
      return a.relative_path.length - b.relative_path.length;
    })
    .slice(0, max_results);
}

/**
 * Shared directory traversal utility with visitor pattern
 */
export interface DirectoryVisitor {
  visitFile?: (filePath: string, relativePath: string, stats: Stats) => Promise<boolean | void>;
  visitDirectory?: (dirPath: string, relativePath: string) => Promise<boolean | void>;
  shouldEnterDirectory?: (dirPath: string, relativePath: string) => boolean;
  maxDepth?: number;
  includeHidden?: boolean;
  fileExtensions?: string[] | undefined;
}

export async function traverseDirectory(
  rootPath: string,
  visitor: DirectoryVisitor
): Promise<void> {
  const resolvedPath = path.resolve(rootPath);
  const maxDepth = visitor.maxDepth || 10;
  const includeHidden = visitor.includeHidden || false;

  async function traverseRecursive(currentPath: string, depth: number = 0): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const items = await fs.readdir(currentPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        const relativePath = path.relative(resolvedPath, itemPath);

        // Skip hidden files/directories unless explicitly included
        if (!includeHidden && item.name.startsWith('.')) continue;

        if (item.isFile()) {
          try {
            // Check extension filter if provided
            if (visitor.fileExtensions && visitor.fileExtensions.length > 0) {
              const ext = path.extname(item.name);
              if (!visitor.fileExtensions.includes(ext)) continue;
            }

            const stats = await fs.stat(itemPath);
            if (visitor.visitFile) {
              const shouldContinue = await visitor.visitFile(itemPath, relativePath, stats);
              if (shouldContinue === false) return; // Early termination
            }
          } catch {
            // Skip files we can't stat
          }
        } else if (item.isDirectory()) {
          if (visitor.visitDirectory) {
            const shouldContinue = await visitor.visitDirectory(itemPath, relativePath);
            if (shouldContinue === false) return; // Early termination
          }

          // Check if we should enter this directory
          const shouldEnter = visitor.shouldEnterDirectory
            ? visitor.shouldEnterDirectory(itemPath, relativePath)
            : true;

          if (shouldEnter) {
            await traverseRecursive(itemPath, depth + 1);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  await traverseRecursive(resolvedPath);
}

/**
 * Optimized wildcard pattern matching using shared traversal
 */
export async function searchFilesByPattern(
  directoryPath: string,
  pattern: string,
  options: {
    fileExtensions?: string[];
    maxResults?: number;
    caseSensitive?: boolean;
    includeDirectories?: boolean;
  } = {}
): Promise<
  Array<{
    file_path: string;
    relative_path: string;
    size: number;
    last_modified: string;
  }>
> {
  const results: Array<{
    file_path: string;
    relative_path: string;
    size: number;
    last_modified: string;
  }> = [];

  const maxResults = options.maxResults || 50;
  const regexPattern = pattern.replace(/\*/g, '.*');
  const regex = new RegExp(regexPattern, options.caseSensitive ? '' : 'i');

  await traverseDirectory(directoryPath, {
    maxDepth: 10,
    fileExtensions: options.fileExtensions,
    visitFile: async (filePath, relativePath, stats) => {
      if (results.length >= maxResults) return false; // Stop traversal

      const filename = path.basename(filePath);
      if (regex.test(filename)) {
        results.push({
          file_path: filePath,
          relative_path: relativePath,
          size: stats.size,
          last_modified: stats.mtime.toISOString(),
        });
      }
      return undefined;
    },
    visitDirectory: async (dirPath, relativePath) => {
      if (!options.includeDirectories) return undefined;
      if (results.length >= maxResults) return false; // Stop traversal

      const dirname = path.basename(dirPath);
      if (regex.test(dirname)) {
        try {
          const stats = await fs.stat(dirPath);
          results.push({
            file_path: dirPath,
            relative_path: relativePath,
            size: 0, // Directories don't have meaningful size
            last_modified: stats.mtime.toISOString(),
          });
        } catch {
          // Skip if we can't stat
        }
      }
      return undefined;
    },
  });

  return results;
}
