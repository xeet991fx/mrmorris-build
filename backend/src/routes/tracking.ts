import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import TrackingEvent from '../models/TrackingEvent';
import Visitor from '../models/Visitor';
import Contact from '../models/Contact';
import { authenticate, AuthRequest } from '../middleware/auth';
import { webhookService as WebhookService } from '../services/WebhookService';
import {
  secureTrackingCors,
  validateTrackingPayload,
  sanitizeTrackingData,
  logTrackingRequest,
  trackCompanyVisitor,
} from '../middleware/secureTracking';
import { trackIntentSignal } from '../services/intentScoring';
import { emitWorkflowEvent } from '../middleware/workflowTrigger';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================
// PAYLOAD DECODER FOR STEALTH TRACKING
// Decodes obfuscated payloads from anti-adblock script
// ============================================

/**
 * Decode obfuscated payload from stealth tracker
 * Format: { _d: "encoded_string", _v: 2 }
 */
function decodeStealthPayload(body: any): any {
  try {
    // Check if this is an encoded payload
    if (body._d && body._v === 2) {
      // Decode: reverse + base64 decode
      const reversed = body._d.split('').reverse().join('');
      const decoded = Buffer.from(reversed, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    // Return as-is if not encoded
    return body;
  } catch (error) {
    logger.error("Tracking decode error", { error });
    return body;
  }
}

/**
 * Map obfuscated event fields to standard format
 * Stealth format uses single letters to avoid detection
 */
function mapStealthEvent(event: any, clientIp: string, userAgent: string): any {
  return {
    workspaceId: event.w || event.workspaceId,
    visitorId: event.u || event.visitorId,
    sessionId: event.s || event.sessionId,
    eventType: mapEventType(event.e || event.eventType),
    eventName: mapEventName(event.n || event.eventName),
    url: event.l || event.url,
    referrer: event.r || event.referrer,
    utmSource: event.us || event.utmSource,
    utmMedium: event.um || event.utmMedium,
    utmCampaign: event.uc || event.utmCampaign,
    properties: mapProperties(event.p || event.properties),
    device: {
      userAgent: event.d?.a || event.device?.userAgent || userAgent,
      ip: clientIp,
      screen: event.d?.s || event.device?.screen,
      language: event.d?.l || event.device?.language,
    },
  };
}

/**
 * Map short event types to full names
 */
function mapEventType(type: string): string {
  const typeMap: Record<string, string> = {
    'v': 'page_view',
    'pv': 'page_view',
    's': 'scroll_depth',
    'sd': 'scroll_depth',
    't': 'time_on_page',
    'tp': 'time_on_page',
    'g': 'engagement',
    'en': 'engagement',
    'c': 'button_click',
    'cl': 'button_click',
    'fv': 'form_view',
    'fs': 'form_submit',
    'd': 'download',
    'dl': 'download',
    'x': 'exit_intent',
    'ex': 'exit_intent',
    'px': 'pixel',
  };
  return typeMap[type] || type || 'custom';
}

/**
 * Map short event names to full names
 */
function mapEventName(name: string): string {
  const nameMap: Record<string, string> = {
    'V': 'Page Viewed',
    'S25': 'Scrolled 25%',
    'S50': 'Scrolled 50%',
    'S75': 'Scrolled 75%',
    'S100': 'Scrolled 100%',
    'T': 'Time Spent',
    'G': 'User Engaged',
    'C': 'Button Clicked',
    'FV': 'Form Viewed',
    'FS': 'Form Submitted',
    'D': 'File Download',
    'X': 'Exit Intent',
    'E': 'Event',
  };
  return nameMap[name] || name || 'Event';
}

/**
 * Map obfuscated properties to readable format
 */
function mapProperties(props: any): any {
  if (!props) return {};

  const mapped: Record<string, any> = {};

  // Map known short keys
  const keyMap: Record<string, string> = {
    'a': 'value1',
    'b': 'value2',
    'c': 'value3',
    'd': 'value4',
    'e': 'value5',
    'ti': 'title',
    'pa': 'path',
    'rf': 'referrer',
    'vp': 'viewport',
    'sr': 'screenResolution',
    'dp': 'depth',
    'tm': 'timeToReach',
    'sc': 'seconds',
    'mx': 'maxScrollDepth',
    'eg': 'engaged',
    'tx': 'text',
    'ty': 'elementType',
    'id': 'elementId',
    'hr': 'href',
    'fi': 'formId',
    'fc': 'fieldCount',
    'ur': 'url',
    'fl': 'filename',
  };

  for (const [key, value] of Object.entries(props)) {
    const mappedKey = keyMap[key] || key;
    mapped[mappedKey] = value;
  }

  return mapped;
}

/**
 * Map obfuscated identify data
 */
function mapStealthIdentify(data: any): any {
  return {
    workspaceId: data.w || data.workspaceId,
    visitorId: data.u || data.visitorId,
    email: data.em || data.email,
    properties: {
      firstName: data.p?.b || data.p?.firstName || data.properties?.firstName,
      lastName: data.p?.c || data.p?.lastName || data.properties?.lastName,
      company: data.p?.d || data.p?.company || data.properties?.company,
      phone: data.p?.e || data.p?.phone || data.properties?.phone,
    },
  };
}

// ============================================
// HIGH-PERFORMANCE RATE LIMITER
// Optimized for 1000+ concurrent devices
// ============================================
const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP (was 100)
  message: 'Too many tracking requests from this IP. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests against limit
});

// ============================================
// ASYNC PROCESSING HELPERS
// Fire-and-forget pattern for non-blocking operations
// ============================================

/**
 * Process visitor updates using bulk upsert (MongoDB bulkWrite)
 * This is MUCH faster than individual findOne + save operations
 */
async function processVisitorUpdatesAsync(
  visitorUpdates: Map<string, any>,
  pageViewCount: number
): Promise<void> {
  if (visitorUpdates.size === 0) return;

  try {
    const bulkOps = Array.from(visitorUpdates.values()).map((update) => ({
      updateOne: {
        filter: {
          workspaceId: new mongoose.Types.ObjectId(update.workspaceId),
          visitorId: update.visitorId,
        },
        update: {
          $set: {
            lastSeen: new Date(),
            lastPageUrl: update.url,
            lastSource: update.referrer || undefined,
            lastUtmSource: update.utmSource || undefined,
            lastUtmMedium: update.utmMedium || undefined,
            lastUtmCampaign: update.utmCampaign || undefined,
          },
          $inc: {
            eventCount: 1,
            pageViewCount: pageViewCount,
          },
          $addToSet: {
            websites: update.websiteDomain,
            devices: {
              userAgent: update.device?.userAgent,
              ip: update.device?.ip,
              screen: update.device?.screen,
              language: update.device?.language,
              lastSeen: new Date(),
            },
          },
          $setOnInsert: {
            firstSeen: new Date(),
            firstSource: update.referrer,
            firstUtmSource: update.utmSource,
            firstUtmMedium: update.utmMedium,
            firstUtmCampaign: update.utmCampaign,
            sessionCount: 1,
          },
        },
        upsert: true,
      },
    }));

    await Visitor.bulkWrite(bulkOps, { ordered: false });
  } catch (error) {
    logger.error("Bulk visitor update error", { error });
    // Don't throw - this is fire-and-forget
  }
}

/**
 * Process intent signals asynchronously
 * Detects high-intent pages and tracks signals without blocking
 */
async function processIntentSignalsAsync(events: any[]): Promise<void> {
  try {
    for (const event of events) {
      if (event.eventType === 'page_view' && event.url) {
        const url = event.url.toLowerCase();
        let signalName: string | null = null;

        // Detect high-intent pages automatically
        if (url.includes('/pricing') || url.includes('/plans')) {
          signalName = 'pricing_page';
        } else if (url.includes('/demo') || url.includes('/book-demo')) {
          signalName = 'demo_request_page';
        } else if (url.includes('/contact') || url.includes('/get-started')) {
          signalName = 'contact_page';
        } else if (url.includes('/case-stud')) {
          signalName = 'case_study_view';
        } else if (url.includes('/comparison') || url.includes('/vs-')) {
          signalName = 'product_comparison';
        } else if (url.includes('/competitors')) {
          signalName = 'competitors_page';
        } else if (url.includes('/features') && event.properties?.scrollDepth > 75) {
          signalName = 'features_page_deep';
        } else if (url.includes('/docs') || url.includes('/documentation')) {
          signalName = 'documentation_view';
        } else if (url.includes('/api') && url.includes('/docs')) {
          signalName = 'api_docs_view';
        } else if (url.includes('/integrations')) {
          signalName = 'integrations_page';
        }

        if (signalName) {
          await trackIntentSignal(event.workspaceId, signalName, {
            contactId: event.contactId,
            visitorId: event.visitorId,
            signalType: 'page_view',
            url: event.url,
            sessionId: event.sessionId,
            metadata: {
              scrollDepth: event.properties?.scrollDepth,
              duration: event.properties?.duration,
            },
          }).catch(() => { }); // Silent fail
        }
      }

      // Track download signals
      if (event.eventType === 'download' || event.eventName?.includes('download')) {
        const eventName = event.eventName?.toLowerCase() || '';
        let signalName: string | null = null;

        if (eventName.includes('case study')) {
          signalName = 'case_study_download';
        } else if (eventName.includes('whitepaper')) {
          signalName = 'whitepaper_download';
        } else if (eventName.includes('ebook')) {
          signalName = 'ebook_download';
        }

        if (signalName) {
          await trackIntentSignal(event.workspaceId, signalName, {
            contactId: event.contactId,
            visitorId: event.visitorId,
            signalType: 'download',
            url: event.url,
            sessionId: event.sessionId,
            metadata: {
              downloadedFile: event.properties?.fileName,
            },
          }).catch(() => { });
        }
      }

      // Track video engagement
      if (event.eventType === 'video' || event.eventName?.includes('video')) {
        const percentage = event.properties?.percentage || 0;
        let signalName: string | null = null;

        if (percentage >= 1 && percentage < 50) {
          signalName = 'demo_video_started';
        } else if (percentage >= 50 && percentage < 90) {
          signalName = 'demo_video_50';
        } else if (percentage >= 90) {
          signalName = 'demo_video_completed';
        }

        if (signalName) {
          await trackIntentSignal(event.workspaceId, signalName, {
            contactId: event.contactId,
            visitorId: event.visitorId,
            signalType: 'video_watch',
            url: event.url,
            sessionId: event.sessionId,
            metadata: {
              videoPercentage: percentage,
            },
          }).catch(() => { });
        }
      }
    }
  } catch (error) {
    logger.error("Intent signal processing error", { error });
  }
}

/**
 * Extract visitor updates from events
 */
function extractVisitorUpdates(events: any[], clientIp: string, userAgent: string): Map<string, any> {
  const visitorUpdates = new Map<string, any>();

  for (const event of events) {
    const key = event.visitorId;
    if (!visitorUpdates.has(key)) {
      let websiteDomain = '';
      try {
        const url = new URL(event.url);
        websiteDomain = url.hostname;
      } catch {
        websiteDomain = event.url || '';
      }

      visitorUpdates.set(key, {
        workspaceId: event.workspaceId,
        visitorId: event.visitorId,
        sessionId: event.sessionId,
        url: event.url,
        websiteDomain,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        referrer: event.referrer,
        device: {
          userAgent: event.device?.userAgent || userAgent,
          ip: clientIp,
          screen: event.device?.screen,
          language: event.device?.language,
        },
      });
    }
  }

  return visitorUpdates;
}

// ============================================
// PUBLIC TRACKING ENDPOINTS
// Optimized for high concurrency (1000+ devices)
// ============================================

/**
 * POST /api/public/track/event
 * HIGH-PERFORMANCE batch event tracking
 * - Responds immediately (fire-and-forget for visitor updates)
 * - Uses bulk operations instead of individual queries
 * - Handles 1000+ concurrent devices
 */
// Explicit OPTIONS handler for preflight requests
router.options('/public/track/event', secureTrackingCors);

router.post('/public/track/event',
  secureTrackingCors, // CORS headers first
  trackingLimiter,    // Rate limiting second
  validateTrackingPayload,
  sanitizeTrackingData,
  logTrackingRequest,
  trackCompanyVisitor,
  async (req, res) => {
    try {
      const { events } = req.body;

      // Validation
      if (!events || !Array.isArray(events)) {
        return res.status(400).json({
          success: false,
          message: 'Events array is required',
        });
      }

      if (events.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No events to track',
          count: 0,
        });
      }

      if (events.length > 100) { // Increased from 50 to 100
        return res.status(400).json({
          success: false,
          message: 'Maximum 100 events per batch',
        });
      }

      // Get client info
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Prepare tracking events for batch insert
      const trackingEvents = events.map((event: any) => ({
        workspaceId: event.workspaceId,
        visitorId: event.visitorId,
        contactId: event.contactId,
        sessionId: event.sessionId,
        eventType: event.eventType || 'custom',
        eventName: event.eventName,
        url: event.url,
        referrer: event.referrer,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmTerm: event.utmTerm,
        utmContent: event.utmContent,
        properties: event.properties || {},
        device: {
          userAgent: event.device?.userAgent || userAgent,
          ip: clientIp,
          screen: event.device?.screen,
          language: event.device?.language,
        },
      }));

      // CRITICAL: Batch insert events (fast, ordered: false for parallel inserts)
      const insertedEvents = await TrackingEvent.insertMany(trackingEvents, {
        ordered: false,
        // lean: true, // Faster, returns plain objects
      });

      // Count page views for visitor update
      const pageViewCount = events.filter((e: any) => e.eventType === 'page_view' || e.eventType === 'pv').length;

      // Extract visitor updates
      const visitorUpdates = extractVisitorUpdates(events, clientIp, userAgent);

      // RESPOND IMMEDIATELY - don't wait for visitor updates or intent signals
      res.status(200).json({
        success: true,
        message: 'Events tracked successfully',
        count: insertedEvents.length,
      });

      // FIRE-AND-FORGET: Process visitor updates and intent signals asynchronously
      // These run AFTER the response is sent
      setImmediate(() => {
        processVisitorUpdatesAsync(visitorUpdates, pageViewCount).catch(() => { });
        processIntentSignalsAsync(events).catch(() => { });
      });

    } catch (error: any) {
      logger.error("Event tracking error", { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to track events',
        error: error.message,
      });
    }
  });

/**
 * POST /api/public/track/identify
 * Link visitorId to contactId with bulk backfill
 */
// Explicit OPTIONS handler for preflight requests
router.options('/public/track/identify', secureTrackingCors);

router.post('/public/track/identify',
  secureTrackingCors, // CORS headers first
  trackingLimiter,    // Rate limiting second
  validateTrackingPayload,
  sanitizeTrackingData,
  logTrackingRequest,
  trackCompanyVisitor,
  async (req, res) => {
    try {
      const { workspaceId, visitorId, email, properties } = req.body;

      if (!workspaceId || !visitorId || !email) {
        return res.status(400).json({
          success: false,
          message: 'workspaceId, visitorId, and email are required',
        });
      }

      // Find or create contact using findOneAndUpdate (atomic, faster)
      const contact = await Contact.findOneAndUpdate(
        { workspaceId, email },
        {
          $setOnInsert: {
            workspaceId,
            email,
            firstName: properties?.firstName,
            lastName: properties?.lastName,
            company: properties?.company,
            jobTitle: properties?.jobTitle,
            phone: properties?.phone,
            source: properties?.source || 'tracking',
            status: 'lead',
          },
        },
        { upsert: true, new: true }
      );

      // Respond immediately
      res.status(200).json({
        success: true,
        message: 'Visitor identified successfully',
        contactId: contact._id,
      });

      // Fire-AND-FORGET: Update visitor and backfill events
      setImmediate(async () => {
        try {
          // Trigger Workflow for New Contacts
          await emitWorkflowEvent('contact:created', contact, workspaceId).catch((err) => {
            logger.error("Workflow trigger error in identify", { error: err.message });
          });

          // Update visitor with contactId
          await Visitor.findOneAndUpdate(
            { workspaceId, visitorId },
            { contactId: contact._id },
            { new: true }
          );

          // Backfill all tracking events with contactId
          const updateResult = await TrackingEvent.updateMany(
            { workspaceId, visitorId, contactId: null },
            { $set: { contactId: contact._id } }
          );

          // Fire webhook
          await WebhookService.trigger(workspaceId, 'visitor.identified', {
            visitorId,
            contactId: contact._id,
            email: contact.email,
            eventsBackfilled: updateResult.modifiedCount,
          }).catch(() => { });
        } catch (error) {
          logger.error("Identify async error", { error });
        }
      });

    } catch (error: any) {
      logger.error("Identify error", { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to identify visitor',
        error: error.message,
      });
    }
  });

// ============================================
// AUTHENTICATED ENDPOINTS
// ============================================

/**
 * GET /api/workspaces/:id/tracking/visitors
 * List anonymous and identified visitors
 */
router.get('/workspaces/:id/tracking/visitors', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { page = 1, limit = 50, identified, minSessions } = req.query;

    const query: any = { workspaceId };

    if (identified === 'true') {
      query.contactId = { $exists: true, $ne: null };
    } else if (identified === 'false') {
      query.contactId = { $exists: false };
    }

    if (minSessions) {
      query.sessionCount = { $gte: parseInt(minSessions as string) };
    }

    const [visitors, total] = await Promise.all([
      Visitor.find(query)
        .populate('contactId', 'firstName lastName email company')
        .sort({ lastSeen: -1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string))
        .lean(), // Use lean() for faster read-only queries
      Visitor.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: visitors,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    logger.error("Get visitors error", { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get visitors',
      error: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id/tracking/events
 * Get tracking events with optimized pagination
 */
router.get('/workspaces/:id/tracking/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { visitorId, contactId, eventType, page = 1, limit = 100 } = req.query;

    const query: any = { workspaceId };

    if (visitorId) query.visitorId = visitorId;
    if (contactId) query.contactId = contactId;
    if (eventType) query.eventType = eventType;

    const [events, total] = await Promise.all([
      TrackingEvent.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string))
        .lean(),
      TrackingEvent.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error: any) {
    logger.error("Get events error", { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id/tracking/stats
 * Get tracking statistics with optimized aggregation
 */
router.get('/workspaces/:id/tracking/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;
    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

    // Run all queries in parallel
    const [totalVisitors, identifiedVisitors, totalEvents, eventsByType] = await Promise.all([
      Visitor.countDocuments({ workspaceId: workspaceObjectId }),
      Visitor.countDocuments({ workspaceId: workspaceObjectId, contactId: { $exists: true, $ne: null } }),
      TrackingEvent.countDocuments({ workspaceId: workspaceObjectId }),
      TrackingEvent.aggregate([
        { $match: { workspaceId: workspaceObjectId } },
        { $group: { _id: '$eventType', count: { $sum: 1 } } },
      ]),
    ]);

    const conversionRate = totalVisitors > 0 ? ((identifiedVisitors / totalVisitors) * 100).toFixed(2) : '0';

    res.status(200).json({
      success: true,
      data: {
        totalVisitors,
        anonymousVisitors: totalVisitors - identifiedVisitors,
        identifiedVisitors,
        conversionRate: parseFloat(conversionRate),
        totalEvents,
        eventsByType: eventsByType.reduce(
          (acc, item) => {
            acc[item._id] = item.count;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error: any) {
    logger.error("Get stats error", { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message,
    });
  }
});

// ============================================
// STEALTH ENDPOINTS (Ad-blocker resistant)
// Same high-performance optimizations
// ============================================

/**
 * POST /api/v1/sync
 * Disguised high-performance event tracking
 */
// Explicit OPTIONS handler for preflight requests
router.options('/v1/sync', secureTrackingCors);

router.post('/v1/sync',
  secureTrackingCors, // CORS headers first
  trackingLimiter,    // Rate limiting second
  validateTrackingPayload,
  sanitizeTrackingData,
  async (req, res) => {
    try {
      const { events } = req.body;

      if (!events || !Array.isArray(events)) {
        return res.status(400).json({ success: false, message: 'Events array is required' });
      }

      if (events.length === 0) {
        return res.status(200).json({ success: true, message: 'No events to sync', count: 0 });
      }

      if (events.length > 100) {
        return res.status(400).json({ success: false, message: 'Maximum 100 events per batch' });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      const trackingEvents = events.map((event: any) => ({
        workspaceId: event.workspaceId,
        visitorId: event.visitorId,
        contactId: event.contactId,
        sessionId: event.sessionId,
        eventType: event.eventType || 'custom',
        eventName: event.eventName,
        url: event.url,
        referrer: event.referrer,
        utmSource: event.utmSource,
        utmMedium: event.utmMedium,
        utmCampaign: event.utmCampaign,
        utmTerm: event.utmTerm,
        utmContent: event.utmContent,
        properties: event.properties || {},
        device: {
          userAgent: event.device?.userAgent || userAgent,
          ip: clientIp,
          screen: event.device?.screen,
          language: event.device?.language,
        },
      }));

      // Fast batch insert
      await TrackingEvent.insertMany(trackingEvents, { ordered: false });

      // Respond immediately
      res.status(200).json({ success: true, count: trackingEvents.length });

      // Fire-and-forget visitor updates
      const visitorUpdates = extractVisitorUpdates(events, clientIp, userAgent);
      const pageViewCount = events.filter((e: any) => e.eventType === 'pv' || e.eventType === 'page_view').length;

      setImmediate(() => {
        processVisitorUpdatesAsync(visitorUpdates, pageViewCount).catch(() => { });
      });

    } catch (error: any) {
      logger.error("Sync error", { error: error.message });
      res.status(500).json({ success: false, message: 'Sync failed' });
    }
  });

/**
 * POST /api/v1/auth
 * Disguised identify endpoint
 */
router.post('/v1/auth',
  validateTrackingPayload,
  sanitizeTrackingData,
  trackingLimiter,
  secureTrackingCors,
  async (req, res) => {
    try {
      const { workspaceId, visitorId, email, properties } = req.body;

      if (!workspaceId || !visitorId || !email) {
        return res.status(400).json({
          success: false,
          message: 'Required fields missing',
        });
      }

      // Atomic upsert
      const contact = await Contact.findOneAndUpdate(
        { workspaceId, email },
        {
          $setOnInsert: {
            workspaceId,
            email,
            firstName: properties?.firstName,
            lastName: properties?.lastName,
            company: properties?.company,
            jobTitle: properties?.jobTitle,
            phone: properties?.phone,
            source: properties?.source || 'tracking',
            status: 'lead',
          },
        },
        { upsert: true, new: true }
      );

      res.status(200).json({ success: true, id: contact._id });

      // Fire-and-forget updates
      setImmediate(async () => {
        try {
          await Visitor.findOneAndUpdate(
            { workspaceId, visitorId },
            { contactId: contact._id }
          );
          await TrackingEvent.updateMany(
            { workspaceId, visitorId, contactId: null },
            { $set: { contactId: contact._id } }
          );
        } catch { }
      });

    } catch (error: any) {
      logger.error("Auth error", { error: error.message });
      res.status(500).json({ success: false, message: 'Auth failed' });
    }
  });

/**
 * GET /cdn/px.gif
 * Ultra-fast image pixel fallback
 */
const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

router.get('/cdn/px.gif', (req, res) => {
  // Send response immediately
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(TRANSPARENT_GIF);

  // Fire-and-forget event tracking
  const { w, v, e, n, u } = req.query;
  if (w && v) {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    TrackingEvent.create({
      workspaceId: w,
      visitorId: v,
      sessionId: 'px-' + Date.now(),
      eventType: e || 'px',
      eventName: n || 'Pixel',
      url: u || '',
      device: {
        userAgent: req.headers['user-agent'],
        ip: clientIp,
      },
    }).catch(() => { }); // Silent fail
  }
});

// ============================================
// ULTRA-STEALTH CDN ENDPOINTS (AdGuard resistant)
// Disguised as static asset requests
// ============================================

/**
 * POST /cdn/fonts/woff2.json
 * Disguised as font configuration - actually handles event tracking
 * Accepts both encoded and plain payloads
 */
router.post('/cdn/fonts/woff2.json',
  trackingLimiter,
  secureTrackingCors,
  async (req, res) => {
    try {
      // Decode payload if encoded
      const decoded = decodeStealthPayload(req.body);
      const events = decoded.q || decoded.events || [];

      if (!Array.isArray(events) || events.length === 0) {
        return res.status(200).json({ status: 'ok', loaded: 0 });
      }

      if (events.length > 100) {
        return res.status(200).json({ status: 'ok', loaded: 100 });
      }

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Map stealth events to standard format
      const trackingEvents = events.map((event: any) => mapStealthEvent(event, clientIp, userAgent));

      // Fast batch insert
      await TrackingEvent.insertMany(trackingEvents, { ordered: false });

      // Respond with innocent-looking response
      res.status(200).json({
        status: 'ok',
        loaded: trackingEvents.length,
        cache: 'hit'
      });

      // Fire-and-forget visitor updates
      const visitorUpdates = extractVisitorUpdates(
        trackingEvents.map((e: any) => ({
          ...e,
          device: { userAgent, ip: clientIp }
        })),
        clientIp,
        userAgent
      );
      const pageViewCount = trackingEvents.filter((e: any) => e.eventType === 'page_view').length;

      setImmediate(() => {
        processVisitorUpdatesAsync(visitorUpdates, pageViewCount).catch(() => { });
      });

    } catch (error: any) {
      // Return success even on error to avoid detection
      res.status(200).json({ status: 'ok', cache: 'miss' });
    }
  });

/**
 * POST /cdn/assets/manifest.json
 * Disguised as asset manifest - actually handles identify requests
 */
router.post('/cdn/assets/manifest.json',
  trackingLimiter,
  secureTrackingCors,
  async (req, res) => {
    try {
      // Decode payload if encoded
      const decoded = decodeStealthPayload(req.body);
      const data = mapStealthIdentify(decoded);

      const { workspaceId, visitorId, email, properties } = data;

      if (!workspaceId || !visitorId || !email) {
        return res.status(200).json({ status: 'ok', verified: false });
      }

      // Atomic upsert
      const contact = await Contact.findOneAndUpdate(
        { workspaceId, email },
        {
          $setOnInsert: {
            workspaceId,
            email,
            firstName: properties?.firstName,
            lastName: properties?.lastName,
            company: properties?.company,
            phone: properties?.phone,
            source: 'stealth',
            status: 'lead',
          },
        },
        { upsert: true, new: true }
      );

      // Innocent-looking response
      res.status(200).json({
        status: 'ok',
        verified: true,
        version: '2.0'
      });

      // Fire-and-forget updates
      setImmediate(async () => {
        try {
          await Visitor.findOneAndUpdate(
            { workspaceId, visitorId },
            { contactId: contact._id }
          );
          await TrackingEvent.updateMany(
            { workspaceId, visitorId, contactId: null },
            { $set: { contactId: contact._id } }
          );
        } catch { }
      });

    } catch (error: any) {
      // Return success even on error
      res.status(200).json({ status: 'ok', verified: false });
    }
  });

/**
 * GET /cdn/img/s.gif
 * Alternative pixel endpoint with innocent path
 */
router.get('/cdn/img/s.gif', (req, res) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(TRANSPARENT_GIF);

  const { w, u, e, n, l } = req.query;
  if (w && u) {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    TrackingEvent.create({
      workspaceId: w,
      visitorId: u,
      sessionId: 'px-' + Date.now(),
      eventType: mapEventType(e as string || 'px'),
      eventName: mapEventName(n as string || 'P'),
      url: l || '',
      device: {
        userAgent: req.headers['user-agent'],
        ip: clientIp,
      },
    }).catch(() => { });
  }
});

export default router;
