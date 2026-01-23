/**
 * WebSearchService.ts - Story 3.9: Web Search Action
 *
 * Provides Google Custom Search API integration for performing web searches.
 * Handles query sanitization, timeout, and retry logic with exponential backoff.
 *
 * AC1: Execute web search and return structured results
 * AC5: Retry with exponential backoff on 429 errors (3 attempts: 1s, 2s, 4s)
 * AC6: Handle 10-second timeout
 * AC7: Sanitize query with special characters
 */

import axios, { AxiosError } from 'axios';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface WebSearchResult {
  success: boolean;
  results: SearchResult[];
  error?: string;
  retryAttempts?: number;
  durationMs?: number;
}

export interface SearchOptions {
  maxResults?: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const GOOGLE_SEARCH_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';
const SEARCH_TIMEOUT_MS = 10000; // 10 seconds (AC6, NFR55)
const MAX_RESULTS = 5; // Top 3-5 results per AC1

// Retry configuration for rate limits (AC5)
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
};

// Maximum query length for safety
const MAX_QUERY_LENGTH = 256;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize search query for safe API call (AC7)
 * Removes special characters that could cause issues with the search API
 * Note: Forward slashes are preserved to allow URL searches
 */
export function sanitizeQuery(query: string): string {
  return query
    .replace(/["\\]/g, ' ')       // Remove double quotes and backslashes
    .replace(/'/g, '')            // Remove apostrophes without space (preserves "Corp's" -> "Corps")
    .replace(/\s+/g, ' ')         // Collapse multiple spaces
    .trim()
    .substring(0, MAX_QUERY_LENGTH);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// WEB SEARCH SERVICE
// =============================================================================

class WebSearchService {
  /**
   * Check if web search is properly configured
   */
  isConfigured(): boolean {
    return !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID);
  }

  /**
   * Execute web search using Google Custom Search API
   *
   * @param query - The search query to execute
   * @param options - Optional search options (maxResults)
   * @returns WebSearchResult with success status, results array, and metadata
   *
   * AC1: Returns top 3-5 results with title, snippet, url
   * AC5: Retries on 429 with exponential backoff (1s, 2s, 4s)
   * AC6: Times out after 10 seconds
   * AC7: Query is sanitized before making API call
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<WebSearchResult> {
    const startTime = Date.now();
    const maxResults = options.maxResults || MAX_RESULTS;

    // Validate environment configuration
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return {
        success: false,
        results: [],
        error: 'Web search not configured. Missing API key or search engine ID.',
        durationMs: Date.now() - startTime,
      };
    }

    // Sanitize query (AC7)
    const sanitizedQuery = sanitizeQuery(query);
    let lastError: Error | null = null;
    let delayMs = RETRY_CONFIG.initialDelayMs;

    // Retry loop with exponential backoff (AC5)
    for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await axios.get(GOOGLE_SEARCH_ENDPOINT, {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: sanitizedQuery,
            num: maxResults,
          },
          timeout: SEARCH_TIMEOUT_MS, // AC6: 10 second timeout
        });

        // Parse results - handle missing fields gracefully
        const items = response.data.items || [];
        const results: SearchResult[] = items.map((item: any) => ({
          title: item.title || '',
          snippet: item.snippet || '',
          url: item.link || '',
        }));

        return {
          success: true,
          results,
          retryAttempts: attempt - 1,
          durationMs: Date.now() - startTime,
        };

      } catch (error: any) {
        lastError = error;

        // Check for timeout (AC6)
        if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
          return {
            success: false,
            results: [],
            error: 'Web search timed out (exceeded 10 seconds)',
            durationMs: Date.now() - startTime,
          };
        }

        // Check for rate limit (429) - retry with backoff (AC5)
        if (error.response?.status === 429) {
          if (attempt < RETRY_CONFIG.maxRetries) {
            console.log(`Search API rate limit hit. Retry ${attempt}/${RETRY_CONFIG.maxRetries} after ${delayMs}ms`);
            await sleep(delayMs);
            delayMs *= RETRY_CONFIG.backoffMultiplier;
            continue;
          }
          // All retries exhausted for rate limit
          return {
            success: false,
            results: [],
            error: 'Web search unavailable (rate limit exceeded after retries)',
            retryAttempts: attempt,
            durationMs: Date.now() - startTime,
          };
        }

        // Other errors - don't retry
        const errorMessage = error.response?.data?.error?.message || error.message;
        return {
          success: false,
          results: [],
          error: errorMessage,
          retryAttempts: attempt - 1,
          durationMs: Date.now() - startTime,
        };
      }
    }

    // Should not reach here, but just in case
    return {
      success: false,
      results: [],
      error: lastError?.message || 'Web search failed',
      retryAttempts: RETRY_CONFIG.maxRetries,
      durationMs: Date.now() - startTime,
    };
  }
}

export default new WebSearchService();
