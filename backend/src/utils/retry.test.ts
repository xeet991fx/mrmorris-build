/**
 * Retry Utility Tests
 * Story 5.2 - Automatic Token Refresh
 *
 * Tests for exponential backoff retry functionality
 */

import { withRetry, isAuthError, isNetworkError, sleep } from './retry';

describe('Retry Utility', () => {
    // ==========================================================================
    // AC5: Retry Logic for Network Failures (10.3)
    // ==========================================================================

    describe('withRetry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should return result on first successful call', async () => {
            const fn = jest.fn().mockResolvedValue('success');

            const resultPromise = withRetry(fn);
            jest.runAllTimers();
            const result = await resultPromise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should retry on network error with exponential backoff', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockRejectedValueOnce({ code: 'ETIMEDOUT' })
                .mockResolvedValue('success');

            const resultPromise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000 });

            // First call fails immediately
            await Promise.resolve();
            jest.advanceTimersByTime(1000); // First retry delay
            await Promise.resolve();
            jest.advanceTimersByTime(2000); // Second retry delay
            await Promise.resolve();

            const result = await resultPromise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should NOT retry on auth errors (permanent failure)', async () => {
            const authError = { response: { status: 401 } };
            const fn = jest.fn().mockRejectedValue(authError);

            await expect(withRetry(fn)).rejects.toMatchObject({ response: { status: 401 } });
            expect(fn).toHaveBeenCalledTimes(1); // No retries
        });

        it('should NOT retry on invalid_grant error', async () => {
            const invalidGrantError = { code: 'invalid_grant', message: 'Token revoked' };
            const fn = jest.fn().mockRejectedValue(invalidGrantError);

            await expect(withRetry(fn)).rejects.toMatchObject({ code: 'invalid_grant' });
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('should throw after max attempts exhausted', async () => {
            const networkError = { code: 'ECONNREFUSED' };
            const fn = jest.fn().mockRejectedValue(networkError);

            const resultPromise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 });

            // Advance through all retries
            for (let i = 0; i < 3; i++) {
                await Promise.resolve();
                jest.advanceTimersByTime(500);
            }

            await expect(resultPromise).rejects.toMatchObject({ code: 'ECONNREFUSED' });
            expect(fn).toHaveBeenCalledTimes(3);
        });

        it('should respect maxDelayMs cap', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            const resultPromise = withRetry(fn, {
                maxAttempts: 5,
                baseDelayMs: 1000,
                maxDelayMs: 5000,
                onRetry,
            });

            // Process all retries
            for (let i = 0; i < 5; i++) {
                await Promise.resolve();
                jest.advanceTimersByTime(6000);
            }

            await resultPromise;

            // Check delays are capped: 1000, 2000, 4000, 5000 (capped)
            expect(onRetry).toHaveBeenCalledWith(1, expect.anything(), 1000);
            expect(onRetry).toHaveBeenCalledWith(2, expect.anything(), 2000);
            expect(onRetry).toHaveBeenCalledWith(3, expect.anything(), 4000);
            expect(onRetry).toHaveBeenCalledWith(4, expect.anything(), 5000);
        });

        it('should call onRetry callback for each retry', async () => {
            const fn = jest.fn()
                .mockRejectedValueOnce({ code: 'ECONNREFUSED' })
                .mockResolvedValue('success');

            const onRetry = jest.fn();

            const resultPromise = withRetry(fn, { maxAttempts: 3, baseDelayMs: 1000, onRetry });

            await Promise.resolve();
            jest.advanceTimersByTime(1000);

            await resultPromise;

            expect(onRetry).toHaveBeenCalledTimes(1);
            expect(onRetry).toHaveBeenCalledWith(1, expect.anything(), 1000);
        });

        it('should retry on 5xx server errors', async () => {
            const serverError = { response: { status: 503 } };
            const fn = jest.fn()
                .mockRejectedValueOnce(serverError)
                .mockResolvedValue('success');

            const resultPromise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 100 });

            await Promise.resolve();
            jest.advanceTimersByTime(100);

            const result = await resultPromise;

            expect(result).toBe('success');
            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('should retry on 429 rate limit errors', async () => {
            const rateLimitError = { response: { status: 429 } };
            const fn = jest.fn()
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValue('success');

            const resultPromise = withRetry(fn, { maxAttempts: 2, baseDelayMs: 100 });

            await Promise.resolve();
            jest.advanceTimersByTime(100);

            const result = await resultPromise;

            expect(result).toBe('success');
        });
    });

    describe('isAuthError', () => {
        it('should return true for 401 responses', () => {
            expect(isAuthError({ response: { status: 401 } })).toBe(true);
        });

        it('should return true for invalid_grant code', () => {
            expect(isAuthError({ code: 'invalid_grant' })).toBe(true);
        });

        it('should return true for invalid_grant in message', () => {
            expect(isAuthError({ message: 'Error: invalid_grant' })).toBe(true);
        });

        it('should return true for revoked token message', () => {
            expect(isAuthError({ message: 'Token has been revoked' })).toBe(true);
        });

        it('should return false for network errors', () => {
            expect(isAuthError({ code: 'ECONNREFUSED' })).toBe(false);
            expect(isAuthError({ response: { status: 500 } })).toBe(false);
        });
    });

    describe('isNetworkError', () => {
        it('should return true for ECONNREFUSED', () => {
            expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
        });

        it('should return true for ETIMEDOUT', () => {
            expect(isNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
        });

        it('should return true for ECONNRESET', () => {
            expect(isNetworkError({ code: 'ECONNRESET' })).toBe(true);
        });

        it('should return true for 5xx status codes', () => {
            expect(isNetworkError({ response: { status: 500 } })).toBe(true);
            expect(isNetworkError({ response: { status: 502 } })).toBe(true);
            expect(isNetworkError({ response: { status: 503 } })).toBe(true);
        });

        it('should return true for 429 rate limit', () => {
            expect(isNetworkError({ response: { status: 429 } })).toBe(true);
        });

        it('should return false for 4xx client errors (except 429)', () => {
            expect(isNetworkError({ response: { status: 400 } })).toBe(false);
            expect(isNetworkError({ response: { status: 401 } })).toBe(false);
            expect(isNetworkError({ response: { status: 404 } })).toBe(false);
        });
    });

    describe('sleep', () => {
        it('should resolve after specified time', async () => {
            jest.useFakeTimers();

            const promise = sleep(1000);
            jest.advanceTimersByTime(1000);

            await expect(promise).resolves.toBeUndefined();

            jest.useRealTimers();
        });
    });
});
