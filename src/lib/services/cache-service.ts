/**
 * Cache Service for NBA Props Analysis Platform
 * Provides in-memory caching with TTL support
 * Can be extended to use Redis in production
 */

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheItem<any>>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.size--;
      return null;
    }

    this.stats.hits++;
    return item.data;
  }

  /**
   * Set item in cache with TTL
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    };

    const wasPresent = this.cache.has(key);
    this.cache.set(key, item);
    
    this.stats.sets++;
    if (!wasPresent) {
      this.stats.size++;
    }
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size--;
    }
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size -= cleaned;
      console.log(`Cache cleanup: removed ${cleaned} expired items`);
    }
  }

  /**
   * Get or set pattern - fetch data if not in cache
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Generate cache key for player stats
   */
  static generatePlayerStatsKey(
    playerId: number,
    filters?: any
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : 'no-filters';
    return `player-stats:${playerId}:${filterStr}`;
  }

  /**
   * Generate cache key for prop analysis
   */
  static generatePropAnalysisKey(
    playerId: number,
    propType: string,
    propLine: number,
    filters?: any
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : 'no-filters';
    return `prop-analysis:${playerId}:${propType}:${propLine}:${filterStr}`;
  }

  /**
   * Generate cache key for rolling splits
   */
  static generateRollingSplitsKey(
    playerId: number,
    period: number
  ): string {
    return `rolling-splits:${playerId}:${period}`;
  }

  /**
   * Generate cache key for teams
   */
  static generateTeamsKey(filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `teams:${filterStr}`;
  }

  /**
   * Generate cache key for players
   */
  static generatePlayersKey(filters?: any): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `players:${filterStr}`;
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): number {
    let invalidated = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    this.stats.size -= invalidated;
    return invalidated;
  }

  /**
   * Invalidate player-related cache
   */
  invalidatePlayerCache(playerId: number): number {
    return this.invalidatePattern(`*:${playerId}:*`);
  }

  /**
   * Destroy cache service (cleanup)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance
export const cacheService = CacheService.getInstance();

// Cache TTL constants
export const CACHE_TTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute
  SHORT: 5 * 60 * 1000,           // 5 minutes
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;