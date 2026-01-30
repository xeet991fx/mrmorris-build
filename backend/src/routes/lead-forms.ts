import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import LeadForm from "../models/LeadForm";
import Contact from "../models/Contact";
import Visitor from "../models/Visitor";
import TrackingEvent from "../models/TrackingEvent";
import { logger } from "../utils/logger";
import mongoose from "mongoose";
import cors from "cors";

const router = express.Router();

// CORS for public endpoints - allows any origin
const publicCors = cors({
    origin: '*',  // Allow all origins for SDK usage
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
});

// ============================================
// PUBLIC ENDPOINTS (for SDK) - MUST BE BEFORE AUTH ROUTES
// ============================================

/**
 * GET /api/public/lead-forms/:workspaceId
 * Get active forms for SDK to display
 */
router.options("/public/lead-forms/:workspaceId", publicCors);
router.get("/public/lead-forms/:workspaceId", publicCors, async (req: Request, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { url } = req.query;

        const forms = await LeadForm.find({
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            active: true
        })
            .select("-views -submissions -createdAt -updatedAt -__v")
            .lean();

        // Filter by URL patterns if provided
        let filteredForms = forms;
        if (url) {
            filteredForms = forms.filter(form => {
                // Check hideOnPages first
                if (form.hideOnPages?.length) {
                    const shouldHide = form.hideOnPages.some(pattern =>
                        new RegExp(pattern.replace(/\*/g, ".*")).test(url as string)
                    );
                    if (shouldHide) return false;
                }

                // Check showOnPages (if empty, show on all pages)
                if (form.showOnPages?.length) {
                    return form.showOnPages.some(pattern =>
                        new RegExp(pattern.replace(/\*/g, ".*")).test(url as string)
                    );
                }

                return true;
            });
        }

        res.json({ success: true, data: filteredForms });
    } catch (error: any) {
        logger.error("Public get lead forms error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get forms" });
    }
});

/**
 * POST /api/public/lead-forms/:formId/view
 * Track form view
 */
router.options("/public/lead-forms/:formId/view", publicCors);
router.post("/public/lead-forms/:formId/view", publicCors, async (req: Request, res: Response) => {
    try {
        const { formId } = req.params;

        await LeadForm.updateOne(
            { _id: formId },
            { $inc: { views: 1 } }
        );

        res.json({ success: true });
    } catch (error: any) {
        logger.error("Track form view error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to track view" });
    }
});

/**
 * POST /api/public/lead-forms/:formId/submit
 * Handle form submission and create contact
 */
router.options("/public/lead-forms/:formId/submit", publicCors);
router.post("/public/lead-forms/:formId/submit", publicCors, async (req: Request, res: Response) => {
    try {
        const { formId } = req.params;
        const { visitorId, data, url } = req.body;

        // Get form
        const form = await LeadForm.findById(formId);
        if (!form) {
            return res.status(404).json({ success: false, error: "Form not found" });
        }

        // Extract email and common fields
        const email = data.email;
        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required" });
        }

        // Find or create contact
        const contact = await Contact.findOneAndUpdate(
            { workspaceId: form.workspaceId, email },
            {
                $setOnInsert: {
                    workspaceId: form.workspaceId,
                    email,
                    source: `form:${form.name}`,
                    status: "lead",
                },
                $set: {
                    firstName: data.firstName || data.first_name || data.name?.split(" ")[0],
                    lastName: data.lastName || data.last_name || data.name?.split(" ").slice(1).join(" "),
                    phone: data.phone || data.telephone,
                    company: data.company || data.organization,
                    ...(Object.keys(data).reduce((acc, key) => {
                        if (!["email", "firstName", "lastName", "first_name", "last_name", "name", "phone", "telephone", "company", "organization"].includes(key)) {
                            acc[`customFields.${key}`] = data[key];
                        }
                        return acc;
                    }, {} as Record<string, any>)),
                },
            },
            { upsert: true, new: true }
        );

        // Increment submissions
        await LeadForm.updateOne({ _id: formId }, { $inc: { submissions: 1 } });

        // Track event
        await TrackingEvent.create({
            workspaceId: form.workspaceId,
            visitorId,
            contactId: contact._id,
            eventType: "form_submit",
            eventName: `Form: ${form.name}`,
            url,
            properties: { formId, formName: form.name, fields: Object.keys(data) },
        });

        // Link visitor to contact
        if (visitorId) {
            await Visitor.updateOne(
                { workspaceId: form.workspaceId, visitorId },
                { $set: { contactId: contact._id } }
            );
        }

        res.json({
            success: true,
            message: form.successMessage || "Thank you!",
            redirectUrl: form.redirectUrl,
            contactId: contact._id,
        });
    } catch (error: any) {
        logger.error("Form submit error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to submit form" });
    }
});

// ============================================
// AUTHENTICATED CRUD ENDPOINTS
// ============================================

/**
 * GET /api/workspaces/:workspaceId/lead-forms
 * List all lead forms for a workspace
 */
router.get("/:workspaceId/lead-forms", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const forms = await LeadForm.find({ workspaceId })
            .sort({ createdAt: -1 })
            .lean();

        // Calculate conversion rates
        const formsWithStats = forms.map(form => ({
            ...form,
            conversionRate: form.views > 0
                ? ((form.submissions / form.views) * 100).toFixed(1)
                : "0.0",
        }));

        res.json({ success: true, data: formsWithStats });
    } catch (error: any) {
        logger.error("List lead forms error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to list forms" });
    }
});

/**
 * GET /api/workspaces/:workspaceId/lead-forms/:formId
 * Get single lead form
 */
router.get("/:workspaceId/lead-forms/:formId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, formId } = req.params;
        const form = await LeadForm.findOne({ _id: formId, workspaceId }).lean();

        if (!form) {
            return res.status(404).json({ success: false, error: "Form not found" });
        }

        res.json({ success: true, data: form });
    } catch (error: any) {
        logger.error("Get lead form error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to get form" });
    }
});

/**
 * POST /api/workspaces/:workspaceId/lead-forms
 * Create new lead form
 */
router.post("/:workspaceId/lead-forms", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const { name, description, type, fields, style, trigger, headline, subheadline,
            submitButtonText, successMessage, redirectUrl, showOnPages, hideOnPages,
            showFrequency, active } = req.body;

        const form = await LeadForm.create({
            workspaceId,
            name: name || "New Form",
            description,
            type: type || "popup",
            fields: fields || [
                { name: "email", label: "Email", type: "email", placeholder: "your@email.com", required: true },
            ],
            style: style || {},
            trigger: trigger || { type: "delay", value: 5 },
            headline,
            subheadline,
            submitButtonText,
            successMessage,
            redirectUrl,
            showOnPages,
            hideOnPages,
            showFrequency: showFrequency || "once_per_session",
            active: active || false,
        });

        res.status(201).json({ success: true, data: form });
    } catch (error: any) {
        logger.error("Create lead form error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to create form" });
    }
});

/**
 * PUT /api/workspaces/:workspaceId/lead-forms/:formId
 * Update lead form
 */
router.put("/:workspaceId/lead-forms/:formId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, formId } = req.params;

        const form = await LeadForm.findOneAndUpdate(
            { _id: formId, workspaceId },
            { $set: req.body },
            { new: true }
        );

        if (!form) {
            return res.status(404).json({ success: false, error: "Form not found" });
        }

        res.json({ success: true, data: form });
    } catch (error: any) {
        logger.error("Update lead form error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to update form" });
    }
});

/**
 * DELETE /api/workspaces/:workspaceId/lead-forms/:formId
 * Delete lead form
 */
router.delete("/:workspaceId/lead-forms/:formId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, formId } = req.params;

        const result = await LeadForm.deleteOne({ _id: formId, workspaceId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: "Form not found" });
        }

        res.json({ success: true, message: "Form deleted" });
    } catch (error: any) {
        logger.error("Delete lead form error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to delete form" });
    }
});

/**
 * PATCH /api/workspaces/:workspaceId/lead-forms/:formId/toggle
 * Toggle form active status
 */
router.patch("/:workspaceId/lead-forms/:formId/toggle", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, formId } = req.params;

        const form = await LeadForm.findOne({ _id: formId, workspaceId });
        if (!form) {
            return res.status(404).json({ success: false, error: "Form not found" });
        }

        form.active = !form.active;
        await form.save();

        res.json({ success: true, data: form, message: form.active ? "Form activated" : "Form deactivated" });
    } catch (error: any) {
        logger.error("Toggle lead form error", { error: error.message });
        res.status(500).json({ success: false, error: "Failed to toggle form" });
    }
});

export default router;
