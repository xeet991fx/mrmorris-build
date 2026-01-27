/**
 * Story 3.13 AC6: Redact Sensitive Data Utility
 * 
 * Redacts sensitive information from execution step results before logging.
 * - Truncates email body to 100 characters
 * - Redacts phone numbers
 * - Redacts SSNs
 * - Preserves structure for debugging while protecting PII
 */

// PII patterns for redaction
const PII_PATTERNS = {
    // International phone format (E.164 and common formats)
    phone: /(\+?[1-9]\d{0,2}[\s.-]?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/g,
    // US SSN format
    ssn: /\d{3}-\d{2}-\d{4}/g,
    // Credit card (basic pattern - 16 digits with separators)
    creditCard: /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
    // API keys (common patterns)
    apiKey: /(sk|pk|api[_-]?key|bearer)[_-]?[a-zA-Z0-9]{20,}/gi,
};

// Fields that should be fully redacted
const SENSITIVE_FIELDS = [
    'password',
    'secret',
    'token',
    'apiKey',
    'accessToken',
    'refreshToken',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cardNumber',
];

// Fields that should be truncated
const TRUNCATE_FIELDS: Record<string, number> = {
    emailBody: 100,
    body: 100,
    message: 200,
    content: 200,
    htmlBody: 100,
    textBody: 100,
};

/**
 * Redact sensitive data from a step result
 * @param stepResult - The step result object to redact
 * @returns Redacted copy of the step result
 */
export function redactSensitiveData(stepResult: Record<string, any>): Record<string, any> {
    if (!stepResult || typeof stepResult !== 'object') {
        return stepResult;
    }

    // Deep clone to avoid modifying original
    const redacted = JSON.parse(JSON.stringify(stepResult));

    // Recursively process the object
    return processObject(redacted);
}

/**
 * Recursively process an object to redact sensitive data
 */
function processObject(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
        return obj.map(item =>
            typeof item === 'object' ? processObject(item) : redactString(String(item))
        );
    }

    // Process each key
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        const lowerKey = key.toLowerCase();

        // Fully redact sensitive fields
        if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
            obj[key] = '[REDACTED]';
            continue;
        }

        // Truncate specified fields
        if (typeof value === 'string') {
            const truncateField = Object.keys(TRUNCATE_FIELDS).find(
                field => lowerKey.includes(field.toLowerCase())
            );
            if (truncateField) {
                const maxLength = TRUNCATE_FIELDS[truncateField];
                obj[key] = truncateString(value, maxLength);
                continue;
            }

            // Redact PII patterns in strings
            obj[key] = redactString(value);
        } else if (typeof value === 'object' && value !== null) {
            // Recursively process nested objects
            obj[key] = processObject(value);
        }
    }

    return obj;
}

/**
 * Redact PII patterns from a string
 */
function redactString(value: string): string {
    if (!value || typeof value !== 'string') {
        return value;
    }

    let redacted = value;

    // Redact phone numbers
    redacted = redacted.replace(PII_PATTERNS.phone, '[PHONE REDACTED]');

    // Redact SSNs
    redacted = redacted.replace(PII_PATTERNS.ssn, '[SSN REDACTED]');

    // Redact credit cards
    redacted = redacted.replace(PII_PATTERNS.creditCard, '[CARD REDACTED]');

    // Redact API keys
    redacted = redacted.replace(PII_PATTERNS.apiKey, '[API_KEY REDACTED]');

    return redacted;
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
function truncateString(value: string, maxLength: number): string {
    if (!value || value.length <= maxLength) {
        return value;
    }
    return value.substring(0, maxLength) + '...';
}

/**
 * Check if user has permission to see full (non-redacted) data
 * Owners and admins see full data, members see redacted
 */
export function canSeeFullData(userRole: string): boolean {
    const fullAccessRoles = ['owner', 'admin'];
    return fullAccessRoles.includes(userRole.toLowerCase());
}

/**
 * Conditionally redact data based on user role
 */
export function redactForUser(
    stepResult: Record<string, any>,
    userRole: string
): Record<string, any> {
    if (canSeeFullData(userRole)) {
        return stepResult; // Return original for owners/admins
    }
    return redactSensitiveData(stepResult);
}

export default redactSensitiveData;
