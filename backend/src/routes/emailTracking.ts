import express, { Request, Response } from "express";
import mongoose from "mongoose";
import Workflow from "../models/Workflow";
import Contact from "../models/Contact";
import Activity from "../models/Activity";
import { workflowService } from "../services/workflow";
import leadScoringService from "../services/leadScoring";

const router = express.Router();

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
 * @access  Public (but uses encrypted tracking ID)
 * 
 * The trackingId format: base64(workspaceId:contactId:emailType:timestamp)
 */
router.get("/open/:trackingId", async (req: Request, res: Response) => {
    try {
        const { trackingId } = req.params;

        // Decode tracking ID
        const decoded = Buffer.from(trackingId, "base64").toString("utf-8");
        const [workspaceId, contactId, emailType, timestamp] = decoded.split(":");

        if (!workspaceId || !contactId) {
            // Return 1x1 transparent pixel anyway to not break email
            return sendTrackingPixel(res);
        }

        // Log the open event
        console.log(`📧 Email opened: contact=${contactId}, type=${emailType}`);

        // Get contact
        const contact = await Contact.findById(contactId);
        if (!contact) {
            return sendTrackingPixel(res);
        }

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
                openedAt: new Date(),
                trackingId,
            },
        });

        // Update lead score
        try {
            await leadScoringService.updateLeadScore(
                workspaceId,
                contactId,
                "email_opened"
            );
        } catch (error) {
            console.error("Failed to update lead score:", error);
        }

        // Trigger workflows with email_opened trigger
        try {
            await workflowService.checkAndEnroll("email_opened", contact, workspaceId);
        } catch (error) {
            console.error("Failed to trigger email_opened workflows:", error);
        }

        // Return tracking pixel
        sendTrackingPixel(res);
    } catch (error) {
        console.error("Email open tracking error:", error);
        // Still return pixel to not break email rendering
        sendTrackingPixel(res);
    }
});

// ============================================
// LINK CLICK TRACKING
// ============================================

/**
 * @route   GET /api/email-tracking/click/:trackingId
 * @desc    Track email link clicks
 * @access  Public (but uses encrypted tracking ID)
 * 
 * Query params:
 * - url: The actual URL to redirect to (base64 encoded)
 * 
 * The trackingId format: base64(workspaceId:contactId:emailType:linkId)
 */
router.get("/click/:trackingId", async (req: Request, res: Response) => {
    try {
        const { trackingId } = req.params;
        const { url } = req.query;

        // Decode tracking ID
        const decoded = Buffer.from(trackingId, "base64").toString("utf-8");
        const [workspaceId, contactId, emailType, linkId] = decoded.split(":");

        // Decode destination URL
        let destinationUrl = "https://example.com"; // Fallback
        if (url) {
            try {
                destinationUrl = Buffer.from(url as string, "base64").toString("utf-8");
            } catch {
                destinationUrl = url as string;
            }
        }

        if (!workspaceId || !contactId) {
            return res.redirect(destinationUrl);
        }

        // Log the click event
        console.log(`🔗 Email link clicked: contact=${contactId}, link=${linkId}`);

        // Get contact
        const contact = await Contact.findById(contactId);
        if (!contact) {
            return res.redirect(destinationUrl);
        }

        // Log activity
        await Activity.create({
            workspaceId,
            entityType: "contact",
            entityId: contactId,
            type: "email",
            title: "Email Link Clicked",
            description: `Contact clicked link in ${emailType || "automated"} email`,
            metadata: {
                emailType,
                linkId,
                destinationUrl,
                clickedAt: new Date(),
                trackingId,
            },
        });

        // Update lead score
        try {
            await leadScoringService.updateLeadScore(
                workspaceId,
                contactId,
                "email_clicked"
            );
        } catch (error) {
            console.error("Failed to update lead score:", error);
        }

        // Trigger workflows with email_clicked trigger
        try {
            await workflowService.checkAndEnroll("email_clicked", contact, workspaceId);
        } catch (error) {
            console.error("Failed to trigger email_clicked workflows:", error);
        }

        // Redirect to actual destination
        res.redirect(destinationUrl);
    } catch (error) {
        console.error("Email click tracking error:", error);
        // Try to redirect to URL if available
        const { url } = req.query;
        if (url) {
            try {
                const destinationUrl = Buffer.from(url as string, "base64").toString("utf-8");
                return res.redirect(destinationUrl);
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

/**
 * @route   POST /api/email-tracking/webhook
 * @desc    Receive webhook events from email providers (SendGrid, Mailgun, etc.)
 * @access  Public (but should be secured with signature verification)
 */
router.post("/webhook", async (req: Request, res: Response) => {
    try {
        const events = Array.isArray(req.body) ? req.body : [req.body];

        for (const event of events) {
            const eventType = event.event || event.type;
            const contactEmail = event.email || event.recipient;
            const metadata = event.metadata || event.custom_args || {};

            if (!eventType || !contactEmail) {
                continue;
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

            // Log activity
            await Activity.create({
                workspaceId,
                entityType: "contact",
                entityId: contact._id,
                type: "email",
                title: `Email ${eventType}`,
                description: `Email ${eventType} event received`,
                metadata: {
                    eventType,
                    providerData: event,
                    receivedAt: new Date(),
                },
            });

            // Trigger workflows
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
 * Generate a tracking ID for email open/click tracking
 */
export function generateTrackingId(
    workspaceId: string,
    contactId: string,
    emailType: string = "workflow",
    linkId: string = ""
): string {
    const data = `${workspaceId}:${contactId}:${emailType}:${linkId || Date.now()}`;
    return Buffer.from(data).toString("base64");
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
 */
export function wrapLinkWithTracking(
    originalUrl: string,
    trackingId: string
): string {
    const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
    const encodedUrl = Buffer.from(originalUrl).toString("base64");
    return `${baseUrl}/api/email-tracking/click/${trackingId}?url=${encodedUrl}`;
}

export default router;
