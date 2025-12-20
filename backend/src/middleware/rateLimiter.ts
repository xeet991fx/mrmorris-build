/**
 * Rate Limiter Middleware
 *
 * Prevents abuse of expensive AI agent endpoints by limiting requests per user.
 * Uses in-memory storage for simplicity (can be upgraded to Redis for production).
 */

import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

interface RateLimitData {
    count: number;
    resetTime: number;
}

// Store rate limit data per user
const rateLimitStore = new Map<string, RateLimitData>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
            rateLimitStore.delete(key);
            cleanedCount++;
        }
    }

    if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} rate limit entries`);
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 *
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @param keyGenerator - Function to generate unique key for rate limiting (defaults to userId)
 */
export function createRateLimiter(
    maxRequests: number,
    windowMs: number,
    keyGenerator?: (req: AuthRequest) => string
) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            // Generate unique key (default: userId)
            const key = keyGenerator
                ? keyGenerator(req)
                : `user:${(req.user?._id as any)?.toString()}`;

            if (!key || key === "user:undefined") {
                // If no user ID (not authenticated), let auth middleware handle it
                return next();
            }

            const now = Date.now();
            let rateLimitData = rateLimitStore.get(key);

            // Initialize or reset if window expired
            if (!rateLimitData || now > rateLimitData.resetTime) {
                rateLimitData = {
                    count: 0,
                    resetTime: now + windowMs,
                };
                rateLimitStore.set(key, rateLimitData);
            }

            // Increment request count
            rateLimitData.count++;

            // Set rate limit headers
            res.setHeader("X-RateLimit-Limit", maxRequests);
            res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - rateLimitData.count));
            res.setHeader("X-RateLimit-Reset", new Date(rateLimitData.resetTime).toISOString());

            // Check if limit exceeded
            if (rateLimitData.count > maxRequests) {
                const retryAfter = Math.ceil((rateLimitData.resetTime - now) / 1000);

                res.setHeader("Retry-After", retryAfter);
                return res.status(429).json({
                    success: false,
                    error: "Too many requests. Please try again later.",
                    details: {
                        limit: maxRequests,
                        windowMs,
                        retryAfter: `${retryAfter}s`,
                    },
                });
            }

            next();
        } catch (error) {
            console.error("Rate limiter error:", error);
            // On error, allow request through (fail open)
            next();
        }
    };
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const agentChatLimiter = createRateLimiter(
    15, // 15 requests
    60 * 1000 // per minute
);

export const agentStatusLimiter = createRateLimiter(
    30, // 30 requests
    60 * 1000 // per minute
);
