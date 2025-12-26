import express from 'express';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import TrackingEvent from '../models/TrackingEvent';
import Visitor from '../models/Visitor';
import Contact from '../models/Contact';
import { authenticate, AuthRequest } from '../middleware/auth';
import WebhookService from '../services/WebhookService';

const router = express.Router();

// Rate limiter for public tracking endpoints
const trackingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: 'Too many tracking requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/public/track/event
 * Batch insert tracking events
 * No authentication required (public endpoint)
 */
router.post('/public/track/event', trackingLimiter, async (req, res) => {
  try {
    const { events } = req.body;

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

    if (events.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 50 events per batch',
      });
    }

    // Get client IP
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';

    // Process each event
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
        userAgent: event.device?.userAgent || req.headers['user-agent'],
        ip: clientIp,
        screen: event.device?.screen,
        language: event.device?.language,
      },
    }));

    // Batch insert
    const insertedEvents = await TrackingEvent.insertMany(trackingEvents, { ordered: false });

    // Update or create Visitor record for each unique visitor
    const visitorUpdates = new Map<string, any>();

    for (const event of events) {
      const key = event.visitorId;
      if (!visitorUpdates.has(key)) {
        visitorUpdates.set(key, {
          workspaceId: event.workspaceId,
          visitorId: event.visitorId,
          sessionId: event.sessionId,
          utmSource: event.utmSource,
          utmMedium: event.utmMedium,
          utmCampaign: event.utmCampaign,
          referrer: event.referrer,
          device: {
            userAgent: event.device?.userAgent || req.headers['user-agent'],
            ip: clientIp,
            screen: event.device?.screen,
            language: event.device?.language,
          },
        });
      }
    }

    // Update visitors in parallel
    await Promise.all(
      Array.from(visitorUpdates.values()).map(async (update) => {
        const visitor = await Visitor.findOne({
          workspaceId: update.workspaceId,
          visitorId: update.visitorId,
        });

        if (visitor) {
          // Update existing visitor
          visitor.lastSeen = new Date();
          visitor.eventCount += 1;

          // Update last UTM params
          if (update.utmSource) visitor.lastUtmSource = update.utmSource;
          if (update.utmMedium) visitor.lastUtmMedium = update.utmMedium;
          if (update.utmCampaign) visitor.lastUtmCampaign = update.utmCampaign;
          if (update.referrer) visitor.lastSource = update.referrer;

          // Check if this is a new session (different sessionId)
          const hasSession = visitor.devices.some((d) => d.ip === update.device.ip);
          if (!hasSession) {
            visitor.sessionCount += 1;
          }

          // Update or add device
          const deviceIndex = visitor.devices.findIndex((d) => d.ip === update.device.ip);
          if (deviceIndex >= 0) {
            visitor.devices[deviceIndex].lastSeen = new Date();
            visitor.devices[deviceIndex].userAgent = update.device.userAgent;
          } else {
            visitor.devices.push({
              ...update.device,
              lastSeen: new Date(),
            });
          }

          await visitor.save();
        } else {
          // Create new visitor
          await Visitor.create({
            workspaceId: update.workspaceId,
            visitorId: update.visitorId,
            firstSeen: new Date(),
            lastSeen: new Date(),
            firstSource: update.referrer,
            lastSource: update.referrer,
            firstUtmSource: update.utmSource,
            firstUtmMedium: update.utmMedium,
            firstUtmCampaign: update.utmCampaign,
            lastUtmSource: update.utmSource,
            lastUtmMedium: update.utmMedium,
            lastUtmCampaign: update.utmCampaign,
            sessionCount: 1,
            eventCount: 1,
            pageViewCount: events.filter((e: any) => e.eventType === 'page_view').length,
            devices: [
              {
                ...update.device,
                lastSeen: new Date(),
              },
            ],
          });
        }
      })
    );

    res.status(200).json({
      success: true,
      message: 'Events tracked successfully',
      count: insertedEvents.length,
    });
  } catch (error: any) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track events',
      error: error.message,
    });
  }
});

/**
 * POST /api/public/track/identify
 * Link visitorId to contactId
 * Backfill all TrackingEvents with contactId
 */
router.post('/public/track/identify', trackingLimiter, async (req, res) => {
  try {
    const { workspaceId, visitorId, email, properties } = req.body;

    if (!workspaceId || !visitorId || !email) {
      return res.status(400).json({
        success: false,
        message: 'workspaceId, visitorId, and email are required',
      });
    }

    // Find or create contact
    let contact = await Contact.findOne({ workspaceId, email });

    if (!contact) {
      // Create new contact
      contact = await Contact.create({
        workspaceId,
        email,
        firstName: properties?.firstName,
        lastName: properties?.lastName,
        company: properties?.company,
        jobTitle: properties?.jobTitle,
        phone: properties?.phone,
        source: properties?.source || 'tracking',
        status: 'lead',
      });
    }

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
    try {
      await WebhookService.trigger(workspaceId, 'visitor.identified', {
        visitorId,
        contactId: contact._id,
        email: contact.email,
        eventsBackfilled: updateResult.modifiedCount,
      });
    } catch (webhookError) {
      console.error('Webhook error:', webhookError);
      // Don't fail the request if webhook fails
    }

    res.status(200).json({
      success: true,
      message: 'Visitor identified successfully',
      contactId: contact._id,
      eventsBackfilled: updateResult.modifiedCount,
    });
  } catch (error: any) {
    console.error('Identify error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to identify visitor',
      error: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id/tracking/visitors
 * List anonymous and identified visitors
 * Authentication required
 */
router.get('/workspaces/:id/tracking/visitors', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { page = 1, limit = 50, identified, minSessions } = req.query;

    const query: any = { workspaceId };

    // Filter by identified status
    if (identified === 'true') {
      query.contactId = { $exists: true, $ne: null };
    } else if (identified === 'false') {
      query.contactId = { $exists: false };
    }

    // Filter by minimum session count
    if (minSessions) {
      query.sessionCount = { $gte: parseInt(minSessions as string) };
    }

    const visitors = await Visitor.find(query)
      .populate('contactId', 'firstName lastName email company')
      .sort({ lastSeen: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Visitor.countDocuments(query);

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
    console.error('Get visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get visitors',
      error: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id/tracking/events
 * Get tracking events for a visitor or contact
 * Authentication required
 */
router.get('/workspaces/:id/tracking/events', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { visitorId, contactId, eventType, page = 1, limit = 100 } = req.query;

    const query: any = { workspaceId };

    if (visitorId) {
      query.visitorId = visitorId;
    }

    if (contactId) {
      query.contactId = contactId;
    }

    if (eventType) {
      query.eventType = eventType;
    }

    const events = await TrackingEvent.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await TrackingEvent.countDocuments(query);

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
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get events',
      error: error.message,
    });
  }
});

/**
 * GET /api/workspaces/:id/tracking/stats
 * Get tracking statistics
 * Authentication required
 */
router.get('/workspaces/:id/tracking/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id: workspaceId } = req.params;

    const workspaceObjectId = new mongoose.Types.ObjectId(workspaceId);

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
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message,
    });
  }
});

export default router;
