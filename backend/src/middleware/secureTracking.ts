import { Request, Response, NextFunction } from 'express';
import Project from '../models/Project';
import { reverseIPService } from '../services/ReverseIPService';

/**
 * Secure CORS middleware for public tracking endpoints
 * Validates origin against project's allowed domains
 */
export const secureTrackingCors = async (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || req.headers.referer || 'http://localhost:3000';

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    return res.sendStatus(204);
  }

  // For actual requests, validate against project's allowed domains
  try {
    const workspaceId = req.body.workspaceId || req.body.events?.[0]?.workspaceId;

    if (!workspaceId) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      return next(); // Will fail in route validation
    }

    // Fetch project to check allowed domains
    const project = await Project.findById(workspaceId);

    if (!project) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      return next(); // Will fail in route validation
    }

    // Check if tracking is enabled for this project
    if (!project.trackingEnabled) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
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
      res.header('Access-Control-Allow-Credentials', 'true');
    } else {
      // No origin header (e.g., server-side request)
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }

    next();
  } catch (error) {
    console.error('[SECURITY] Error in secure tracking CORS:', error);
    // Fail open (allow request but log error)
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
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

/**
 * Track company visitor via reverse IP lookup
 * This middleware runs AFTER CORS validation and identifies companies from IP addresses
 */
export const trackCompanyVisitor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.body.workspaceId || req.body.events?.[0]?.workspaceId;

    if (!workspaceId) {
      return next(); // Skip if no workspace ID
    }

    // Extract IP address from request
    const ipAddress = getClientIP(req);

    if (!ipAddress) {
      return next(); // Skip if no IP
    }

    // Extract page view data from tracking event
    const event = req.body.events?.[0];
    const pageView = event ? {
      url: event.url || req.body.url,
      title: event.properties?.pageTitle || event.properties?.title,
      timestamp: new Date(),
      referrer: event.referrer,
      utmParams: extractUTMParams(event),
    } : {
      url: req.body.url || req.headers.referer || '',
      timestamp: new Date(),
      referrer: req.headers.referer,
    };

    // Track visitor asynchronously (don't block the request)
    reverseIPService.trackVisitor({
      workspaceId,
      ipAddress,
      pageView,
    }).catch((error) => {
      console.error('[REVERSE IP] Error tracking visitor:', error);
    });

    next();
  } catch (error) {
    console.error('[REVERSE IP] Error in trackCompanyVisitor middleware:', error);
    next(); // Don't block the request even if tracking fails
  }
};

/**
 * Extract client IP address from request
 * Handles proxy headers and various deployment scenarios
 */
function getClientIP(req: Request): string | null {
  // Try various headers in order of preference
  const candidates = [
    req.headers['cf-connecting-ip'], // Cloudflare
    req.headers['x-real-ip'], // Nginx
    req.headers['x-forwarded-for'], // Standard proxy header
    req.socket.remoteAddress, // Direct connection
  ];

  for (const candidate of candidates) {
    if (candidate) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = Array.isArray(candidate) ? candidate[0] : candidate;
      const cleanIP = ip.split(',')[0].trim();

      // Basic IPv4/IPv6 validation
      if (isValidIP(cleanIP)) {
        return cleanIP;
      }
    }
  }

  return null;
}

/**
 * Validate IP address format
 */
function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}$/i;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Extract UTM parameters from tracking event
 */
function extractUTMParams(event: any): any {
  if (!event?.properties) return undefined;

  const utmParams: any = {};
  const props = event.properties;

  if (props.utm_source) utmParams.source = props.utm_source;
  if (props.utm_medium) utmParams.medium = props.utm_medium;
  if (props.utm_campaign) utmParams.campaign = props.utm_campaign;
  if (props.utm_term) utmParams.term = props.utm_term;
  if (props.utm_content) utmParams.content = props.utm_content;

  return Object.keys(utmParams).length > 0 ? utmParams : undefined;
}
