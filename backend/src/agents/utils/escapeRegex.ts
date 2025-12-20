/**
 * Utility to safely escape user input for use in RegExp
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 */

/**
 * Escape special regex characters in user input
 *
 * Escapes: . * + ? ^ $ { } ( ) | [ ] \
 *
 * @param string - User input string
 * @returns Escaped string safe for use in RegExp
 */
export function escapeRegex(string: string): string {
    if (!string || typeof string !== 'string') {
        return '';
    }

    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Create a safe case-insensitive regex from user input
 *
 * @param input - User input string
 * @returns RegExp object with escaped input
 */
export function createSafeRegex(input: string): RegExp {
    const escaped = escapeRegex(input);
    return new RegExp(escaped, 'i');
}
