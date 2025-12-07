/**
 * Simple logger utility
 * In production, replace with Winston, Pino, or another logging library
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development";

  private formatMessage(level: LogLevel, message: string, metadata?: LogMetadata): string {
    const timestamp = new Date().toISOString();
    const metaString = metadata ? ` | ${JSON.stringify(metadata)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
  }

  info(message: string, metadata?: LogMetadata): void {
    console.log(this.formatMessage("info", message, metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage("warn", message, metadata));
  }

  error(message: string, metadata?: LogMetadata): void {
    console.error(this.formatMessage("error", message, metadata));
  }

  debug(message: string, metadata?: LogMetadata): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, metadata));
    }
  }
}

export const logger = new Logger();
