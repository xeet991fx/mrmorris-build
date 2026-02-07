import express, { Request, Response } from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Workflow from "../models/Workflow";
import Contact from "../models/Contact";
import Activity from "../models/Activity";
import Campaign from "../models/Campaign";
import EmailMessage from "../models/EmailMessage";
import { authenticate } from "../middleware/auth";
import { workflowService } from "../services/workflow";
import leadScoringService from "../services/leadScoring";
import { lookupIP } from "../services/GeoIPService";

const router = express.Router();

// ============================================
// SESSION DEDUPLICATION
// ============================================

// Cache for recent opens to deduplicate within short time windows
const recentOpensCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 60 * 1000; // 1 minute deduplication window

/**
 * Generate a session fingerprint for deduplication
 */
function generateSessionFingerprint(ip: string, userAgent: string, trackingId: string): string {
    const data = `${ip}:${userAgent}:${trackingId}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

/**
 * Check if this is a duplicate open within the deduplication window
 */
function isDuplicateOpen(fingerprint: string): boolean {
    const lastSeen = recentOpensCache.get(fingerprint);
    const now = Date.now();

    // Clean up old entries periodically
    if (recentOpensCache.size > 10000) {
        for (const [key, timestamp] of recentOpensCache) {
            if (now - timestamp > DEDUP_WINDOW_MS) {
                recentOpensCache.delete(key);
            }
        }
    }

    if (lastSeen && (now - lastSeen) < DEDUP_WINDOW_MS) {
        return true;
    }

    recentOpensCache.set(fingerprint, now);
    return false;
}

// ============================================
// HMAC SIGNING FOR TRACKING IDS
// ============================================

// SECURITY: Require explicit secret in production, warn in dev
const TRACKING_SECRET = process.env.TRACKING_HMAC_SECRET || process.env.JWT_SECRET;
if (!TRACKING_SECRET) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("FATAL: TRACKING_HMAC_SECRET or JWT_SECRET must be set in production");
    }
    console.warn("[SECURITY WARNING] No TRACKING_HMAC_SECRET set - using insecure dev default");
}
const EFFECTIVE_SECRET = TRACKING_SECRET || "dev-only-insecure-secret";

/**
 * Sign a tracking ID with HMAC-SHA256 to prevent tampering.
 */
function signTrackingId(data: string): string {
    const payload = Buffer.from(data).toString("base64url");
    const signature = crypto
        .createHmac("sha256", EFFECTIVE_SECRET)
        .update(payload)
        .digest("base64url");
    return `${payload}.${signature}`;
}

/**
 * Verify and decode a signed tracking ID.
 * Returns null if the signature is invalid.
 */
function verifyTrackingId(trackingId: string): string | null {
    const dotIndex = trackingId.lastIndexOf(".");
    if (dotIndex === -1) {
        // Legacy unsigned tracking ID — accept but log warning
        try {
            return Buffer.from(trackingId, "base64").toString("utf-8");
        } catch {
            return null;
        }
    }

    const payload = trackingId.substring(0, dotIndex);
    const signature = trackingId.substring(dotIndex + 1);

    const expectedSignature = crypto
        .createHmac("sha256", EFFECTIVE_SECRET)
        .update(payload)
        .digest("base64url");

    // SECURITY FIX: Length guard prevents timingSafeEqual from throwing on mismatched lengths
    const sigBuffer = Buffer.from(signature, "base64url");
    const expectedBuffer = Buffer.from(expectedSignature, "base64url");

    if (sigBuffer.length !== expectedBuffer.length) {
        console.warn("[SECURITY] Tracking ID signature length mismatch");
        return null;
    }

    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
        console.warn("[SECURITY] Invalid tracking ID signature detected");
        return null;
    }

    try {
        return Buffer.from(payload, "base64url").toString("utf-8");
    } catch {
        return null;
    }
}

// ============================================
// BOT DETECTION
// ============================================

const BOT_USER_AGENTS = [
    "googlebot", "bingbot", "yandexbot", "baiduspider",
    "google-safety", "google-extended",
    "barracuda", "barracudacentral",
    "protection.outlook.com", "ms-office",
    "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36", // common scanner pattern
    "wget", "curl", "python-requests", "java/", "go-http-client",
    "facebookexternalhit", "twitterbot", "linkedinbot",
    "slackbot", "whatsapp", "telegrambot",
    "mimecast", "proofpoint", "fireeye", "symantec",
    "phishme", "agentbank", "barracuda",
];

// Apple Mail Privacy Protection pre-fetches all images
const APPLE_PRIVACY_AGENTS = [
    "apple mail", "cfnetwork",
];

/**
 * Detect if the request comes from a bot/crawler
 */
function detectBot(userAgent: string): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return BOT_USER_AGENTS.some(bot => ua.includes(bot));
}

/**
 * Detect Apple Mail Privacy Protection (separate from bots)
 * These are real users but opens are pre-fetched and unreliable
 */
function detectApplePrivacy(userAgent: string): boolean {
    if (!userAgent) return false;
    const ua = userAgent.toLowerCase();
    return APPLE_PRIVACY_AGENTS.some(agent => ua.includes(agent));
}

/**
 * Parse user agent to extract device/browser/OS info
 */
function parseUserAgent(userAgent: string): { device: string; browser: string; os: string } {
    const ua = userAgent.toLowerCase();

    // Device detection
    let device = 'desktop';
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        device = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
        device = 'tablet';
    }

    // Browser detection
    let browser = 'unknown';
    if (ua.includes('chrome') && !ua.includes('edge')) browser = 'chrome';
    else if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
    else if (ua.includes('edge')) browser = 'edge';
    else if (ua.includes('outlook')) browser = 'outlook';

    // OS detection
    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac os') || ua.includes('macos')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'ios';

    return { device, browser, os };
}

/**
 * Email Tracking API Routes
 */

// ============================================
// GET TRACKING STATS
// ============================================

/**
 * @route   GET /api/email-tracking/stats/:workspaceId
 * @desc    Get email tracking statistics for a workspace
 * @access  Private
 */
router.get("/stats/:workspaceId", authenticate, async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { start, end } = req.query;

        // Build date filter if provided
        const matchFilter: any = { workspaceId: new mongoose.Types.ObjectId(workspaceId) };
        if (start || end) {
            matchFilter.sentAt = {};
            if (start) matchFilter.sentAt.$gte = new Date(start as string);
            if (end) matchFilter.sentAt.$lte = new Date(end as string);
        }

        // Use aggregation pipeline for efficient stats calculation
        const [stats] = await EmailMessage.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalSent: { $sum: 1 },
                    totalOpened: { $sum: { $cond: ["$opened", 1, 0] } },
                    totalClicked: { $sum: { $cond: ["$clicked", 1, 0] } },
                    totalReplied: { $sum: { $cond: ["$replied", 1, 0] } },
                    totalBounced: { $sum: { $cond: ["$bounced", 1, 0] } },
                    totalUnsubscribed: { $sum: { $cond: ["$unsubscribed", 1, 0] } },
                    totalOpens: { $sum: { $ifNull: ["$openCount", 0] } },
                    totalClicks: { $sum: { $ifNull: ["$totalClickCount", 0] } },
                },
            },
        ]);

        const totalSent = stats?.totalSent || 0;
        const totalOpened = stats?.totalOpened || 0;
        const totalClicked = stats?.totalClicked || 0;
        const totalReplied = stats?.totalReplied || 0;
        const totalBounced = stats?.totalBounced || 0;
        const totalUnsubscribed = stats?.totalUnsubscribed || 0;

        res.json({
            success: true,
            data: {
                totalSent,
                totalOpened,
                totalClicked,
                totalReplied,
                totalBounced,
                totalUnsubscribed,
                // Unique-based rates
                openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
                clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
                replyRate: totalSent > 0 ? (totalReplied / totalSent) * 100 : 0,
                bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
                // Total counts (including repeat opens/clicks)
                totalOpenEvents: stats?.totalOpens || 0,
                totalClickEvents: stats?.totalClicks || 0,
            },
        });
    } catch (error: any) {
        console.error("Get tracking stats error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// GET CAMPAIGN PERFORMANCE
// ============================================

/**
 * @route   GET /api/email-tracking/campaigns/:workspaceId
 * @desc    Get campaign performance data
 * @access  Private
 */
router.get("/campaigns/:workspaceId", authenticate, async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const campaigns = await Campaign.find({ workspaceId }).sort({ createdAt: -1 });

        const performanceData = campaigns.map((campaign) => {
            const sent = campaign.stats?.sent || 0;
            const opened = campaign.stats?.opened || 0;
            const clicked = campaign.stats?.clicked || 0;
            const replied = campaign.stats?.replied || 0;

            return {
                campaignId: campaign._id,
                campaignName: campaign.name,
                sent,
                opened,
                clicked,
                replied,
                openRate: sent > 0 ? (opened / sent) * 100 : 0,
                clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
                replyRate: sent > 0 ? (replied / sent) * 100 : 0,
            };
        });

        res.json({
            success: true,
            campaigns: performanceData,
        });
    } catch (error: any) {
        console.error("Get campaign performance error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Email Tracking Webhook Routes
 * 
 * Handles email open and click tracking events.
 * These events can trigger workflows with email_opened/email_clicked triggers.
 */

// ============================================
// TRACKING PIXEL (Email Open)
// ============================================

/**
 * @route   GET /api/email-tracking/open/:trackingId
 * @desc    Track email opens via tracking pixel
 * @access  Public (uses HMAC-signed tracking ID)
 * 
 * The trackingId is HMAC-signed: base64url(workspaceId:contactId:emailType:campaignId:timestamp).signature
 */
router.get("/open/:trackingId", async (req: Request, res: Response) => {
    try {
        const { trackingId } = req.params;

        // Verify HMAC signature (also supports legacy unsigned IDs)
        const decoded = verifyTrackingId(trackingId);
        if (!decoded) {
            console.warn("[SECURITY] Rejected invalid/tampered tracking ID");
            return sendTrackingPixel(res);
        }

        const parts = decoded.split(":");
        const workspaceId = parts[0];
        const contactId = parts[1];
        const emailType = parts[2];
        const campaignId = parts[3];

        if (!workspaceId || !contactId) {
            return sendTrackingPixel(res);
        }

        // Capture metadata
        const userAgent = req.headers["user-agent"]?.toString() || "";
        // NOTE: x-forwarded-for can be spoofed. Configure trusted proxies in Express for accurate IPs.
        // See: https://expressjs.com/en/guide/behind-proxies.html
        const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || "";
        const isBot = detectBot(userAgent);
        const isApplePrivacy = detectApplePrivacy(userAgent);
        const parsedUA = parseUserAgent(userAgent);

        // Session-based deduplication - skip if same fingerprint within 1 minute
        const fingerprint = generateSessionFingerprint(ipAddress, userAgent, trackingId);
        const isDupe = isDuplicateOpen(fingerprint);

        if (isDupe) {
            console.log(`📧 Duplicate open skipped (same session within 1min): contact=${contactId}`);
            return sendTrackingPixel(res);
        }

        // Log the open event
        console.log(`📧 Email opened: contact=${contactId}, type=${emailType}, campaign=${campaignId}, bot=${isBot}, applePrivacy=${isApplePrivacy}`);

        // Get contact
        const contact = await Contact.findById(contactId);
        if (!contact) {
            console.warn(`⚠️ Contact not found for tracking ID: ${contactId}`);
            return sendTrackingPixel(res);
        }

        // Find the EmailMessage by trackingId first (most reliable), fall back to other lookups
        let emailMessage = await EmailMessage.findOne({ trackingId });

        if (!emailMessage && emailType === "campaign" && campaignId) {
            emailMessage = await EmailMessage.findOne({ campaignId, contactId });
        } else if (!emailMessage && emailType === "workflow") {
            emailMessage = await EmailMessage.findOne({
                workspaceId,
                contactId,
                source: "workflow",
            }).sort({ sentAt: -1 });
        }

        if (!emailMessage) {
            console.warn(`⚠️ EmailMessage not found for valid tracking ID: ${trackingId}, contact=${contactId}`);
            return sendTrackingPixel(res);
        }

        const isFirstOpen = !emailMessage.opened;

        // Lookup geolocation (async, non-blocking - use cached if available)
        let geoData: { country?: string; countryCode?: string; city?: string; timezone?: string } = {};
        try {
            const geo = await lookupIP(ipAddress);
            if (geo) {
                geoData = {
                    country: geo.country,
                    countryCode: geo.countryCode,
                    city: geo.city,
                    timezone: geo.timezone,
                };
            }
        } catch (err) {
            console.warn('[Tracking] GeoIP lookup failed:', err);
        }

        // Update EmailMessage with open event and get updated document
        const updatedMessage = await EmailMessage.findByIdAndUpdate(
            emailMessage._id,
            {
                $set: {
                    opened: true,
                    openedAt: emailMessage.openedAt || new Date(),
                    lastOpenedAt: new Date(),
                },
                $inc: { openCount: 1 },
                $push: {
                    opens: {
                        openedAt: new Date(),
                        userAgent,
                        ipAddress,
                        isBot,
                        isApplePrivacy,
                        device: parsedUA.device,
                        browser: parsedUA.browser,
                        os: parsedUA.os,
                        ...geoData,
                    },
                },
            },
            { new: true } // Return updated document for accurate openCount
        );

        // BUG FIX: Use atomic update for campaign stats to prevent race conditions
        if (isFirstOpen && !isBot && !isApplePrivacy && emailType === "campaign" && campaignId) {
            await Campaign.findByIdAndUpdate(campaignId, {
                $inc: { "stats.opened": 1 },
            });
        }

        // Use correct openCount from updated document
        console.log(`📊 Recorded open #${updatedMessage?.openCount || 1} for EmailMessage ${emailMessage._id}`);

        // Only log activity, update score, trigger workflows on FIRST non-bot/non-Apple-privacy open
        if (isFirstOpen && !isBot && !isApplePrivacy) {
            // Log activity
            await Activity.create({
                workspaceId,
                entityType: "contact",
                entityId: contactId,
                type: "email",
                title: "Email Opened",
                description: `Contact opened ${emailType || "automated"} email`,
                metadata: {
                    emailType,
                    campaignId,
                    openedAt: new Date(),
                    trackingId,
                    userAgent,
                    ipAddress,
                    device: parsedUA.device,
                    browser: parsedUA.browser,
                    os: parsedUA.os,
                },
            });

            // Update lead score
            try {
                await leadScoringService.updateLeadScore(workspaceId, contactId, "email_opened");
            } catch (error) {
                console.error("Failed to update lead score:", error);
            }

            // Trigger workflows
            try {
                await workflowService.checkAndEnroll("email_opened", contact, workspaceId);
            } catch (error) {
                console.error("Failed to trigger email_opened workflows:", error);
            }
        } else if (!isFirstOpen) {
            console.log(`📧 Repeat open (#${updatedMessage?.openCount || 1}) recorded for ${contactId}`);
        } else if (isBot) {
            console.log(`🤖 Bot open detected and recorded (no score/workflow update)`);
        } else if (isApplePrivacy) {
            console.log(`🍎 Apple Mail Privacy open detected and recorded (no score/workflow update)`);
        }

        sendTrackingPixel(res);
    } catch (error) {
        console.error("Email open tracking error:", error);
        sendTrackingPixel(res);
    }
});

// ============================================
// LINK CLICK TRACKING
// ============================================

/**
 * @route   GET /api/email-tracking/click/:trackingId
 * @desc    Track email link clicks
 * @access  Public (uses HMAC-signed tracking ID)
 * 
 * Query params:
 * - url: The actual URL to redirect to (base64 encoded)
 * 
 * The trackingId is HMAC-signed: base64url(workspaceId:contactId:emailType:campaignId:timestamp).signature
 */
router.get("/click/:trackingId", async (req: Request, res: Response) => {
    try {
        const { trackingId } = req.params;
        const { url } = req.query;

        // Verify HMAC signature
        const decoded = verifyTrackingId(trackingId);
        if (!decoded) {
            console.warn("[SECURITY] Rejected invalid/tampered click tracking ID");
            // Try to redirect anyway if URL is available
            if (url) {
                try {
                    return res.redirect(Buffer.from(url as string, "base64").toString("utf-8"));
                } catch {
                    return res.redirect(url as string);
                }
            }
            return res.status(400).send("Invalid tracking link");
        }

        const parts = decoded.split(":");
        const workspaceId = parts[0];
        const contactId = parts[1];
        const emailType = parts[2];
        const campaignId = parts[3];

        // Decode destination URL
        let destinationUrl = "https://example.com"; // Fallback
        if (url) {
            try {
                // Try base64url first (new format), then fall back to base64 (legacy)
                destinationUrl = Buffer.from(url as string, "base64url").toString("utf-8");
            } catch {
                try {
                    destinationUrl = Buffer.from(url as string, "base64").toString("utf-8");
                } catch {
                    destinationUrl = url as string;
                }
            }
        }

        if (!workspaceId || !contactId) {
            return res.redirect(destinationUrl);
        }

        // Capture metadata
        const userAgent = req.headers["user-agent"]?.toString() || "";
        // NOTE: x-forwarded-for can be spoofed. Configure trusted proxies in Express for accurate IPs.
        // See: https://expressjs.com/en/guide/behind-proxies.html
        const ipAddress = req.ip || req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || "";
        const isBot = detectBot(userAgent);
        const parsedUA = parseUserAgent(userAgent);

        console.log(`🔗 Email link clicked: contact=${contactId}, campaign=${campaignId}, bot=${isBot}`);

        // Get contact
        const contact = await Contact.findById(contactId);
        if (!contact) {
            return res.redirect(destinationUrl);
        }

        // Find EmailMessage by trackingId first (most reliable)
        let emailMessage = await EmailMessage.findOne({ trackingId });

        if (!emailMessage && emailType === "campaign" && campaignId) {
            emailMessage = await EmailMessage.findOne({ campaignId, contactId });
        } else if (!emailMessage && emailType === "workflow") {
            emailMessage = await EmailMessage.findOne({
                workspaceId,
                contactId,
                source: "workflow",
            }).sort({ sentAt: -1 });
        }

        // Lookup geolocation
        let geoData: { country?: string; countryCode?: string; city?: string; timezone?: string } = {};
        try {
            const geo = await lookupIP(ipAddress);
            if (geo) {
                geoData = {
                    country: geo.country,
                    countryCode: geo.countryCode,
                    city: geo.city,
                    timezone: geo.timezone,
                };
            }
        } catch (err) {
            console.warn('[Tracking] GeoIP lookup failed:', err);
        }

        let isFirstClick = false;

        if (emailMessage) {
            isFirstClick = !emailMessage.clicked;

            const existingLinkClick = emailMessage.linkClicks?.find(lc => lc.url === destinationUrl);

            if (existingLinkClick) {
                // Increment click count for this link
                await EmailMessage.findOneAndUpdate(
                    { _id: emailMessage._id, "linkClicks.url": destinationUrl },
                    {
                        $inc: {
                            "linkClicks.$.clickCount": 1,
                            totalClickCount: 1,
                        },
                        $set: {
                            "linkClicks.$.clickedAt": new Date(),
                            "linkClicks.$.userAgent": userAgent,
                            "linkClicks.$.ipAddress": ipAddress,
                            "linkClicks.$.isBot": isBot,
                            "linkClicks.$.device": parsedUA.device,
                            "linkClicks.$.browser": parsedUA.browser,
                            "linkClicks.$.os": parsedUA.os,
                            "linkClicks.$.country": geoData.country,
                            "linkClicks.$.countryCode": geoData.countryCode,
                            "linkClicks.$.city": geoData.city,
                            "linkClicks.$.timezone": geoData.timezone,
                            lastClickedAt: new Date(),
                        },
                    }
                );
            } else {
                // First click on this specific link
                const updateOps: any = {
                    $set: {
                        clicked: true,
                        clickedAt: emailMessage.clickedAt || new Date(),
                        lastClickedAt: new Date(),
                    },
                    $inc: { totalClickCount: 1 },
                    $push: {
                        linkClicks: {
                            url: destinationUrl,
                            clickedAt: new Date(),
                            clickCount: 1,
                            userAgent,
                            ipAddress,
                            isBot,
                            device: parsedUA.device,
                            browser: parsedUA.browser,
                            os: parsedUA.os,
                            ...geoData,
                        },
                    },
                };

                await EmailMessage.findByIdAndUpdate(emailMessage._id, updateOps);
            }

            // Update campaign stats only on first overall non-bot click
            if (isFirstClick && !isBot && emailType === "campaign" && campaignId) {
                await Campaign.findByIdAndUpdate(campaignId, {
                    $inc: { "stats.clicked": 1 },
                });
            }

            console.log(`📊 Recorded click for EmailMessage ${emailMessage._id}, link: ${destinationUrl}`);
        }

        // Only log activity and update score on FIRST non-bot click
        if (isFirstClick && !isBot) {
            await Activity.create({
                workspaceId,
                entityType: "contact",
                entityId: contactId,
                type: "email",
                title: "Email Link Clicked",
                description: `Contact clicked link in ${emailType || "automated"} email`,
                metadata: {
                    emailType,
                    campaignId,
                    destinationUrl,
                    clickedAt: new Date(),
                    trackingId,
                    userAgent,
                    ipAddress,
                },
            });

            try {
                await leadScoringService.updateLeadScore(workspaceId, contactId, "email_clicked");
            } catch (error) {
                console.error("Failed to update lead score:", error);
            }

            try {
                await workflowService.checkAndEnroll("email_clicked", contact, workspaceId);
            } catch (error) {
                console.error("Failed to trigger email_clicked workflows:", error);
            }
        } else if (isBot) {
            console.log(`🤖 Bot click detected and recorded (no score/workflow update)`);
        }

        // Redirect to actual destination
        res.redirect(destinationUrl);
    } catch (error) {
        console.error("Email click tracking error:", error);
        const { url } = req.query;
        if (url) {
            try {
                return res.redirect(Buffer.from(url as string, "base64").toString("utf-8"));
            } catch {
                return res.redirect(url as string);
            }
        }
        res.status(500).send("Tracking error");
    }
});

// ============================================
// WEBHOOK ENDPOINT (For email providers)
// ============================================

// Webhook secret for signature verification
const WEBHOOK_SECRET = process.env.WEBHOOK_SIGNING_SECRET || process.env.SENDGRID_WEBHOOK_KEY;

/**
 * Verify webhook signature from email providers
 * Supports SendGrid and Mailgun signature formats
 */
function verifyWebhookSignature(req: Request): boolean {
    // SendGrid: X-Twilio-Email-Event-Webhook-Signature header
    const sendgridSignature = req.headers["x-twilio-email-event-webhook-signature"] as string;
    const sendgridTimestamp = req.headers["x-twilio-email-event-webhook-timestamp"] as string;

    // Mailgun: uses different header pattern
    const mailgunSignature = req.headers["x-mailgun-signature"] as string;

    if (!WEBHOOK_SECRET) {
        if (process.env.NODE_ENV === "production") {
            console.error("[SECURITY] WEBHOOK_SIGNING_SECRET not set - rejecting webhook");
            return false;
        }
        console.warn("[SECURITY WARNING] No WEBHOOK_SIGNING_SECRET - allowing unsigned webhooks in dev");
        return true;
    }

    // SendGrid verification
    if (sendgridSignature && sendgridTimestamp) {
        try {
            const payload = sendgridTimestamp + JSON.stringify(req.body);
            const expectedSignature = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(payload)
                .digest("base64");

            const sigBuffer = Buffer.from(sendgridSignature, "base64");
            const expectedBuffer = Buffer.from(expectedSignature, "base64");

            if (sigBuffer.length !== expectedBuffer.length) return false;
            return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
        } catch (err) {
            console.error("[SECURITY] SendGrid signature verification failed:", err);
            return false;
        }
    }

    // Mailgun verification (JSON format)
    if (mailgunSignature) {
        try {
            const sigData = JSON.parse(mailgunSignature);
            const { timestamp, token, signature } = sigData;
            const expectedSignature = crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(timestamp + token)
                .digest("hex");

            return signature === expectedSignature;
        } catch (err) {
            console.error("[SECURITY] Mailgun signature verification failed:", err);
            return false;
        }
    }

    // No recognized signature in production = reject
    if (process.env.NODE_ENV === "production") {
        console.error("[SECURITY] No valid signature header found");
        return false;
    }

    return true; // Allow in development
}

/**
 * @route   POST /api/email-tracking/webhook
 * @desc    Receive webhook events from email providers (SendGrid, Mailgun, etc.)
 * @access  Secured with signature verification
 */
router.post("/webhook", async (req: Request, res: Response) => {
    // CRITICAL: Verify webhook signature before processing
    if (!verifyWebhookSignature(req)) {
        console.error("[SECURITY] Webhook signature verification failed - rejecting request");
        return res.status(401).json({ error: "Invalid webhook signature" });
    }

    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];

        for (const event of events) {
            const eventType = event.event || event.type;
            const contactEmail = event.email || event.recipient;
            const metadata = event.metadata || event.custom_args || {};
            const providerMessageId = event.sg_message_id || event["Message-Id"] || event.message_id || "";
            const providerEventId = event.sg_event_id || event.id || "";

            if (!eventType || !contactEmail) {
                continue;
            }


            // Deduplication: check if we've already processed this exact event
            if (providerEventId) {
                const existingActivity = await Activity.findOne({
                    "metadata.providerEventId": providerEventId,
                });
                if (existingActivity) {
                    console.log(`📧 Webhook duplicate skipped: ${providerEventId}`);
                    continue;
                }
            }

            // Find contact by email
            const contact = await Contact.findOne({ email: contactEmail });
            if (!contact) {
                console.log(`Contact not found for email: ${contactEmail}`);
                continue;
            }

            const workspaceId = contact.workspaceId?.toString();
            if (!workspaceId) {
                continue;
            }

            // Map provider events to our event types
            let internalEventType: string | null = null;
            switch (eventType.toLowerCase()) {
                case "open":
                case "opened":
                    internalEventType = "email_opened";
                    break;
                case "click":
                case "clicked":
                    internalEventType = "email_clicked";
                    break;
                case "delivered":
                    internalEventType = "email_delivered";
                    break;
                case "bounced":
                case "bounce":
                    internalEventType = "email_bounced";
                    break;
                case "unsubscribed":
                case "unsubscribe":
                    internalEventType = "email_unsubscribed";
                    break;
            }

            if (!internalEventType) {
                continue;
            }

            console.log(`📧 Webhook event: ${internalEventType} for ${contactEmail}`);

            // Update EmailMessage record based on event type
            const emailMessageFilter: any = { workspaceId, contactId: contact._id };
            if (providerMessageId) {
                emailMessageFilter.messageId = providerMessageId;
            } else {
                // Fall back to most recent email to this contact
                const latestEmail = await EmailMessage.findOne({
                    workspaceId,
                    contactId: contact._id,
                }).sort({ sentAt: -1 });

                if (latestEmail) {
                    emailMessageFilter._id = latestEmail._id;
                }
            }

            switch (internalEventType) {
                case "email_opened": {
                    const msg = await EmailMessage.findOne(emailMessageFilter);
                    if (msg) {
                        await EmailMessage.findByIdAndUpdate(msg._id, {
                            $set: {
                                opened: true,
                                openedAt: msg.openedAt || new Date(),
                                lastOpenedAt: new Date(),
                            },
                            $inc: { openCount: 1 },
                            $push: {
                                opens: {
                                    openedAt: new Date(),
                                    userAgent: event.useragent || event.user_agent || "",
                                    ipAddress: event.ip || "",
                                    isBot: false,
                                },
                            },
                        });

                        // Update campaign stats only if first open
                        if (!msg.opened && msg.campaignId) {
                            await Campaign.findByIdAndUpdate(msg.campaignId, {
                                $inc: { "stats.opened": 1 },
                            });
                        }
                    }
                    break;
                }
                case "email_clicked": {
                    const clickUrl = event.url || "";
                    const msg = await EmailMessage.findOne(emailMessageFilter);
                    if (msg) {
                        const updateOps: any = {
                            $set: {
                                clicked: true,
                                clickedAt: msg.clickedAt || new Date(),
                                lastClickedAt: new Date(),
                            },
                            $inc: { totalClickCount: 1 },
                        };

                        if (clickUrl) {
                            const existingLink = msg.linkClicks?.find(lc => lc.url === clickUrl);
                            if (existingLink) {
                                await EmailMessage.findOneAndUpdate(
                                    { _id: msg._id, "linkClicks.url": clickUrl },
                                    {
                                        $inc: { "linkClicks.$.clickCount": 1, totalClickCount: 1 },
                                        $set: {
                                            "linkClicks.$.clickedAt": new Date(),
                                            clicked: true,
                                            clickedAt: msg.clickedAt || new Date(),
                                            lastClickedAt: new Date(),
                                        },
                                    }
                                );
                            } else {
                                updateOps.$push = {
                                    linkClicks: { url: clickUrl, clickedAt: new Date(), clickCount: 1 },
                                };
                                await EmailMessage.findByIdAndUpdate(msg._id, updateOps);
                            }
                        } else {
                            await EmailMessage.findByIdAndUpdate(msg._id, updateOps);
                        }

                        if (!msg.clicked && msg.campaignId) {
                            await Campaign.findByIdAndUpdate(msg.campaignId, {
                                $inc: { "stats.clicked": 1 },
                            });
                        }
                    }
                    break;
                }
                case "email_bounced": {
                    await EmailMessage.findOneAndUpdate(emailMessageFilter, {
                        $set: { bounced: true, bouncedAt: new Date() },
                    });
                    const msg = await EmailMessage.findOne(emailMessageFilter);
                    if (msg?.campaignId) {
                        await Campaign.findByIdAndUpdate(msg.campaignId, {
                            $inc: { "stats.bounced": 1 },
                        });
                    }
                    break;
                }
                case "email_unsubscribed": {
                    await EmailMessage.findOneAndUpdate(emailMessageFilter, {
                        $set: { unsubscribed: true, unsubscribedAt: new Date() },
                    });
                    const msg = await EmailMessage.findOne(emailMessageFilter);
                    if (msg?.campaignId) {
                        await Campaign.findByIdAndUpdate(msg.campaignId, {
                            $inc: { "stats.unsubscribed": 1 },
                        });
                    }
                    break;
                }
            }

            // Log activity with providerEventId for deduplication
            await Activity.create({
                workspaceId,
                entityType: "contact",
                entityId: contact._id,
                type: "email",
                title: `Email ${eventType}`,
                description: `Email ${eventType} event received via webhook`,
                metadata: {
                    eventType,
                    providerEventId,
                    providerMessageId,
                    providerData: event,
                    receivedAt: new Date(),
                },
            });

            // Trigger workflows for open/click events
            if (internalEventType === "email_opened" || internalEventType === "email_clicked") {
                try {
                    await workflowService.checkAndEnroll(internalEventType, contact, workspaceId);
                } catch (error) {
                    console.error(`Failed to trigger ${internalEventType} workflows:`, error);
                }
            }
        }

        res.status(200).json({ success: true, message: "Webhook processed" });
    } catch (error) {
        console.error("Email webhook error:", error);
        res.status(500).json({ success: false, error: "Webhook processing failed" });
    }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Send a 1x1 transparent GIF pixel
 */
function sendTrackingPixel(res: Response) {
    // 1x1 transparent GIF
    const pixel = Buffer.from(
        "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        "base64"
    );

    res.set({
        "Content-Type": "image/gif",
        "Content-Length": pixel.length,
        "Cache-Control": "no-store, no-cache, must-revalidate, private",
        "Pragma": "no-cache",
        "Expires": "0",
    });

    res.send(pixel);
}

/**
 * Generate a tracking ID for email open/click tracking.
 * Uses HMAC-SHA256 signing to prevent tampering.
 */
export function generateTrackingId(
    workspaceId: string,
    contactId: string,
    emailType: string = "workflow",
    linkId: string = ""
): string {
    const data = `${workspaceId}:${contactId}:${emailType}:${linkId || Date.now()}`;
    return signTrackingId(data);
}

/**
 * Generate a tracking pixel URL
 */
export function getTrackingPixelUrl(trackingId: string): string {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    return `${baseUrl}/api/email-tracking/open/${trackingId}`;
}

/**
 * Wrap a URL with click tracking
 * Uses base64url encoding for URL safety (no +, /, = characters)
 */
export function wrapLinkWithTracking(
    originalUrl: string,
    trackingId: string
): string {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    // SECURITY FIX: Use base64url instead of base64 to avoid URL encoding issues
    const encodedUrl = Buffer.from(originalUrl).toString("base64url");
    return `${baseUrl}/api/email-tracking/click/${trackingId}?url=${encodedUrl}`;
}

export default router;
