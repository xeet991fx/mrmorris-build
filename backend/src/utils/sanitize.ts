/**
 * Sanitization Utilities
 *
 * Provides functions to sanitize user input and prevent injection attacks.
 */

/**
 * Escape special regex characters in a string
 * Prevents ReDoS attacks and unexpected regex behavior
 *
 * @param str - String to escape
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a safe regex pattern for search queries
 * Escapes special characters and returns a case-insensitive pattern
 *
 * @param query - Search query string
 * @returns Safe regex pattern for MongoDB queries
 */
export function createSearchRegex(query: string): RegExp {
    const escaped = escapeRegex(query.trim());
    return new RegExp(escaped, 'i');
}

/**
 * Create MongoDB-safe search filter for text fields
 * Returns a filter object that can be spread into a MongoDB query
 *
 * @param query - Search query string
 * @param fields - Array of field names to search
 * @returns MongoDB $or filter object
 */
export function createMongoSearchFilter(query: string, fields: string[]): { $or: Array<Record<string, any>> } {
    const safePattern = escapeRegex(query.trim());

    return {
        $or: fields.map(field => ({
            [field]: { $regex: safePattern, $options: 'i' }
        }))
    };
}

/**
 * Sanitize string input to prevent NoSQL injection
 * Removes MongoDB operators like $gt, $lt, etc.
 *
 * @param input - Input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: any): any {
    if (typeof input === 'string') {
        return input;
    }

    if (typeof input === 'object' && input !== null) {
        // Check for MongoDB operators
        const keys = Object.keys(input);
        for (const key of keys) {
            if (key.startsWith('$')) {
                throw new Error('Invalid input: MongoDB operators not allowed');
            }
        }
    }

    return input;
}
