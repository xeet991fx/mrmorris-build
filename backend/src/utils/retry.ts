/**
 * Retry Utility with Exponential Backoff
 * Story 5.2 - Automatic Token Refresh
 *
 * Provides retry logic with exponential backoff for network operations
 * NFR51: Exponential backoff pattern (1s, 2s, 4s)
 */

/**
 * Sleep for a given number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if an error is an authentication/authorization error
 * Auth errors should NOT be retried as they are permanent failures
 */
export const isAuthError = (error: any): boolean => {
    // HTTP 401 Unauthorized
    if (error.response?.status === 401) {
        return true;
    }

    // Google OAuth invalid_grant error (refresh token revoked/expired)
    if (error.code === 'invalid_grant') {
        return true;
    }

    // Error message contains auth-related keywords
    if (error.message?.includes('invalid_grant') ||
        error.message?.includes('Token has been revoked') ||
        error.message?.includes('Token has been expired')) {
        return true;
    }

    return false;
};

/**
 * Check if an error is a network error (retryable)
 */
export const isNetworkError = (error: any): boolean => {
    // Common network error codes
    const networkErrorCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ENETUNREACH'];

    if (error.code && networkErrorCodes.includes(error.code)) {
        return true;
    }

    // HTTP 5xx server errors are retryable
    if (error.response?.status >= 500 && error.response?.status < 600) {
        return true;
    }

    // HTTP 429 Too Many Requests (rate limiting)
    if (error.response?.status === 429) {
        return true;
    }

    return false;
};

/**
 * Options for retry logic
 */
export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: any) => boolean;
    onRetry?: (attempt: number, error: any, delayMs: number) => void;
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Last error if all attempts fail
 *
 * @example
 * const result = await withRetry(
 *   () => fetchData(),
 *   { maxAttempts: 3, baseDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        baseDelayMs = 1000,
        maxDelayMs = 10000,
        shouldRetry = (error) => !isAuthError(error) && isNetworkError(error),
        onRetry = (attempt, error, delayMs) => {
            console.warn(`Retry ${attempt}/${maxAttempts} after ${delayMs}ms: ${error.message}`);
        },
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Auth errors are permanent - don't retry
            if (isAuthError(error)) {
                throw error;
            }

            // Last attempt - throw error
            if (attempt === maxAttempts) {
                throw error;
            }

            // Check if error is retryable
            if (!shouldRetry(error)) {
                throw error;
            }

            // Calculate delay with exponential backoff: baseDelay * 2^(attempt-1)
            // Attempts 1, 2, 3 → delays 1s, 2s, 4s
            const delayMs = Math.min(
                baseDelayMs * Math.pow(2, attempt - 1),
                maxDelayMs
            );

            onRetry(attempt, error, delayMs);

            await sleep(delayMs);
        }
    }

    throw lastError!;
}

export default withRetry;
