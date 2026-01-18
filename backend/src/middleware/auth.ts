import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";
import { logger } from "../utils/logger";

// Validate JWT_SECRET at startup
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error("CRITICAL: JWT_SECRET environment variable is required in production");
}

// Use a development-only fallback (will warn in console)
const getJwtSecret = (): string => {
  if (JWT_SECRET) return JWT_SECRET;
  logger.warn("Using default JWT secret - set JWT_SECRET in production");
  return "dev-only-secret-do-not-use-in-production";
};

// Extend Express Request to include user
declare global {
  namespace Express {
    interface User extends IUser {}
  }
}

export interface AuthRequest extends Request {
  user?: IUser;
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "No token provided. Please authenticate.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as { id: string };

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found. Token is invalid.",
      });
      return;
    }

    // Check if user is verified
    if (!user.isVerified) {
      res.status(403).json({
        success: false,
        error: "Please verify your email address to access this resource.",
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      res.status(401).json({
        success: false,
        error: "Invalid token. Please authenticate again.",
      });
      return;
    }

    if (error.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: "Token has expired. Please login again.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Authentication failed. Please try again.",
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this"
    ) as { id: string };

    const user = await User.findById(decoded.id);

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // If optional auth fails, just continue without user
    next();
  }
};

/**
 * Middleware to check if user is verified
 */
export const requireVerified = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required.",
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      success: false,
      error: "Please verify your email address.",
    });
    return;
  }

  next();
};
