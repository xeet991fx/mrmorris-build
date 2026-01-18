/**
 * Global Error Handler Middleware
 *
 * Centralized error handling for the entire application.
 * Catches all errors and returns consistent JSON responses.
 */

import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode, ValidationError } from "../errors/AppError";
import { logger } from "../utils/logger";

/**
 * Determine if we're in production mode
 */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
function handleCastError(error: any): AppError {
    return new AppError(
        `Invalid ${error.path}: ${error.value}`,
        400,
        ErrorCode.INVALID_ID,
        { path: error.path, value: error.value }
    );
}

/**
 * Handle Mongoose Duplicate Key Error
 */
function handleDuplicateKeyError(error: any): AppError {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    return new AppError(
        `${field} "${value}" already exists`,
        409,
        ErrorCode.DUPLICATE_ENTRY,
        { field, value }
    );
}

/**
 * Handle Mongoose Validation Error
 */
function handleMongooseValidationError(error: any): AppError {
    const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
    }));
    return new AppError(
        "Validation failed",
        400,
        ErrorCode.VALIDATION_ERROR,
        { errors }
    );
}

/**
 * Handle JWT Errors
 */
function handleJWTError(error: any): AppError {
    if (error.name === "JsonWebTokenError") {
        return new AppError(
            "Invalid token. Please authenticate again.",
            401,
            ErrorCode.INVALID_TOKEN
        );
    }
    if (error.name === "TokenExpiredError") {
        return new AppError(
            "Token has expired. Please login again.",
            401,
            ErrorCode.TOKEN_EXPIRED
        );
    }
    return new AppError("Authentication failed", 401, ErrorCode.UNAUTHORIZED);
}

/**
 * Handle Zod Validation Errors
 */
function handleZodError(error: any): AppError {
    const details = error.errors.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
    }));
    return new AppError(
        "Validation failed",
        400,
        ErrorCode.VALIDATION_ERROR,
        { errors: details }
    );
}

/**
 * Send error response in development mode
 * Includes full error details and stack trace
 */
function sendDevError(error: AppError, res: Response): void {
    res.status(error.statusCode).json({
        success: false,
        error: {
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack,
            timestamp: error.timestamp,
        },
    });
}

/**
 * Send error response in production mode
 * Only includes user-friendly information
 */
function sendProdError(error: AppError, res: Response): void {
    // Operational errors: send message to client
    if (error.isOperational) {
        res.status(error.statusCode).json({
            success: false,
            error: {
                message: error.message,
                code: error.code,
                ...(error.details && { details: error.details }),
            },
        });
    } else {
        // Programming or unknown errors: don't leak details
        logger.error("Unexpected error", {
            error: error.message,
            stack: error.stack,
        });

        res.status(500).json({
            success: false,
            error: {
                message: "An unexpected error occurred. Please try again.",
                code: ErrorCode.INTERNAL_ERROR,
            },
        });
    }
}

/**
 * Global Error Handler Middleware
 *
 * Must be registered LAST after all routes.
 *
 * Usage:
 *   app.use(globalErrorHandler);
 */
export function globalErrorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Default values
    let appError: AppError;

    // Already an AppError - use directly
    if (error instanceof AppError) {
        appError = error;
    }
    // Mongoose CastError (invalid ObjectId)
    else if (error.name === "CastError") {
        appError = handleCastError(error);
    }
    // Mongoose Duplicate Key Error
    else if ((error as any).code === 11000) {
        appError = handleDuplicateKeyError(error);
    }
    // Mongoose Validation Error
    else if (error.name === "ValidationError" && (error as any).errors) {
        appError = handleMongooseValidationError(error);
    }
    // JWT Errors
    else if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
    ) {
        appError = handleJWTError(error);
    }
    // Zod Validation Error
    else if (error.name === "ZodError") {
        appError = handleZodError(error);
    }
    // Unknown error - wrap it
    else {
        appError = new AppError(
            error.message || "An unexpected error occurred",
            500,
            ErrorCode.INTERNAL_ERROR,
            undefined,
            false // Not operational - this is a programming error
        );
    }

    // Log error with context
    const logContext = {
        code: appError.code,
        statusCode: appError.statusCode,
        path: req.path,
        method: req.method,
        userId: (req as any).user?._id?.toString(),
        details: appError.details,
    };

    if (appError.statusCode >= 500) {
        logger.error(appError.message, { ...logContext, stack: error.stack });
    } else if (appError.statusCode >= 400) {
        logger.warn(appError.message, logContext);
    }

    // Send response
    if (isProduction) {
        sendProdError(appError, res);
    } else {
        sendDevError(appError, res);
    }
}

/**
 * 404 Not Found Handler
 *
 * Must be registered after all routes but before globalErrorHandler.
 *
 * Usage:
 *   app.use(notFoundHandler);
 *   app.use(globalErrorHandler);
 */
export function notFoundHandler(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const error = new AppError(
        `Route not found: ${req.method} ${req.originalUrl}`,
        404,
        ErrorCode.NOT_FOUND,
        { method: req.method, path: req.originalUrl }
    );
    next(error);
}

/**
 * Async Handler Wrapper
 *
 * Wraps async route handlers to catch errors automatically.
 * Eliminates the need for try/catch in every route.
 *
 * Usage:
 *   router.get("/users", asyncHandler(async (req, res) => {
 *       const users = await User.find();
 *       res.json({ success: true, data: users });
 *   }));
 */
export function asyncHandler<T>(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Type-safe async handler for authenticated routes
 */
export function asyncAuthHandler<T>(
    fn: (req: any, res: Response, next: NextFunction) => Promise<T>
) {
    return (req: any, res: Response, next: NextFunction): void => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
