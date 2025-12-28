/**
 * Expression Evaluator
 *
 * Evaluates expressions with pipe-based filters for workflow data transformation.
 * Syntax: {{fieldName | filter1 | filter2(arg)}}
 *
 * Example: {{contact.firstName | uppercase | default("Unknown")}}
 */

const MAX_PIPES = 10;
const EVALUATION_TIMEOUT = 100; // milliseconds

// ============================================
// FILTER FUNCTIONS
// ============================================

const filters: Record<string, (value: any, ...args: any[]) => any> = {
    // Text filters
    uppercase: (value: any) => String(value || '').toUpperCase(),
    lowercase: (value: any) => String(value || '').toLowerCase(),
    trim: (value: any) => String(value || '').trim(),
    split: (value: any, delimiter: string = ',') => String(value || '').split(delimiter),
    join: (value: any[], delimiter: string = ', ') => Array.isArray(value) ? value.join(delimiter) : String(value),

    // Default value
    default: (value: any, defaultValue: any = '') => (value === null || value === undefined || value === '') ? defaultValue : value,

    // Array filters
    length: (value: any) => Array.isArray(value) ? value.length : String(value || '').length,
    first: (value: any[]) => Array.isArray(value) ? value[0] : value,
    last: (value: any[]) => Array.isArray(value) ? value[value.length - 1] : value,

    // Math filters
    add: (value: any, amount: number = 0) => Number(value || 0) + amount,
    subtract: (value: any, amount: number = 0) => Number(value || 0) - amount,
    multiply: (value: any, factor: number = 1) => Number(value || 0) * factor,
    divide: (value: any, divisor: number = 1) => divisor !== 0 ? Number(value || 0) / divisor : 0,
    round: (value: any, decimals: number = 0) => {
        const num = Number(value || 0);
        const factor = Math.pow(10, decimals);
        return Math.round(num * factor) / factor;
    },

    // Date filters (basic)
    dateFormat: (value: any, format: string = 'YYYY-MM-DD') => {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return format
            .replace('YYYY', String(year))
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes);
    },

    // String manipulation
    replace: (value: any, search: string, replacement: string = '') => {
        return String(value || '').replace(new RegExp(search, 'g'), replacement);
    },
    substring: (value: any, start: number = 0, end?: number) => {
        return String(value || '').substring(start, end);
    },
    capitalize: (value: any) => {
        const str = String(value || '');
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    },

    // Type conversion
    toString: (value: any) => String(value),
    toNumber: (value: any) => Number(value) || 0,
    toBoolean: (value: any) => Boolean(value),
    toJSON: (value: any) => JSON.stringify(value),
};

// ============================================
// EXPRESSION PARSING
// ============================================

/**
 * Parse expression into field path and filters
 *
 * Example: "contact.firstName | uppercase | trim"
 * Returns: { field: "contact.firstName", filters: ["uppercase", "trim"] }
 */
function parseExpression(expression: string): { field: string; filters: Array<{ name: string; args: any[] }> } {
    const parts = expression.split('|').map(p => p.trim());
    const field = parts[0];
    const filterParts = parts.slice(1);

    if (filterParts.length > MAX_PIPES) {
        throw new Error(`Expression has too many pipes (max ${MAX_PIPES})`);
    }

    const parsedFilters = filterParts.map(filterStr => {
        // Parse filter with arguments: filter(arg1, arg2)
        const match = filterStr.match(/^(\w+)(?:\((.*)\))?$/);
        if (!match) {
            throw new Error(`Invalid filter syntax: ${filterStr}`);
        }

        const name = match[1];
        const argsStr = match[2];

        let args: any[] = [];
        if (argsStr) {
            // Parse arguments (simple parsing - handles strings, numbers, booleans)
            args = argsStr.split(',').map(arg => {
                arg = arg.trim();

                // String literal
                if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
                    return arg.slice(1, -1);
                }

                // Number
                if (!isNaN(Number(arg))) {
                    return Number(arg);
                }

                // Boolean
                if (arg === 'true') return true;
                if (arg === 'false') return false;

                // Default to string
                return arg;
            });
        }

        return { name, args };
    });

    return { field, filters: parsedFilters };
}

/**
 * Get nested value from object using dot notation
 *
 * Example: getNestedValue({ contact: { firstName: "John" } }, "contact.firstName") => "John"
 */
function getNestedValue(obj: any, path: string): any {
    if (!path) return obj;

    return path.split('.').reduce((current, key) => {
        if (current === null || current === undefined) return undefined;
        return current[key];
    }, obj);
}

/**
 * Apply filters to a value
 */
function applyFilters(value: any, filterList: Array<{ name: string; args: any[] }>): any {
    let result = value;

    for (const { name, args } of filterList) {
        const filterFn = filters[name];
        if (!filterFn) {
            throw new Error(`Unknown filter: ${name}`);
        }

        result = filterFn(result, ...args);
    }

    return result;
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Evaluate a single expression
 *
 * @param expression - Expression string without {{ }}
 * @param context - Data context object
 * @returns Evaluated value
 *
 * Example:
 *   evaluateExpression("contact.firstName | uppercase", { contact: { firstName: "john" } })
 *   => "JOHN"
 */
export function evaluateExpression(expression: string, context: any): any {
    const startTime = Date.now();

    try {
        const { field, filters: filterList } = parseExpression(expression);

        // Get initial value
        let value = getNestedValue(context, field);

        // Apply filters
        value = applyFilters(value, filterList);

        // Check timeout
        if (Date.now() - startTime > EVALUATION_TIMEOUT) {
            throw new Error('Expression evaluation timeout');
        }

        return value;
    } catch (error: any) {
        console.error(`Expression evaluation error: ${error.message}`, { expression });
        return expression; // Return original expression on error
    }
}

/**
 * Replace all {{expressions}} in a template string
 *
 * @param template - Template string with {{expressions}}
 * @param context - Data context object
 * @returns String with expressions replaced
 *
 * Example:
 *   replacePlaceholders("Hello {{contact.firstName | uppercase}}!", { contact: { firstName: "john" } })
 *   => "Hello JOHN!"
 */
export function replacePlaceholders(template: string, context: any): string {
    if (!template || typeof template !== 'string') {
        return template;
    }

    // Match {{expression}} patterns
    const pattern = /\{\{([^}]+)\}\}/g;

    return template.replace(pattern, (match, expression) => {
        const trimmed = expression.trim();
        const result = evaluateExpression(trimmed, context);

        // Convert result to string
        if (result === null || result === undefined) {
            return '';
        }

        return String(result);
    });
}

/**
 * Replace placeholders in an object (recursively)
 *
 * @param obj - Object with potential {{expressions}}
 * @param context - Data context
 * @returns Object with expressions replaced
 */
export function replacePlaceholdersInObject(obj: any, context: any): any {
    if (typeof obj === 'string') {
        return replacePlaceholders(obj, context);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => replacePlaceholdersInObject(item, context));
    }

    if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
            result[key] = replacePlaceholdersInObject(value, context);
        }
        return result;
    }

    return obj;
}

/**
 * Get list of available filters
 */
export function getAvailableFilters(): string[] {
    return Object.keys(filters);
}

/**
 * Register a custom filter
 *
 * @param name - Filter name
 * @param fn - Filter function
 */
export function registerFilter(name: string, fn: (value: any, ...args: any[]) => any): void {
    filters[name] = fn;
}
