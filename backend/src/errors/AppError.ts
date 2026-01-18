/**
 * Custom Error Classes for MorrisB API
 *
 * Provides structured, consistent error handling across the application.
 * All custom errors extend AppError and include:
 * - HTTP status code
 * - Error code for client-side handling
 * - User-friendly message
 * - Optional details for debugging
 */

/**
 * Error codes for client-side handling
 * Organized by category for easy reference
 */
export enum ErrorCode {
    // Authentication errors (1xxx)
    UNAUTHORIZED = "AUTH_001",
    INVALID_TOKEN = "AUTH_002",
    TOKEN_EXPIRED = "AUTH_003",
    EMAIL_NOT_VERIFIED = "AUTH_004",
    INVALID_CREDENTIALS = "AUTH_005",
    ACCOUNT_DISABLED = "AUTH_006",

    // Authorization errors (2xxx)
    FORBIDDEN = "AUTHZ_001",
    INSUFFICIENT_PERMISSIONS = "AUTHZ_002",
    WORKSPACE_ACCESS_DENIED = "AUTHZ_003",

    // Validation errors (3xxx)
    VALIDATION_ERROR = "VAL_001",
    MISSING_REQUIRED_FIELD = "VAL_002",
    INVALID_FORMAT = "VAL_003",
    INVALID_ID = "VAL_004",
    DUPLICATE_ENTRY = "VAL_005",

    // Resource errors (4xxx)
    NOT_FOUND = "RES_001",
    RESOURCE_ALREADY_EXISTS = "RES_002",
    RESOURCE_CONFLICT = "RES_003",
    RESOURCE_GONE = "RES_004",

    // Rate limiting errors (5xxx)
    RATE_LIMIT_EXCEEDED = "RATE_001",
    TOO_MANY_REQUESTS = "RATE_002",

    // External service errors (6xxx)
    EXTERNAL_SERVICE_ERROR = "EXT_001",
    EMAIL_SERVICE_ERROR = "EXT_002",
    AI_SERVICE_ERROR = "EXT_003",
    PAYMENT_SERVICE_ERROR = "EXT_004",

    // Database errors (7xxx)
    DATABASE_ERROR = "DB_001",
    DATABASE_CONNECTION_ERROR = "DB_002",
    DATABASE_QUERY_ERROR = "DB_003",

    // Server errors (9xxx)
    INTERNAL_ERROR = "SRV_001",
    SERVICE_UNAVAILABLE = "SRV_002",
    NOT_IMPLEMENTED = "SRV_003",
}

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: ErrorCode;
    public readonly isOperational: boolean;
    public readonly details?: Record<string, any>;
    public readonly timestamp: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code: ErrorCode = ErrorCode.INTERNAL_ERROR,
        details?: Record<string, any>,
        isOperational: boolean = true
    ) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.details = details;
        this.timestamp = new Date().toISOString();

        // Maintains proper stack trace
        Error.captureStackTrace(this, this.constructor);

        // Set the prototype explicitly for instanceof checks
        Object.setPrototypeOf(this, AppError.prototype);
    }

    /**
     * Convert error to JSON for API response
     */
    toJSON(): Record<string, any> {
        return {
            success: false,
            error: {
                message: this.message,
                code: this.code,
                ...(this.details && { details: this.details }),
            },
        };
    }
}

/**
 * 400 Bad Request - Validation errors
 */
export class ValidationError extends AppError {
    constructor(
        message: string = "Validation failed",
        details?: Record<string, any>
    ) {
        super(message, 400, ErrorCode.VALIDATION_ERROR, details);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }

    static missingField(field: string): ValidationError {
        return new ValidationError(`${field} is required`, {
            field,
            type: "missing_field",
        });
    }

    static invalidFormat(field: string, expected: string): ValidationError {
        return new ValidationError(
            `Invalid format for ${field}. Expected: ${expected}`,
            { field, expected, type: "invalid_format" }
        );
    }

    static invalidId(resource: string = "resource"): ValidationError {
        return new ValidationError(`Invalid ${resource} ID format`, {
            type: "invalid_id",
        });
    }

    static fromZod(zodError: any): ValidationError {
        const details = zodError.errors.map((err: any) => ({
            field: err.path.join("."),
            message: err.message,
        }));
        return new ValidationError("Validation failed", { errors: details });
    }
}

/**
 * 401 Unauthorized - Authentication errors
 */
export class UnauthorizedError extends AppError {
    constructor(
        message: string = "Authentication required",
        code: ErrorCode = ErrorCode.UNAUTHORIZED
    ) {
        super(message, 401, code);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }

    static noToken(): UnauthorizedError {
        return new UnauthorizedError(
            "No token provided. Please authenticate.",
            ErrorCode.UNAUTHORIZED
        );
    }

    static invalidToken(): UnauthorizedError {
        return new UnauthorizedError(
            "Invalid token. Please authenticate again.",
            ErrorCode.INVALID_TOKEN
        );
    }

    static tokenExpired(): UnauthorizedError {
        return new UnauthorizedError(
            "Token has expired. Please login again.",
            ErrorCode.TOKEN_EXPIRED
        );
    }

    static invalidCredentials(): UnauthorizedError {
        return new UnauthorizedError(
            "Invalid email or password.",
            ErrorCode.INVALID_CREDENTIALS
        );
    }
}

/**
 * 403 Forbidden - Authorization errors
 */
export class ForbiddenError extends AppError {
    constructor(
        message: string = "You do not have permission to perform this action",
        code: ErrorCode = ErrorCode.FORBIDDEN
    ) {
        super(message, 403, code);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }

    static emailNotVerified(): ForbiddenError {
        return new ForbiddenError(
            "Please verify your email address to access this resource.",
            ErrorCode.EMAIL_NOT_VERIFIED
        );
    }

    static workspaceAccess(): ForbiddenError {
        return new ForbiddenError(
            "You do not have permission to access this workspace.",
            ErrorCode.WORKSPACE_ACCESS_DENIED
        );
    }

    static insufficientPermissions(action: string): ForbiddenError {
        return new ForbiddenError(
            `You do not have permission to ${action}.`,
            ErrorCode.INSUFFICIENT_PERMISSIONS
        );
    }
}

/**
 * 404 Not Found - Resource not found errors
 */
export class NotFoundError extends AppError {
    constructor(
        resource: string = "Resource",
        identifier?: string
    ) {
        const message = identifier
            ? `${resource} not found: ${identifier}`
            : `${resource} not found`;
        super(message, 404, ErrorCode.NOT_FOUND, { resource, identifier });
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }

    static workspace(id?: string): NotFoundError {
        return new NotFoundError("Workspace", id);
    }

    static contact(id?: string): NotFoundError {
        return new NotFoundError("Contact", id);
    }

    static user(id?: string): NotFoundError {
        return new NotFoundError("User", id);
    }

    static campaign(id?: string): NotFoundError {
        return new NotFoundError("Campaign", id);
    }

    static sequence(id?: string): NotFoundError {
        return new NotFoundError("Sequence", id);
    }

    static template(id?: string): NotFoundError {
        return new NotFoundError("Template", id);
    }
}

/**
 * 409 Conflict - Resource conflict errors
 */
export class ConflictError extends AppError {
    constructor(
        message: string = "Resource conflict",
        details?: Record<string, any>
    ) {
        super(message, 409, ErrorCode.RESOURCE_CONFLICT, details);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }

    static duplicate(resource: string, field: string, value: string): ConflictError {
        return new ConflictError(
            `${resource} with ${field} "${value}" already exists`,
            { resource, field, value }
        );
    }

    static emailExists(): ConflictError {
        return new ConflictError("An account with this email already exists", {
            field: "email",
        });
    }
}

/**
 * 429 Too Many Requests - Rate limiting errors
 */
export class RateLimitError extends AppError {
    public readonly retryAfter?: number;

    constructor(
        message: string = "Too many requests. Please try again later.",
        retryAfter?: number
    ) {
        super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, { retryAfter });
        this.retryAfter = retryAfter;
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * 500 Internal Server Error
 */
export class InternalError extends AppError {
    constructor(
        message: string = "An unexpected error occurred. Please try again.",
        details?: Record<string, any>
    ) {
        super(message, 500, ErrorCode.INTERNAL_ERROR, details, true);
        Object.setPrototypeOf(this, InternalError.prototype);
    }
}

/**
 * 502/503 External Service Error
 */
export class ExternalServiceError extends AppError {
    constructor(
        service: string,
        message: string = "External service error",
        code: ErrorCode = ErrorCode.EXTERNAL_SERVICE_ERROR
    ) {
        super(`${service}: ${message}`, 502, code, { service });
        Object.setPrototypeOf(this, ExternalServiceError.prototype);
    }

    static email(message: string): ExternalServiceError {
        return new ExternalServiceError(
            "Email Service",
            message,
            ErrorCode.EMAIL_SERVICE_ERROR
        );
    }

    static ai(message: string): ExternalServiceError {
        return new ExternalServiceError(
            "AI Service",
            message,
            ErrorCode.AI_SERVICE_ERROR
        );
    }
}

/**
 * 503 Service Unavailable
 */
export class ServiceUnavailableError extends AppError {
    constructor(message: string = "Service temporarily unavailable") {
        super(message, 503, ErrorCode.SERVICE_UNAVAILABLE);
        Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
    }
}

/**
 * Database error wrapper
 */
export class DatabaseError extends AppError {
    constructor(
        message: string = "Database operation failed",
        originalError?: Error
    ) {
        super(message, 500, ErrorCode.DATABASE_ERROR, {
            originalError: originalError?.message,
        });
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
