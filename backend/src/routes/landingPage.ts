/**
 * Landing Page API Routes
 *
 * Provides CRUD operations for landing pages with public rendering endpoint.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import LandingPage from "../models/LandingPage";

const router = Router();

/**
 * GET /api/workspaces/:workspaceId/landing-pages
 *
 * Get all landing pages for a workspace.
 */
router.get(
    "/:workspaceId/landing-pages",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { status } = req.query;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const pages = await LandingPage.find(filter)
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                data: pages,
            });
        } catch (error: any) {
            console.error("Error fetching landing pages:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch landing pages",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/landing-pages/:id
 *
 * Get a specific landing page.
 */
router.get(
    "/:workspaceId/landing-pages/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const page = await LandingPage.findOne({ _id: id, workspaceId }).lean();

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error: "Landing page not found",
                });
            }

            res.json({
                success: true,
                data: page,
            });
        } catch (error: any) {
            console.error("Error fetching landing page:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch landing page",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/landing-pages
 *
 * Create a new landing page.
 */
router.post(
    "/:workspaceId/landing-pages",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();

            const page = await LandingPage.create({
                workspaceId,
                userId,
                ...req.body,
            });

            res.status(201).json({
                success: true,
                data: page,
                message: "Landing page created successfully",
            });
        } catch (error: any) {
            console.error("Error creating landing page:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create landing page",
            });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/landing-pages/:id
 *
 * Update a landing page.
 */
router.put(
    "/:workspaceId/landing-pages/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const page = await LandingPage.findOneAndUpdate(
                { _id: id, workspaceId },
                req.body,
                { new: true, runValidators: true }
            );

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error: "Landing page not found",
                });
            }

            res.json({
                success: true,
                data: page,
                message: "Landing page updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating landing page:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update landing page",
            });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/landing-pages/:id
 *
 * Delete a landing page.
 */
router.delete(
    "/:workspaceId/landing-pages/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const page = await LandingPage.findOneAndDelete({ _id: id, workspaceId });

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error: "Landing page not found",
                });
            }

            res.json({
                success: true,
                message: "Landing page deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting landing page:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete landing page",
            });
        }
    }
);

/**
 * GET /api/public/pages/:slug
 *
 * Get public landing page by slug (no authentication required).
 */
router.get(
    "/public/pages/:slug",
    async (req: any, res: Response) => {
        try {
            const { slug } = req.params;

            const page = await LandingPage.findOne({ slug, status: 'published' })
                .select('-workspaceId -userId')
                .lean();

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error: "Page not found or not published",
                });
            }

            // Track view
            await LandingPage.findByIdAndUpdate(page._id, {
                $inc: {
                    'stats.views': 1,
                    'stats.uniqueVisitors': 1, // In production, use session/cookie to track unique
                },
                'stats.lastViewedAt': new Date(),
            });

            res.json({
                success: true,
                data: page,
            });
        } catch (error: any) {
            console.error("Error fetching public page:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch page",
            });
        }
    }
);

/**
 * POST /api/public/pages/:pageId/track-conversion
 *
 * Track conversion on a landing page (no authentication required).
 */
router.post(
    "/public/pages/:pageId/track-conversion",
    async (req: any, res: Response) => {
        try {
            const { pageId } = req.params;

            await LandingPage.findByIdAndUpdate(pageId, {
                $inc: { 'stats.conversions': 1 },
            });

            res.json({
                success: true,
                message: "Conversion tracked",
            });
        } catch (error: any) {
            console.error("Error tracking conversion:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to track conversion",
            });
        }
    }
);

/**
 * POST /api/public/pages/:slug/capture-lead
 *
 * Capture lead from landing page form submission.
 * Creates a new contact in the CRM with source = landing page.
 * No authentication required (public endpoint).
 */
router.post(
    "/public/pages/:slug/capture-lead",
    async (req: any, res: Response) => {
        try {
            const { slug } = req.params;
            const { firstName, lastName, email, phone, company, message, customFields } = req.body;

            if (!firstName || !email) {
                return res.status(400).json({
                    success: false,
                    error: "First name and email are required",
                });
            }

            // Find the landing page to get workspaceId and userId
            const page = await LandingPage.findOne({ slug }).lean();

            if (!page) {
                return res.status(404).json({
                    success: false,
                    error: "Landing page not found",
                });
            }

            // Import Contact model dynamically to avoid circular dependencies
            const Contact = (await import("../models/Contact")).default;

            // Check if contact already exists with this email in the workspace
            const existingContact = await Contact.findOne({
                workspaceId: (page as any).workspaceId,
                email: email.toLowerCase().trim(),
            });

            if (existingContact) {
                // Update existing contact with any new info
                if (phone && !existingContact.phone) existingContact.phone = phone;
                if (company && !existingContact.company) existingContact.company = company;
                if (message) existingContact.notes = `${existingContact.notes || ''}\n\n[Landing Page: ${(page as any).name}] ${message}`.trim();

                // Add landing page tag if not present
                if (!existingContact.tags?.includes(`landing-page:${slug}`)) {
                    existingContact.tags = [...(existingContact.tags || []), `landing-page:${slug}`];
                }

                await existingContact.save();

                // Track conversion
                await LandingPage.findByIdAndUpdate(page._id, {
                    $inc: { 'stats.conversions': 1 },
                });

                return res.json({
                    success: true,
                    message: "Thanks! We'll be in touch soon.",
                    contactId: existingContact._id,
                    isExisting: true,
                });
            }

            // Create new contact
            const contact = await Contact.create({
                workspaceId: (page as any).workspaceId,
                userId: (page as any).userId,
                firstName: firstName.trim(),
                lastName: lastName?.trim() || "",
                email: email.toLowerCase().trim(),
                phone: phone?.trim(),
                company: company?.trim(),
                source: `Landing Page: ${(page as any).name}`,
                status: "lead",
                tags: [`landing-page:${slug}`, "web-lead"],
                notes: message ? `[Initial Message]\n${message}` : undefined,
                customFields: customFields ? new Map(Object.entries(customFields)) : undefined,
            });

            // Track conversion
            await LandingPage.findByIdAndUpdate(page._id, {
                $inc: { 'stats.conversions': 1 },
            });

            console.log(`🎯 Lead captured from ${slug}: ${email}`);

            res.status(201).json({
                success: true,
                message: "Thanks! We'll be in touch soon.",
                contactId: contact._id,
                isExisting: false,
            });
        } catch (error: any) {
            console.error("Error capturing lead:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to submit form. Please try again.",
            });
        }
    }
);

export default router;

