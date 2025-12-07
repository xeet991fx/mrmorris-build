import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

/**
 * Apollo Rate Limiter
 * Prevents abuse and ensures we stay within Apollo's API limits
 *
 * Limits:
 * - 100 requests per minute per workspace
 * - 10,000 requests per day per workspace
 *
 * Uses in-memory storage (for production, consider Redis)
 */

interface RateLimitData {
  minuteRequests: number[];
  minuteTimestamp: number;
  dayRequests: number;
  dayTimestamp: number;
}

class ApolloRateLimiter {
  private limits: Map<string, RateLimitData>;
  private readonly MINUTE_LIMIT = parseInt(
    process.env.APOLLO_RATE_LIMIT_MINUTE || "100",
    10
  );
  private readonly DAY_LIMIT = parseInt(
    process.env.APOLLO_RATE_LIMIT_DAY || "10000",
    10
  );
  private readonly MINUTE_WINDOW = 60 * 1000; // 60 seconds
  private readonly DAY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.limits = new Map();

    // Clean up old entries every hour
    setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Check if the workspace has exceeded rate limits
   */
  async checkLimit(workspaceId: string): Promise<{
    allowed: boolean;
    retryAfter?: number;
    remaining: {
      minute: number;
      day: number;
    };
  }> {
    const now = Date.now();
    let data = this.limits.get(workspaceId);

    // Initialize if not exists
    if (!data) {
      data = {
        minuteRequests: [],
        minuteTimestamp: now,
        dayRequests: 0,
        dayTimestamp: now,
      };
      this.limits.set(workspaceId, data);
    }

    // Reset minute window if needed
    if (now - data.minuteTimestamp >= this.MINUTE_WINDOW) {
      data.minuteRequests = [];
      data.minuteTimestamp = now;
    }

    // Reset day window if needed
    if (now - data.dayTimestamp >= this.DAY_WINDOW) {
      data.dayRequests = 0;
      data.dayTimestamp = now;
    }

    // Remove requests older than 1 minute from the minute window
    data.minuteRequests = data.minuteRequests.filter(
      (timestamp) => now - timestamp < this.MINUTE_WINDOW
    );

    // Check limits
    const minuteRemaining = this.MINUTE_LIMIT - data.minuteRequests.length;
    const dayRemaining = this.DAY_LIMIT - data.dayRequests;

    if (data.minuteRequests.length >= this.MINUTE_LIMIT) {
      const oldestRequest = data.minuteRequests[0];
      const retryAfter = Math.ceil(
        (this.MINUTE_WINDOW - (now - oldestRequest)) / 1000
      );

      return {
        allowed: false,
        retryAfter,
        remaining: {
          minute: 0,
          day: dayRemaining,
        },
      };
    }

    if (data.dayRequests >= this.DAY_LIMIT) {
      const retryAfter = Math.ceil((this.DAY_WINDOW - (now - data.dayTimestamp)) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: {
          minute: minuteRemaining,
          day: 0,
        },
      };
    }

    return {
      allowed: true,
      remaining: {
        minute: minuteRemaining,
        day: dayRemaining,
      },
    };
  }

  /**
   * Increment usage for a workspace
   */
  async incrementUsage(workspaceId: string): Promise<void> {
    const now = Date.now();
    const data = this.limits.get(workspaceId);

    if (!data) {
      this.limits.set(workspaceId, {
        minuteRequests: [now],
        minuteTimestamp: now,
        dayRequests: 1,
        dayTimestamp: now,
      });
    } else {
      data.minuteRequests.push(now);
      data.dayRequests++;
    }
  }

  /**
   * Get remaining requests for a workspace
   */
  async getRemainingRequests(workspaceId: string): Promise<{
    minute: number;
    day: number;
  }> {
    const result = await this.checkLimit(workspaceId);
    return result.remaining;
  }

  /**
   * Cleanup old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const workspacesToDelete: string[] = [];

    for (const [workspaceId, data] of this.limits.entries()) {
      // If both windows have expired and no recent requests, remove the entry
      if (
        now - data.minuteTimestamp > this.MINUTE_WINDOW &&
        now - data.dayTimestamp > this.DAY_WINDOW &&
        data.minuteRequests.length === 0
      ) {
        workspacesToDelete.push(workspaceId);
      }
    }

    workspacesToDelete.forEach((id) => this.limits.delete(id));

    if (workspacesToDelete.length > 0) {
      logger.info(`Cleaned up ${workspacesToDelete.length} rate limit entries`);
    }
  }
}

// Create singleton instance
const rateLimiter = new ApolloRateLimiter();

/**
 * Express middleware for Apollo rate limiting
 */
export const apolloRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId;

    if (!workspaceId) {
      return next(new Error("Workspace ID is required"));
    }

    const limitCheck = await rateLimiter.checkLimit(workspaceId);

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit-Minute", rateLimiter["MINUTE_LIMIT"]);
    res.setHeader("X-RateLimit-Limit-Day", rateLimiter["DAY_LIMIT"]);
    res.setHeader(
      "X-RateLimit-Remaining-Minute",
      limitCheck.remaining.minute.toString()
    );
    res.setHeader(
      "X-RateLimit-Remaining-Day",
      limitCheck.remaining.day.toString()
    );

    if (!limitCheck.allowed) {
      res.setHeader("Retry-After", limitCheck.retryAfter!.toString());

      logger.warn("Apollo rate limit exceeded", {
        workspaceId,
        retryAfter: limitCheck.retryAfter,
        remaining: limitCheck.remaining,
      });

      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        message:
          "Too many Apollo API requests. Please try again later.",
        retryAfter: limitCheck.retryAfter,
        remaining: limitCheck.remaining,
      }) as any;
    }

    // Increment usage
    await rateLimiter.incrementUsage(workspaceId);

    next();
  } catch (error) {
    logger.error("Rate limiter error", { error });
    // On error, allow the request through but log it
    next();
  }
};

/**
 * Get remaining requests for a workspace (for display in UI)
 */
export const getRemainingRequests = async (
  workspaceId: string
): Promise<{ minute: number; day: number }> => {
  return rateLimiter.getRemainingRequests(workspaceId);
};

export default rateLimiter;
