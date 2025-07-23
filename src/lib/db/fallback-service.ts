/**
 * Database Fallback Service for NBA Props Analysis Platform
 * Provides automatic fallback to localStorage when database operations fail
 */

import { db } from './index';
import { saveToLocalCache, loadFromLocalCache, CACHE_KEYS, CACHE_TTL } from '../storage';

export interface FallbackState {
  isFallbackMode: boolean;
  lastDbError: string | null;
  lastDbErrorTime: number | null;
  retryCount: number;
}

class DatabaseFallbackService {
  private static instance: DatabaseFallbackService;
  private fallbackState: FallbackState = {
    isFallbackMode: false,
    lastDbError: null,
    lastDbErrorTime: null,
    retryCount: 0
  };

  private constructor() {}

  static getInstance(): DatabaseFallbackService {
    if (!DatabaseFallbackService.instance) {
      DatabaseFallbackService.instance = new DatabaseFallbackService();
    }
    return DatabaseFallbackService.instance;
  }

  /**
   * Get current fallback state
   */
  getFallbackState(): FallbackState {
    return { ...this.fallbackState };
  }

  /**
   * Reset fallback state (when database is working again)
   */
  resetFallbackState(): void {
    this.fallbackState = {
      isFallbackMode: false,
      lastDbError: null,
      lastDbErrorTime: null,
      retryCount: 0
    };
  }

  /**
   * Execute database operation with automatic fallback to localStorage
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    fallbackData?: T,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    try {
      // Try database operation
      const result = await operation();
      
      // If successful, cache the result and reset fallback state
      saveToLocalCache(cacheKey, result, ttl);
      
      if (this.fallbackState.isFallbackMode) {
        console.log('✅ Database connection restored');
        this.resetFallbackState();
      }
      
      return result;
    } catch (error) {
      console.error('🚨 Database Error:', error);
      
      // Update fallback state
      this.fallbackState.isFallbackMode = true;
      this.fallbackState.lastDbError = error instanceof Error ? error.message : 'Unknown database error';
      this.fallbackState.lastDbErrorTime = Date.now();
      this.fallbackState.retryCount++;
      
      console.warn('Using localStorage fallback');
      
      // Try to load from localStorage cache
      const cachedData = loadFromLocalCache<T>(cacheKey);
      if (cachedData !== null) {
        console.log(`📦 Loaded cached data for key: ${cacheKey}`);
        return cachedData;
      }
      
      // If no cached data and fallback data provided, return it
      if (fallbackData !== undefined) {
        console.log(`🔄 Using provided fallback data for key: ${cacheKey}`);
        return fallbackData;
      }
      
      // If no cached data and no fallback, re-throw the error
      throw error;
    }
  }

  /**
   * Execute read-only database operation with fallback
   */
  async safeRead<T>(
    operation: () => Promise<T>,
    cacheKey: string,
    defaultValue: T,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    try {
      return await this.executeWithFallback(operation, cacheKey, defaultValue, ttl);
    } catch (error) {
      console.warn(`Failed to execute read operation for ${cacheKey}, returning default value`);
      return defaultValue;
    }
  }

  /**
   * Execute write operation (no fallback, but with error handling)
   */
  async safeWrite<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Write operation failed'
  ): Promise<T | null> {
    try {
      const result = await operation();
      
      if (this.fallbackState.isFallbackMode) {
        console.log('✅ Database connection restored during write operation');
        this.resetFallbackState();
      }
      
      return result;
    } catch (error) {
      console.error(`🚨 ${errorMessage}:`, error);
      
      this.fallbackState.isFallbackMode = true;
      this.fallbackState.lastDbError = error instanceof Error ? error.message : errorMessage;
      this.fallbackState.lastDbErrorTime = Date.now();
      this.fallbackState.retryCount++;
      
      return null;
    }
  }

  /**
   * Check if we should retry database connection
   */
  shouldRetryConnection(): boolean {
    if (!this.fallbackState.isFallbackMode) return false;
    if (!this.fallbackState.lastDbErrorTime) return true;
    
    // Retry every 30 seconds, with exponential backoff up to 5 minutes
    const timeSinceError = Date.now() - this.fallbackState.lastDbErrorTime;
    const backoffTime = Math.min(30000 * Math.pow(2, this.fallbackState.retryCount - 1), 300000);
    
    return timeSinceError > backoffTime;
  }

  /**
   * Force retry database connection
   */
  async forceRetryConnection(): Promise<boolean> {
    try {
      // Simple test query
      await db.execute('SELECT 1');
      this.resetFallbackState();
      console.log('✅ Database connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dbFallbackService = DatabaseFallbackService.getInstance();

// Helper functions for common operations
export const withDbFallback = <T>(
  operation: () => Promise<T>,
  cacheKey: string,
  defaultValue: T,
  ttl?: number
) => dbFallbackService.safeRead(operation, cacheKey, defaultValue, ttl);

export const withDbWrite = <T>(
  operation: () => Promise<T>,
  errorMessage?: string
) => dbFallbackService.safeWrite(operation, errorMessage);