/**
 * testModeCache.ts - Story 2.6: Caching utilities for Test Mode performance
 *
 * Provides Redis-based caching for:
 * - AC6: Instruction parsing results (15-minute TTL)
 * - AC5: Web search results (15-minute TTL)
 */

import crypto from 'crypto';
import { getRedisClient } from '../config/redis';

// =============================================================================
// CACHE CONSTANTS
// =============================================================================

const INSTRUCTION_CACHE_TTL = 900;      // 15 minutes in seconds (AC6)
const WEB_SEARCH_CACHE_TTL = 900;       // 15 minutes in seconds (AC5)
const CACHE_PREFIX = 'testmode';

// =============================================================================
// CACHE KEY GENERATION
// =============================================================================

/**
 * Generate a cache key from content using SHA256 hash.
 * @param type - Cache type ('instruction' | 'websearch')
 * @param content - Content to hash for key
 * @returns Cache key string
 */
export function getCacheKey(type: 'instruction' | 'websearch', content: string): string {
  const normalizedContent = content.toLowerCase().trim();
  const hash = crypto.createHash('sha256').update(normalizedContent).digest('hex');
  return `${CACHE_PREFIX}:${type}:${hash}`;
}

// =============================================================================
// INSTRUCTION PARSING CACHE (AC6)
// =============================================================================

export interface ParsedActionCache {
  type: string;
  params?: Record<string, any>;
  condition?: string;
  trueBranch?: ParsedActionCache[];
  falseBranch?: ParsedActionCache[];
  lineNumber?: number;
  rawInstruction?: string;
  [key: string]: any;
}

/**
 * Get cached parsed instructions.
 * @param instructions - Raw instruction text
 * @returns Cached parsed actions or null if not found/Redis unavailable
 */
export async function getCachedInstructions(instructions: string): Promise<ParsedActionCache[] | null> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey('instruction', instructions);
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    // Redis unavailable - gracefully continue without cache
    console.debug('Redis cache miss (unavailable):', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Store parsed instructions in cache.
 * @param instructions - Raw instruction text
 * @param parsed - Parsed action objects
 */
export async function setCachedInstructions(instructions: string, parsed: ParsedActionCache[]): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey('instruction', instructions);
    await redis.setex(key, INSTRUCTION_CACHE_TTL, JSON.stringify(parsed));
  } catch (error) {
    // Redis unavailable - gracefully continue without caching
    console.debug('Redis cache set failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// WEB SEARCH RESULT CACHE (AC5)
// =============================================================================

export interface WebSearchResultCache {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  cachedAt: string;         // ISO timestamp when cached
  source: string;           // Search provider used
}

/**
 * Get cached web search results.
 * @param query - Search query string
 * @returns Cached search results or null if not found/Redis unavailable
 */
export async function getCachedWebSearch(query: string): Promise<WebSearchResultCache | null> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey('websearch', query);
    const cached = await redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  } catch (error) {
    // Redis unavailable - gracefully continue without cache
    console.debug('Redis cache miss (unavailable):', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Store web search results in cache.
 * @param query - Search query string
 * @param result - Search result object to cache
 */
export async function setCachedWebSearch(query: string, result: Omit<WebSearchResultCache, 'cachedAt'>): Promise<void> {
  try {
    const redis = getRedisClient();
    const key = getCacheKey('websearch', query);
    const cacheEntry: WebSearchResultCache = {
      ...result,
      cachedAt: new Date().toISOString(),
    };
    await redis.setex(key, WEB_SEARCH_CACHE_TTL, JSON.stringify(cacheEntry));
  } catch (error) {
    // Redis unavailable - gracefully continue without caching
    console.debug('Redis cache set failed:', error instanceof Error ? error.message : 'Unknown error');
  }
}

// =============================================================================
// CACHE METRICS (for monitoring)
// =============================================================================

export interface CacheMetrics {
  instructionCacheHits: number;
  instructionCacheMisses: number;
  webSearchCacheHits: number;
  webSearchCacheMisses: number;
}

// In-memory metrics (reset on server restart)
const metrics: CacheMetrics = {
  instructionCacheHits: 0,
  instructionCacheMisses: 0,
  webSearchCacheHits: 0,
  webSearchCacheMisses: 0,
};

/**
 * Record a cache hit for metrics.
 */
export function recordCacheHit(type: 'instruction' | 'websearch'): void {
  if (type === 'instruction') {
    metrics.instructionCacheHits++;
  } else {
    metrics.webSearchCacheHits++;
  }
}

/**
 * Record a cache miss for metrics.
 */
export function recordCacheMiss(type: 'instruction' | 'websearch'): void {
  if (type === 'instruction') {
    metrics.instructionCacheMisses++;
  } else {
    metrics.webSearchCacheMisses++;
  }
}

/**
 * Get current cache metrics.
 */
export function getCacheMetrics(): CacheMetrics {
  return { ...metrics };
}

/**
 * Calculate cache hit rate for a given type.
 */
export function getCacheHitRate(type: 'instruction' | 'websearch'): number {
  const hits = type === 'instruction' ? metrics.instructionCacheHits : metrics.webSearchCacheHits;
  const misses = type === 'instruction' ? metrics.instructionCacheMisses : metrics.webSearchCacheMisses;
  const total = hits + misses;
  return total > 0 ? (hits / total) * 100 : 0;
}

export default {
  getCacheKey,
  getCachedInstructions,
  setCachedInstructions,
  getCachedWebSearch,
  setCachedWebSearch,
  recordCacheHit,
  recordCacheMiss,
  getCacheMetrics,
  getCacheHitRate,
};
