/**
 * Error Handling Module
 *
 * Centralized exports for custom error classes and utilities.
 *
 * Usage:
 *   import { NotFoundError, ValidationError, asyncHandler } from "../errors";
 */

// Export all error classes
export {
    AppError,
    ErrorCode,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    InternalError,
    ExternalServiceError,
    ServiceUnavailableError,
    DatabaseError,
} from "./AppError";

// Export middleware
export {
    globalErrorHandler,
    notFoundHandler,
    asyncHandler,
    asyncAuthHandler,
} from "../middleware/errorHandler";
