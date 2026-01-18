/**
 * Structured Logger using Winston
 *
 * Provides consistent logging across the application with:
 * - JSON format in production for log aggregation
 * - Pretty console output in development
 * - Log levels: error, warn, info, http, debug
 * - Request context (when available)
 * - Automatic metadata extraction
 */

import winston from "winston";

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Determine environment
const isProduction = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProduction ? "info" : "debug");

// Custom format for development - readable console output
const devFormat = printf(({ level, message, timestamp, service, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present (exclude service from output in dev for cleaner logs)
  const cleanMeta = Object.entries(metadata)
    .filter(([key]) => typeof key === "string" && !key.startsWith("Symbol"))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

  if (Object.keys(cleanMeta).length > 0) {
    msg += ` ${JSON.stringify(cleanMeta)}`;
  }

  return msg;
});

// Create the logger instance
const winstonLogger = winston.createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }), // Capture stack traces
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" })
  ),
  defaultMeta: {
    service: "morrisb-api",
  },
  transports: [
    // Console transport - always enabled
    new winston.transports.Console({
      format: isProduction
        ? combine(timestamp(), json()) // JSON in production for log aggregation
        : combine(colorize(), timestamp({ format: "HH:mm:ss" }), devFormat), // Pretty in dev
    }),
  ],
});

// Add file transport in production
if (isProduction) {
  // Ensure logs directory exists
  const fs = require("fs");
  const path = require("path");
  const logsDir = path.join(process.cwd(), "logs");
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  // Error logs to separate file
  winstonLogger.add(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), json()),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Combined logs
  winstonLogger.add(
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), json()),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

/**
 * Logger class that wraps Winston for structured logging
 * Maintains backward compatibility with existing logger usage
 */
class Logger {
  /**
   * Info level - for general operational messages
   * @example logger.info('Server started', { port: 5000 })
   */
  info(message: string, metadata?: Record<string, any>): void {
    winstonLogger.info(message, metadata);
  }

  /**
   * Warn level - for warnings and deprecations
   * @example logger.warn('Rate limit approaching', { remaining: 10 })
   */
  warn(message: string, metadata?: Record<string, any>): void {
    winstonLogger.warn(message, metadata);
  }

  /**
   * Error level - for errors and exceptions
   * @example logger.error('Database connection failed', { error: err.message })
   */
  error(message: string, metadata?: Record<string, any>): void {
    winstonLogger.error(message, metadata);
  }

  /**
   * Debug level - for detailed debugging information
   * @example logger.debug('Processing contact', { contactId: '123' })
   */
  debug(message: string, metadata?: Record<string, any>): void {
    winstonLogger.debug(message, metadata);
  }

  /**
   * HTTP level - for HTTP request logging
   * @example logger.http('GET /api/users', { status: 200, duration: 45 })
   */
  http(message: string, metadata?: Record<string, any>): void {
    winstonLogger.http(message, metadata);
  }
}

/**
 * Create a child logger with preset context
 * Useful for adding request-specific or module-specific context
 *
 * @example
 * const reqLogger = createChildLogger({ requestId: req.id, userId: req.user?.id });
 * reqLogger.info('Processing request');
 */
export const createChildLogger = (defaultMeta: Record<string, any>) => {
  const childLogger = winstonLogger.child(defaultMeta);

  return {
    error: (message: string, meta?: Record<string, any>) => {
      childLogger.error(message, meta);
    },
    warn: (message: string, meta?: Record<string, any>) => {
      childLogger.warn(message, meta);
    },
    info: (message: string, meta?: Record<string, any>) => {
      childLogger.info(message, meta);
    },
    http: (message: string, meta?: Record<string, any>) => {
      childLogger.http(message, meta);
    },
    debug: (message: string, meta?: Record<string, any>) => {
      childLogger.debug(message, meta);
    },
  };
};

/**
 * Express middleware for HTTP request logging
 * Automatically logs all requests with timing and status
 */
export const httpLoggerMiddleware = (req: any, res: any, next: any) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const meta = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userId: req.user?.id || req.user?._id?.toString(),
    };

    // Log level based on status code
    if (res.statusCode >= 500) {
      winstonLogger.error(`${req.method} ${req.originalUrl}`, meta);
    } else if (res.statusCode >= 400) {
      winstonLogger.warn(`${req.method} ${req.originalUrl}`, meta);
    } else {
      winstonLogger.http(`${req.method} ${req.originalUrl}`, meta);
    }
  });

  next();
};

// Export the singleton logger instance (backward compatible)
export const logger = new Logger();

// Export the raw winston logger for advanced use cases
export { winstonLogger };

// Default export
export default logger;
