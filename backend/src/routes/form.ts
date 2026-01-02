/**
 * Form API Routes
 *
 * Provides form builder CRUD, public submission endpoint, and analytics.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import Form from "../models/Form";
import FormSubmission from "../models/FormSubmission";
import Contact from "../models/Contact";
import emailService from "../services/email";
import { routeLead } from "../services/leadRouting";
import { executeFollowUpActions } from "../services/followUpActions";
import { calculateFormAnalytics } from "../services/formAnalytics";

const router = Router();

/**
 * GET /api/workspaces/:workspaceId/forms
 *
 * Get all forms for a workspace.
 */
router.get(
    "/:workspaceId/forms",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { status } = req.query;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const forms = await Form.find(filter)
                .sort({ createdAt: -1 })
                .lean();

            res.json({
                success: true,
                data: forms,
            });
        } catch (error: any) {
            console.error("Error fetching forms:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch forms",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forms/:id
 *
 * Get a specific form.
 */
router.get(
    "/:workspaceId/forms/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const form = await Form.findOne({ _id: id, workspaceId }).lean();

            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: "Form not found",
                });
            }

            res.json({
                success: true,
                data: form,
            });
        } catch (error: any) {
            console.error("Error fetching form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch form",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/forms
 *
 * Create a new form.
 */
router.post(
    "/:workspaceId/forms",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();

            const form = await Form.create({
                workspaceId,
                userId,
                ...req.body,
            });

            res.status(201).json({
                success: true,
                data: form,
                message: "Form created successfully",
            });
        } catch (error: any) {
            console.error("Error creating form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create form",
            });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/forms/:id
 *
 * Update a form.
 */
router.put(
    "/:workspaceId/forms/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const form = await Form.findOneAndUpdate(
                { _id: id, workspaceId },
                req.body,
                { new: true, runValidators: true }
            );

            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: "Form not found",
                });
            }

            res.json({
                success: true,
                data: form,
                message: "Form updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update form",
            });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/forms/:id
 *
 * Delete a form.
 */
router.delete(
    "/:workspaceId/forms/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const form = await Form.findOneAndDelete({ _id: id, workspaceId });

            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: "Form not found",
                });
            }

            res.json({
                success: true,
                message: "Form deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete form",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forms/:id/submissions
 *
 * Get submissions for a form.
 */
router.get(
    "/:workspaceId/forms/:id/submissions",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const { status, limit = 50, offset = 0 } = req.query;

            const filter: any = { workspaceId, formId: id };
            if (status) filter.status = status;

            const submissions = await FormSubmission.find(filter)
                .populate("contactId", "firstName lastName email phone")
                .sort({ createdAt: -1 })
                .limit(parseInt(limit as string))
                .skip(parseInt(offset as string))
                .lean();

            const total = await FormSubmission.countDocuments(filter);

            res.json({
                success: true,
                data: submissions,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    hasMore: total > parseInt(offset as string) + submissions.length,
                },
            });
        } catch (error: any) {
            console.error("Error fetching submissions:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch submissions",
            });
        }
    }
);

/**
 * POST /api/public/forms/:formId/submit
 *
 * Public endpoint for form submissions (no authentication required).
 */
router.post(
    "/public/forms/:formId/submit",
    async (req: any, res: Response) => {
        try {
            const { formId } = req.params;
            const { data, source } = req.body;

            // Get form
            const form = await Form.findById(formId);

            if (!form || form.status !== 'published') {
                return res.status(404).json({
                    success: false,
                    error: "Form not found or not published",
                });
            }

            // Check form scheduling
            if (form.settings.schedule?.enabled) {
                const now = new Date();
                const { startDate, endDate, messageWhenClosed } = form.settings.schedule;

                // Check if form is before start date
                if (startDate && now < new Date(startDate)) {
                    return res.status(403).json({
                        success: false,
                        error: messageWhenClosed || "This form is not yet available.",
                    });
                }

                // Check if form is after end date
                if (endDate && now > new Date(endDate)) {
                    return res.status(403).json({
                        success: false,
                        error: messageWhenClosed || "This form is no longer accepting submissions.",
                    });
                }
            }

            // Check submission limits
            if (form.settings.maxSubmissions && form.stats.submissions >= form.settings.maxSubmissions) {
                return res.status(403).json({
                    success: false,
                    error: "This form has reached its maximum number of submissions.",
                });
            }

            // Check daily submission limit
            if (form.settings.maxSubmissionsPerDay) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const todaySubmissions = await FormSubmission.countDocuments({
                    formId,
                    createdAt: { $gte: today, $lt: tomorrow },
                });

                if (todaySubmissions >= form.settings.maxSubmissionsPerDay) {
                    return res.status(403).json({
                        success: false,
                        error: "This form has reached its daily submission limit. Please try again tomorrow.",
                    });
                }
            }

            // Track view
            await Form.findByIdAndUpdate(formId, {
                $inc: { 'stats.views': 1 },
            });

            // Create submission
            const submission = await FormSubmission.create({
                workspaceId: form.workspaceId,
                formId,
                data,
                source: {
                    ...source,
                    ip: req.ip || req.connection.remoteAddress,
                    userAgent: req.headers['user-agent'],
                },
            });

            // Auto-create contact if enabled
            let contactId: any = null;
            if (form.settings.autoCreateContact) {
                try {
                    const contactData: any = {
                        workspaceId: form.workspaceId,
                        source: 'form',
                        status: 'lead',
                    };

                    // Map form fields to contact fields
                    for (const field of form.fields) {
                        const value = data[field.id];
                        if (!value) continue;

                        switch (field.mapToField) {
                            case 'firstName':
                                contactData.firstName = value;
                                break;
                            case 'lastName':
                                contactData.lastName = value;
                                break;
                            case 'email':
                                contactData.email = value;
                                break;
                            case 'phone':
                                contactData.phone = value;
                                break;
                            case 'company':
                                contactData.company = value;
                                break;
                            case 'jobTitle':
                                contactData.jobTitle = value;
                                break;
                            case 'website':
                                contactData.website = value;
                                break;
                        }
                    }

                    // Only create if we have at least email or phone
                    if (contactData.email || contactData.phone) {
                        const contact = await Contact.create(contactData);
                        contactId = contact._id;

                        // Update submission with contact ID
                        await FormSubmission.findByIdAndUpdate(submission._id, {
                            contactId,
                            contactCreated: true,
                            processedAt: new Date(),
                        });
                    }
                } catch (contactError: any) {
                    console.error("Error creating contact from form:", contactError);
                    await FormSubmission.findByIdAndUpdate(submission._id, {
                        processingError: contactError.message,
                        processedAt: new Date(),
                    });
                }
            }

            // Lead Routing - Route the lead based on configured rules
            if (contactId) {
                try {
                    const routingResult = await routeLead(formId, data, contactId);
                    console.log(`Lead routing result:`, routingResult);

                    // Add routing notification emails to the notification list
                    if (routingResult.notifyEmails && routingResult.notifyEmails.length > 0) {
                        if (!form.settings.notificationEmails) {
                            form.settings.notificationEmails = [];
                        }
                        form.settings.notificationEmails = [
                            ...form.settings.notificationEmails,
                            ...routingResult.notifyEmails
                        ];
                    }
                } catch (routingError: any) {
                    console.error("Error routing lead:", routingError);
                    // Don't fail the submission if routing fails
                }
            }

            // Execute Follow-up Actions
            if (form.followUpActions && form.followUpActions.length > 0) {
                try {
                    await executeFollowUpActions(form.followUpActions, {
                        submissionData: data,
                        contactId,
                        formName: form.name,
                        workspaceId: form.workspaceId,
                        submissionId: submission._id.toString(),
                    });
                } catch (actionError: any) {
                    console.error("Error executing follow-up actions:", actionError);
                    // Don't fail the submission if actions fail
                }
            }

            // Update form stats
            await Form.findByIdAndUpdate(formId, {
                $inc: { 'stats.submissions': 1 },
                'stats.lastSubmittedAt': new Date(),
            });

            // Send notification emails if configured
            if (form.settings.notificationEmails && form.settings.notificationEmails.length > 0) {
                for (const email of form.settings.notificationEmails) {
                    try {
                        await emailService.sendFormNotificationEmail(
                            email,
                            form.name,
                            data,
                            submission._id.toString()
                        );
                        console.log(`✅ Notification email sent to: ${email}`);
                    } catch (emailError: any) {
                        console.error(`❌ Failed to send notification email to ${email}:`, emailError.message);
                        // Don't fail the submission if email fails
                    }
                }
            }

            res.json({
                success: true,
                message: form.settings.successMessage,
                redirectUrl: form.settings.redirectUrl,
                submissionId: submission._id,
                contactId,
            });
        } catch (error: any) {
            console.error("Error submitting form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to submit form",
            });
        }
    }
);

/**
 * GET /api/public/forms/:formId
 *
 * Get public form for rendering (no authentication required).
 */
router.get(
    "/public/forms/:formId",
    async (req: any, res: Response) => {
        try {
            const { formId } = req.params;

            const form = await Form.findOne({ _id: formId, status: 'published' })
                .select('-workspaceId -userId -stats.conversionRate')
                .lean();

            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: "Form not found or not published",
                });
            }

            res.json({
                success: true,
                data: form,
            });
        } catch (error: any) {
            console.error("Error fetching public form:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch form",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/forms/:id/analytics
 *
 * Get real-time analytics for a form.
 */
router.get(
    "/:workspaceId/forms/:id/analytics",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            // Verify form exists and belongs to workspace
            const form = await Form.findOne({ _id: id, workspaceId });
            if (!form) {
                return res.status(404).json({
                    success: false,
                    error: "Form not found",
                });
            }

            // Calculate analytics
            const analytics = await calculateFormAnalytics(workspaceId, id);

            res.json({
                success: true,
                data: analytics,
            });
        } catch (error: any) {
            console.error("Error calculating form analytics:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to calculate analytics",
            });
        }
    }
);

export default router;
