/**
 * Adaptive file caching system with memory pressure awareness and performance optimization
 */

import os from 'node:os';

/**
 * System-adaptive configuration for file operations
 */
interface AdaptiveFileConfig {
  readonly MAX_FILE_SIZE: number;
  readonly CACHE_SIZE: number;
  readonly CACHE_TTL: number;
  readonly CHUNK_SIZE: number;
  readonly FUZZY_SEARCH_THRESHOLD: number;
  readonly MAX_SEARCH_DEPTH: number;
  readonly MEMORY_PRESSURE_THRESHOLD: number;
}

/**
 * Calculate optimal configuration based on system resources
 */
function getAdaptiveConfig(): AdaptiveFileConfig {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const memoryPressure = 1 - freeMemory / totalMemory;

  // Base configuration
  const baseConfig = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB baseline
    CACHE_SIZE: 50,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    CHUNK_SIZE: 64 * 1024, // 64KB
    FUZZY_SEARCH_THRESHOLD: 0.3,
    MAX_SEARCH_DEPTH: 8,
    MEMORY_PRESSURE_THRESHOLD: 0.8, // 80% memory usage threshold
  };

  // Adapt based on available system resources
  const adaptiveConfig: AdaptiveFileConfig = {
    // Scale max file size based on available memory (10% of total or 100MB max)
    MAX_FILE_SIZE: Math.min(
      totalMemory * 0.1,
      100 * 1024 * 1024,
      Math.max(baseConfig.MAX_FILE_SIZE, freeMemory * 0.05)
    ),

    // Adapt cache size based on free memory (1MB per cached file, min 10, max 200)
    CACHE_SIZE: Math.min(Math.max(10, Math.floor(freeMemory / (1024 * 1024))), 200),

    // Adjust cache TTL based on memory pressure
    CACHE_TTL:
      memoryPressure > 0.7
        ? 2 * 60 * 1000 // 2 minutes under high pressure
        : memoryPressure > 0.5
          ? 5 * 60 * 1000 // 5 minutes under medium pressure
          : 10 * 60 * 1000, // 10 minutes under low pressure

    // Optimize chunk size based on available memory
    CHUNK_SIZE:
      freeMemory > 2 * 1024 * 1024 * 1024 // 2GB
        ? 128 * 1024 // 128KB for high-memory systems
        : freeMemory > 512 * 1024 * 1024 // 512MB
          ? 64 * 1024 // 64KB for medium-memory systems
          : 32 * 1024, // 32KB for low-memory systems

    FUZZY_SEARCH_THRESHOLD: baseConfig.FUZZY_SEARCH_THRESHOLD,
    MAX_SEARCH_DEPTH: baseConfig.MAX_SEARCH_DEPTH,
    MEMORY_PRESSURE_THRESHOLD: baseConfig.MEMORY_PRESSURE_THRESHOLD,
  };

  return adaptiveConfig;
}

// Get configuration at startup and periodically refresh
let FILE_CONFIG = getAdaptiveConfig();

// Refresh configuration every 30 seconds if memory pressure changes significantly
let lastMemoryCheck = Date.now();
const MEMORY_CHECK_INTERVAL = 30 * 1000; // 30 seconds

/**
 * Enhanced LRU cache with memory pressure awareness and adaptive cleanup
 */
export class AdaptiveFileCache {
  private cache = new Map<
    string,
    { content: string; timestamp: number; size: number; accessCount: number }
  >();
  private readonly maxSize: number;
  private readonly ttl: number;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private totalMemoryUsage = 0;

  constructor(maxSize: number = FILE_CONFIG.CACHE_SIZE, ttl: number = FILE_CONFIG.CACHE_TTL) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.startCleanupTimer();

    // Handle process exit gracefully
    process.on('exit', () => this.destroy());
    process.on('SIGINT', () => this.destroy());
    process.on('SIGTERM', () => this.destroy());
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 2 minutes and check memory pressure
    this.cleanupTimer = setInterval(
      () => {
        this.cleanupExpired();
        checkAndUpdateConfig();
      },
      2 * 60 * 1000
    );
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.delete(key);
    }
  }

  /**
   * Emergency cleanup under memory pressure - removes least recently used items
   */
  emergencyCleanup(): void {
    const targetSize = Math.floor(this.maxSize * 0.5); // Remove 50% of cache

    if (this.cache.size <= targetSize) return;

    // Sort by access count and timestamp (LRU with frequency consideration)
    const entries = Array.from(this.cache.entries()).sort(([, a], [, b]) => {
      const scoreA = a.accessCount * 0.7 + (Date.now() - a.timestamp) * 0.3;
      const scoreB = b.accessCount * 0.7 + (Date.now() - b.timestamp) * 0.3;
      return scoreA - scoreB; // Lower score = less valuable
    });

    // Remove least valuable entries
    const toRemove = entries.slice(0, this.cache.size - targetSize);
    for (const [key] of toRemove) {
      this.delete(key);
    }
  }

  get(filePath: string, fileSize: number, _lastModified: number): string | null {
    const cached = this.cache.get(filePath);
    if (!cached) return null;

    // Check if cache is expired, file was modified, or size changed
    const now = Date.now();
    if (now - cached.timestamp > this.ttl || cached.size !== fileSize) {
      this.delete(filePath);
      return null;
    }

    // Update access info (LRU + LFU hybrid)
    cached.timestamp = now;
    cached.accessCount++;

    // Move to end (LRU)
    this.cache.delete(filePath);
    this.cache.set(filePath, cached);

    return cached.content;
  }

  set(filePath: string, content: string, fileSize: number): void {
    const contentSize = Buffer.byteLength(content, 'utf8');

    // Check memory pressure before adding
    const memoryPressure = 1 - os.freemem() / os.totalmem();
    if (memoryPressure > FILE_CONFIG.MEMORY_PRESSURE_THRESHOLD) {
      this.emergencyCleanup();
    }

    // Remove oldest entries if cache is full
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.delete(firstKey);
      } else {
        break;
      }
    }

    // Don't cache extremely large files if under memory pressure
    if (contentSize > FILE_CONFIG.MAX_FILE_SIZE * 0.5 && memoryPressure > 0.6) {
      return;
    }

    const entry = {
      content,
      timestamp: Date.now(),
      size: fileSize,
      accessCount: 1,
    };

    this.cache.set(filePath, entry);
    this.totalMemoryUsage += contentSize;
  }

  clear(): void {
    this.cache.clear();
    this.totalMemoryUsage = 0;
  }

  delete(filePath: string): boolean {
    const cached = this.cache.get(filePath);
    if (cached) {
      this.totalMemoryUsage -= Buffer.byteLength(cached.content, 'utf8');
    }
    return this.cache.delete(filePath);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }

  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
    totalSystemMemory: number;
    freeSystemMemory: number;
    memoryPressure: number;
    config: AdaptiveFileConfig;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.totalMemoryUsage,
      totalSystemMemory: os.totalmem(),
      freeSystemMemory: os.freemem(),
      memoryPressure: 1 - os.freemem() / os.totalmem(),
      config: FILE_CONFIG,
    };
  }

  /**
   * Get cache efficiency metrics
   */
  getEfficiencyMetrics(): {
    hitRate: number;
    averageAccessCount: number;
    memoryEfficiency: number;
  } {
    let totalAccess = 0;
    let hitCount = 0;

    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      if (entry.accessCount > 1) hitCount++;
    }

    return {
      hitRate: this.cache.size > 0 ? hitCount / this.cache.size : 0,
      averageAccessCount: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      memoryEfficiency: this.totalMemoryUsage > 0 ? hitCount / this.totalMemoryUsage : 0,
    };
  }
}

function checkAndUpdateConfig(): void {
  const now = Date.now();
  if (now - lastMemoryCheck > MEMORY_CHECK_INTERVAL) {
    const currentConfig = getAdaptiveConfig();
    const memoryPressureChange = Math.abs(
      1 -
        os.freemem() / os.totalmem() -
        (1 - (os.totalmem() - FILE_CONFIG.MAX_FILE_SIZE) / os.totalmem())
    );

    // Update config if memory pressure changed significantly (>10%)
    if (memoryPressureChange > 0.1) {
      FILE_CONFIG = currentConfig;

      // Trigger cache cleanup if under memory pressure
      if (1 - os.freemem() / os.totalmem() > FILE_CONFIG.MEMORY_PRESSURE_THRESHOLD) {
        fileCache.emergencyCleanup();
      }
    }

    lastMemoryCheck = now;
  }
}

// Global adaptive cache instance
export const fileCache = new AdaptiveFileCache();

/**
 * Utility functions for cache management
 */
export const cacheUtils = {
  getStats: () => fileCache.getStats(),
  clearCache: () => fileCache.clear(),
  destroy: () => fileCache.destroy(),
  get config() {
    return FILE_CONFIG;
  },
};

/**
 * Export the current configuration
 */
export { FILE_CONFIG };

// Cleanup cache on process exit to prevent memory leaks
process.on('exit', () => {
  fileCache.destroy();
});

process.on('SIGINT', () => {
  fileCache.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  fileCache.destroy();
  process.exit(0);
});
