/**
 * WebSearchService Tests - Story 3.9: Web Search Action
 *
 * Tests for Google Custom Search API integration:
 * - AC1: Variable resolution in search query (tested in ActionExecutorService)
 * - AC5: Retry with exponential backoff on 429 errors
 * - AC6: Handle 10-second timeout
 * - AC7: Sanitize query with special characters
 */

import WebSearchService, { sanitizeQuery, SearchResult, WebSearchResult } from './WebSearchService';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('WebSearchService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up test environment variables
    process.env = {
      ...originalEnv,
      GOOGLE_SEARCH_API_KEY: 'test-api-key',
      GOOGLE_SEARCH_ENGINE_ID: 'test-engine-id',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ==========================================================================
  // sanitizeQuery Tests (AC7)
  // ==========================================================================

  describe('sanitizeQuery', () => {
    it('should remove single quotes without adding space', () => {
      expect(sanitizeQuery("Acme Corp's CEO")).toBe('Acme Corps CEO');
    });

    it('should remove double quotes with space', () => {
      expect(sanitizeQuery('"Quoted Text"')).toBe('Quoted Text');
    });

    it('should remove backslashes', () => {
      expect(sanitizeQuery('C:\\path\\to\\file')).toBe('C: path to file');
    });

    it('should preserve forward slashes for URLs', () => {
      expect(sanitizeQuery('news about https://acme.com')).toBe('news about https://acme.com');
    });

    it('should collapse multiple spaces', () => {
      expect(sanitizeQuery('too   many    spaces')).toBe('too many spaces');
    });

    it('should trim whitespace', () => {
      expect(sanitizeQuery('  trimmed query  ')).toBe('trimmed query');
    });

    it('should limit query to 256 characters', () => {
      const longQuery = 'a'.repeat(300);
      const result = sanitizeQuery(longQuery);
      expect(result.length).toBe(256);
    });

    it('should handle empty string', () => {
      expect(sanitizeQuery('')).toBe('');
    });

    it('should preserve normal alphanumeric characters', () => {
      expect(sanitizeQuery('Acme Corp funding news 2026')).toBe('Acme Corp funding news 2026');
    });
  });

  // ==========================================================================
  // search Tests (AC1, AC5, AC6)
  // ==========================================================================

  describe('search', () => {
    const mockSearchResponse = {
      data: {
        items: [
          { title: 'Result 1', snippet: 'Snippet 1', link: 'https://example.com/1' },
          { title: 'Result 2', snippet: 'Snippet 2', link: 'https://example.com/2' },
          { title: 'Result 3', snippet: 'Snippet 3', link: 'https://example.com/3' },
        ],
      },
    };

    it('should return search results successfully (AC1)', async () => {
      mockAxios.get.mockResolvedValue(mockSearchResponse);

      const result = await WebSearchService.search('Acme Corp news');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({
        title: 'Result 1',
        snippet: 'Snippet 1',
        url: 'https://example.com/1',
      });
      expect(result.retryAttempts).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should call Google Custom Search API with correct parameters', async () => {
      mockAxios.get.mockResolvedValue(mockSearchResponse);

      await WebSearchService.search('test query');

      expect(mockAxios.get).toHaveBeenCalledWith(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: 'test-api-key',
            cx: 'test-engine-id',
            q: 'test query',
            num: 5,
          },
          timeout: 10000,
        }
      );
    });

    it('should sanitize query before making API call (AC7)', async () => {
      mockAxios.get.mockResolvedValue(mockSearchResponse);

      await WebSearchService.search("Acme's \"special\" query\\test");

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Acmes special query test', // apostrophe removed without space, quotes/backslash replaced with space
          }),
        })
      );
    });

    it('should return empty results array when no items returned', async () => {
      mockAxios.get.mockResolvedValue({ data: {} });

      const result = await WebSearchService.search('obscure query');

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });

    it('should handle missing fields in search results gracefully', async () => {
      mockAxios.get.mockResolvedValue({
        data: {
          items: [
            { title: 'Only Title' },
            { snippet: 'Only Snippet', link: 'https://link.com' },
            {},
          ],
        },
      });

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({ title: 'Only Title', snippet: '', url: '' });
      expect(result.results[1]).toEqual({ title: '', snippet: 'Only Snippet', url: 'https://link.com' });
      expect(result.results[2]).toEqual({ title: '', snippet: '', url: '' });
    });

    // API Configuration Tests
    it('should return error when API key is missing', async () => {
      delete process.env.GOOGLE_SEARCH_API_KEY;

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Web search not configured');
      expect(result.error).toContain('Missing API key or search engine ID');
      expect(result.results).toEqual([]);
    });

    it('should return error when search engine ID is missing', async () => {
      delete process.env.GOOGLE_SEARCH_ENGINE_ID;

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Web search not configured');
    });

    // Timeout Tests (AC6)
    it('should return timeout error when search exceeds 10 seconds (AC6)', async () => {
      mockAxios.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded',
      });

      const result = await WebSearchService.search('slow query');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Web search timed out (exceeded 10 seconds)');
      expect(result.results).toEqual([]);
      expect(mockAxios.get).toHaveBeenCalledTimes(1); // No retry on timeout
    });

    it('should return timeout error for timeout message without code', async () => {
      mockAxios.get.mockRejectedValue({
        message: 'Request timeout occurred',
      });

      const result = await WebSearchService.search('slow query');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Web search timed out (exceeded 10 seconds)');
    });

    // Rate Limit Tests (AC5)
    it('should retry on 429 rate limit error with exponential backoff (AC5)', async () => {
      // First two calls fail with 429, third succeeds
      mockAxios.get
        .mockRejectedValueOnce({ response: { status: 429 }, isAxiosError: true })
        .mockRejectedValueOnce({ response: { status: 429 }, isAxiosError: true })
        .mockResolvedValueOnce(mockSearchResponse);

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(true);
      expect(result.retryAttempts).toBe(2);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    it('should return error after all retries exhausted on 429 (AC5)', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 429 },
        isAxiosError: true,
      });

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Web search unavailable (rate limit exceeded after retries)');
      expect(result.retryAttempts).toBe(3);
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });

    // Other Error Tests
    it('should not retry on non-429 errors', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 400, data: { error: { message: 'Bad Request' } } },
        isAxiosError: true,
      });

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Bad Request');
      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle 403 forbidden error', async () => {
      mockAxios.get.mockRejectedValue({
        response: { status: 403, data: { error: { message: 'API key invalid' } } },
        isAxiosError: true,
      });

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key invalid');
    });

    it('should handle network error without response', async () => {
      mockAxios.get.mockRejectedValue({
        message: 'Network Error',
        isAxiosError: true,
      });

      const result = await WebSearchService.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network Error');
    });

    // maxResults option
    it('should respect maxResults option', async () => {
      mockAxios.get.mockResolvedValue(mockSearchResponse);

      await WebSearchService.search('test', { maxResults: 3 });

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            num: 3,
          }),
        })
      );
    });

    it('should default to 5 results when maxResults not specified', async () => {
      mockAxios.get.mockResolvedValue(mockSearchResponse);

      await WebSearchService.search('test');

      expect(mockAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            num: 5,
          }),
        })
      );
    });
  });

  // ==========================================================================
  // isConfigured Tests
  // ==========================================================================

  describe('isConfigured', () => {
    it('should return true when both env vars are set', () => {
      expect(WebSearchService.isConfigured()).toBe(true);
    });

    it('should return false when API key is missing', () => {
      delete process.env.GOOGLE_SEARCH_API_KEY;
      expect(WebSearchService.isConfigured()).toBe(false);
    });

    it('should return false when search engine ID is missing', () => {
      delete process.env.GOOGLE_SEARCH_ENGINE_ID;
      expect(WebSearchService.isConfigured()).toBe(false);
    });
  });
});
