/**
 * Client-side Storage Module for NBA Props Analysis Platform
 * Provides localStorage fallback functionality for database failures
 */

export interface StorageItem<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Save data to localStorage with optional TTL
 */
export const saveToLocalCache = <T>(key: string, value: T, ttlMs?: number): void => {
  if (typeof window !== 'undefined') {
    try {
      const item: StorageItem<T> = {
        data: value,
        timestamp: Date.now(),
        ttl: ttlMs
      };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }
};

/**
 * Load data from localStorage with TTL validation
 */
export const loadFromLocalCache = <T>(key: string): T | null => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const item: StorageItem<T> = JSON.parse(stored);
      
      // Check if item has expired
      if (item.ttl && Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
      return null;
    }
  }
  return null;
};

/**
 * Remove item from localStorage
 */
export const removeFromLocalCache = (key: string): void => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }
};

/**
 * Clear all cached data (with optional prefix filter)
 */
export const clearLocalCache = (prefix?: string): void => {
  if (typeof window !== 'undefined') {
    try {
      if (prefix) {
        const keys = Object.keys(localStorage).filter(key => key.startsWith(prefix));
        keys.forEach(key => localStorage.removeItem(key));
      } else {
        localStorage.clear();
      }
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, 'test');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get localStorage usage info
 */
export const getStorageInfo = (): { used: number; available: number } => {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0 };
  }

  let used = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // Most browsers have 5-10MB limit, we'll assume 5MB
  const available = 5 * 1024 * 1024 - used;
  return { used, available };
};

// Cache key constants for consistency
export const CACHE_KEYS = {
  PLAYERS: 'nba_players',
  PLAYER_STATS: 'nba_player_stats',
  TEAMS: 'nba_teams',
  PROP_ANALYSIS: 'nba_prop_analysis',
  ROLLING_SPLITS: 'nba_rolling_splits',
  RECENT_SEARCHES: 'nba_recent_searches',
  FILTER_HISTORY: 'nba_filter_history',
  GAME_STATS: 'nba_game_stats',
  SEASON_AVERAGES: 'nba_season_averages',
  ADMIN: 'nba_admin',
  ADVANCED_ANALYTICS: 'nba_advanced_analytics'
} as const;

// TTL constants (in milliseconds)
export const CACHE_TTL = {
  VERY_SHORT: 1 * 60 * 1000,      // 1 minute
  SHORT: 5 * 60 * 1000,           // 5 minutes
  MEDIUM: 15 * 60 * 1000,         // 15 minutes
  LONG: 60 * 60 * 1000,           // 1 hour
  VERY_LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;