import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project';

/**
 * Secure CORS middleware for public tracking endpoints
 * Validates origin against project's allowed domains
 */
export const secureTrackingCors = async (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || req.headers.referer;

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.sendStatus(204);
  }

  // For actual requests, validate against project's allowed domains
  try {
    const workspaceId = req.body.workspaceId || req.body.events?.[0]?.workspaceId;

    if (!workspaceId) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      return next(); // Will fail in route validation
    }

    // Fetch project to check allowed domains
    const project = await Project.findById(workspaceId);

    if (!project) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      return next(); // Will fail in route validation
    }

    // Check if tracking is enabled for this project
    if (!project.trackingEnabled) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      return res.status(403).json({
        success: false,
        message: 'Tracking is disabled for this project',
      });
    }

    // Validate origin against allowed domains
    if (origin) {
      const allowed = isOriginAllowed(origin, project.allowedDomains);

      if (!allowed) {
        // Log unauthorized attempt
        console.warn(`[SECURITY] Tracking blocked from unauthorized origin: ${origin} for project: ${workspaceId}`);

        return res.status(403).json({
          success: false,
          message: 'Origin not allowed for this project',
          hint: 'Add this domain to your project\'s allowed domains list',
        });
      }

      // Origin is allowed
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'false');
    } else {
      // No origin header (e.g., server-side request)
      res.header('Access-Control-Allow-Origin', '*');
    }

    next();
  } catch (error) {
    console.error('[SECURITY] Error in secure tracking CORS:', error);
    // Fail open (allow request but log error)
    res.header('Access-Control-Allow-Origin', origin || '*');
    next();
  }
};

/**
 * Check if origin is allowed based on project's domain whitelist
 */
function isOriginAllowed(origin: string, allowedDomains: string[]): boolean {
  // If no domains specified, allow all (backward compatible)
  if (!allowedDomains || allowedDomains.length === 0) {
    return true;
  }

  // If wildcard '*' is in allowed domains, allow all
  if (allowedDomains.includes('*')) {
    return true;
  }

  // Extract hostname from origin
  let hostname: string;
  try {
    const url = new URL(origin);
    hostname = url.hostname;
  } catch (e) {
    // If origin is not a valid URL, extract domain manually
    hostname = origin.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
  }

  // Check exact match or wildcard match
  for (const allowedDomain of allowedDomains) {
    if (allowedDomain === hostname) {
      return true; // Exact match
    }

    // Check wildcard match (*.example.com matches sub.example.com)
    if (allowedDomain.startsWith('*.')) {
      const baseDomain = allowedDomain.substring(2); // Remove "*."
      if (hostname.endsWith('.' + baseDomain) || hostname === baseDomain) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Validate tracking request payload
 */
export const validateTrackingPayload = (req: Request, res: Response, next: NextFunction) => {
  const contentType = req.headers['content-type'];

  // Only accept JSON
  if (!contentType || !contentType.includes('application/json')) {
    return res.status(415).json({
      success: false,
      message: 'Content-Type must be application/json',
    });
  }

  // Check request size (should be handled by express.json limit, but double-check)
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const MAX_SIZE = 100 * 1024; // 100KB max

  if (contentLength > MAX_SIZE) {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large (max 100KB)',
    });
  }

  next();
};

/**
 * Sanitize tracking data to prevent injection attacks
 */
export const sanitizeTrackingData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body.events && Array.isArray(req.body.events)) {
    req.body.events = req.body.events.map((event: any) => ({
      ...event,
      // Sanitize string fields
      eventType: sanitizeString(event.eventType),
      eventName: sanitizeString(event.eventName),
      url: sanitizeUrl(event.url),
      referrer: sanitizeUrl(event.referrer),
      // Limit properties object size
      properties: limitObjectDepth(event.properties, 3),
    }));
  }

  if (req.body.email) {
    req.body.email = sanitizeEmail(req.body.email);
  }

  next();
};

// Helper functions
function sanitizeString(str: any): string {
  if (typeof str !== 'string') return '';
  return str.substring(0, 500).trim(); // Max 500 chars
}

function sanitizeUrl(url: any): string {
  if (typeof url !== 'string') return '';
  // Basic URL validation
  try {
    new URL(url);
    return url.substring(0, 2048); // Max 2048 chars for URLs
  } catch (e) {
    return '';
  }
}

function sanitizeEmail(email: any): string {
  if (typeof email !== 'string') return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email.toLowerCase().trim() : '';
}

function limitObjectDepth(obj: any, maxDepth: number, currentDepth = 0): any {
  if (currentDepth >= maxDepth) return {};
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 20); // Max 20 array items

  const limited: any = {};
  let count = 0;
  const MAX_PROPS = 50; // Max 50 properties

  for (const key in obj) {
    if (count >= MAX_PROPS) break;
    if (obj.hasOwnProperty(key)) {
      limited[key] = limitObjectDepth(obj[key], maxDepth, currentDepth + 1);
      count++;
    }
  }

  return limited;
}

/**
 * Log tracking requests for monitoring
 */
export const logTrackingRequest = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || 'unknown';
  const workspaceId = req.body.workspaceId || req.body.events?.[0]?.workspaceId;
  const eventCount = req.body.events?.length || 0;

  // Log to console (replace with proper logging service in production)
  console.log(`[TRACKING] ${req.method} ${req.path} | Origin: ${origin} | Workspace: ${workspaceId} | Events: ${eventCount}`);

  next();
};
