import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import WebhookSubscription from "../models/WebhookSubscription";
import crypto from "crypto";

const router = express.Router();

/**
 * GET /api/workspaces/:workspaceId/webhooks
 * List all webhook subscriptions
 */
router.get("/:workspaceId/webhooks", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const webhooks = await WebhookSubscription.find({ workspaceId }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: webhooks,
        });
    } catch (error: any) {
        console.error("List webhooks error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch webhooks",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/webhooks
 * Create webhook subscription
 */
router.post("/:workspaceId/webhooks", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user!._id;
        const { url, events, headers } = req.body;

        if (!url || !events || events.length === 0) {
            return res.status(400).json({
                success: false,
                error: "URL and events are required",
            });
        }

        // Generate a secret for signature verification
        const secret = crypto.randomBytes(32).toString("hex");

        const webhook = await WebhookSubscription.create({
            workspaceId,
            userId,
            url,
            events,
            headers,
            secret,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            data: webhook,
            message: "Webhook subscription created",
        });
    } catch (error: any) {
        console.error("Create webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create webhook",
        });
    }
});

/**
 * PUT /api/workspaces/:workspaceId/webhooks/:id
 * Update webhook subscription
 */
router.put("/:workspaceId/webhooks/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const { url, events, isActive, headers } = req.body;

        const webhook = await WebhookSubscription.findOneAndUpdate(
            { _id: id, workspaceId },
            { $set: { url, events, isActive, headers } },
            { new: true, runValidators: true }
        );

        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }

        res.json({
            success: true,
            data: webhook,
            message: "Webhook updated",
        });
    } catch (error: any) {
        console.error("Update webhook error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update webhook",
        });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/webhooks/:id
 * Delete webhook subscription
 */
router.delete("/:workspaceId/webhooks/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        const webhook = await WebhookSubscription.findOneAndDelete({
            _id: id,
            workspaceId,
        });

        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }

        res.json({
            success: true,
            message: "Webhook deleted",
        });
    } catch (error: any) {
        console.error("Delete webhook error:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete webhook",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/webhooks/:id/test
 * Test webhook with sample payload
 */
router.post("/:workspaceId/webhooks/:id/test", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        const webhook = await WebhookSubscription.findOne({
            _id: id,
            workspaceId,
        });

        if (!webhook) {
            return res.status(404).json({
                success: false,
                error: "Webhook not found",
            });
        }

        // Send test payload
        const testPayload = {
            event: "test",
            workspaceId: workspaceId.toString(),
            timestamp: new Date().toISOString(),
            data: {
                message: "This is a test webhook from MrMorris CRM",
            },
        };

        const signature = crypto
            .createHmac("sha256", webhook.secret || "")
            .update(JSON.stringify(testPayload))
            .digest("hex");

        const customHeaders: Record<string, string> = {};
        if (webhook.headers) {
            if (webhook.headers instanceof Map) {
                webhook.headers.forEach((value, key) => {
                    customHeaders[key] = value;
                });
            } else {
                Object.assign(customHeaders, webhook.headers);
            }
        }

        const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-MrMorris-Signature": signature,
                ...customHeaders,
            },
            body: JSON.stringify(testPayload),
        });

        if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
        }

        await WebhookSubscription.findByIdAndUpdate(id, {
            lastTriggeredAt: new Date(),
            lastError: null,
        });

        res.json({
            success: true,
            message: "Test webhook sent successfully",
            status: response.status,
        });
    } catch (error: any) {
        console.error("Test webhook error:", error);

        await WebhookSubscription.findByIdAndUpdate(req.params.id, {
            lastError: error.message,
        });

        res.status(500).json({
            success: false,
            error: error.message || "Failed to send test webhook",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/webhooks/events
 * Get available webhook events
 */
router.get("/:workspaceId/webhooks/events", authenticate, async (req: AuthRequest, res: Response) => {
    const events = [
        { value: "contact.created", label: "Contact Created", description: "Triggered when a new contact is created" },
        { value: "contact.updated", label: "Contact Updated", description: "Triggered when a contact is updated" },
        { value: "contact.deleted", label: "Contact Deleted", description: "Triggered when a contact is deleted" },
        { value: "company.created", label: "Company Created", description: "Triggered when a new company is created" },
        { value: "company.updated", label: "Company Updated", description: "Triggered when a company is updated" },
        { value: "deal.created", label: "Deal Created", description: "Triggered when a new deal is created" },
        { value: "deal.updated", label: "Deal Updated", description: "Triggered when a deal is updated" },
        { value: "deal.won", label: "Deal Won", description: "Triggered when a deal is marked as won" },
        { value: "deal.lost", label: "Deal Lost", description: "Triggered when a deal is marked as lost" },
        { value: "deal.stage_changed", label: "Deal Stage Changed", description: "Triggered when a deal moves to a new stage" },
        { value: "task.created", label: "Task Created", description: "Triggered when a new task is created" },
        { value: "task.completed", label: "Task Completed", description: "Triggered when a task is marked complete" },
        { value: "email.opened", label: "Email Opened", description: "Triggered when a tracked email is opened" },
        { value: "email.clicked", label: "Email Link Clicked", description: "Triggered when a link in an email is clicked" },
        { value: "email.replied", label: "Email Replied", description: "Triggered when an email receives a reply" },
        { value: "form.submitted", label: "Form Submitted", description: "Triggered when a form is submitted" },
        { value: "workflow.enrolled", label: "Workflow Enrolled", description: "Triggered when a contact is enrolled in a workflow" },
        { value: "workflow.completed", label: "Workflow Completed", description: "Triggered when a contact completes a workflow" },
        { value: "visitor.identified", label: "Visitor Identified", description: "Triggered when an anonymous visitor is identified via form submission" },
        { value: "tracking.page_view", label: "Page View Tracked", description: "Triggered when a page view is tracked" },
        { value: "lead.qualified", label: "Lead Qualified", description: "Triggered when a lead reaches qualification criteria" },
    ];

    res.json({
        success: true,
        data: events,
    });
});

export default router;
