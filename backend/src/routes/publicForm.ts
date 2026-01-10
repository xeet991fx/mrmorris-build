/**
 * Public Form Routes - NO AUTHENTICATION REQUIRED
 *
 * These routes handle public form access and submission.
 * They are mounted at /api/public to avoid route conflicts with workspace routes.
 */

import { Router, Response } from "express";
import Form from "../models/Form";
import FormSubmission from "../models/FormSubmission";
import Contact from "../models/Contact";
import emailService from "../services/email";
import { routeLead } from "../services/leadRouting";
import { executeFollowUpActions } from "../services/followUpActions";
import axios from "axios";

const router = Router();

/**
 * Verify reCAPTCHA v3 token
 */
async function verifyCaptcha(token: string, remoteIP: string): Promise<{ success: boolean; score?: number; error?: string }> {
    if (!process.env.RECAPTCHA_SECRET_KEY) {
        console.warn('reCAPTCHA not configured. Skipping verification.');
        return { success: true }; // Allow if not configured
    }

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token,
                    remoteip: remoteIP,
                },
            }
        );

        const { success, score, 'error-codes': errorCodes } = response.data;

        if (!success) {
            return {
                success: false,
                error: `reCAPTCHA verification failed: ${errorCodes?.join(', ') || 'Unknown error'}`,
            };
        }

        // reCAPTCHA v3 returns a score from 0.0 to 1.0
        // 0.5 is a reasonable threshold (1.0 is very likely human, 0.0 is very likely bot)
        if (score < 0.5) {
            return {
                success: false,
                score,
                error: `Low reCAPTCHA score: ${score}. Possible bot detected.`,
            };
        }

        return { success: true, score };
    } catch (error: any) {
        console.error('reCAPTCHA verification error:', error.message);
        return {
            success: false,
            error: `reCAPTCHA verification error: ${error.message}`,
        };
    }
}

/**
 * GET /api/public/forms/:formId
 *
 * Get public form for rendering (no authentication required).
 */
router.get(
    "/forms/:formId",
    async (req: any, res: Response) => {
        try {
            const { formId } = req.params;

            console.log(`📋 Public form request for ID: ${formId}`);

            // Validate ObjectID format (must be 24 character hex string)
            if (!/^[0-9a-fA-F]{24}$/.test(formId)) {
                console.log(`❌ Invalid form ID format: ${formId} (length: ${formId.length})`);
                return res.status(400).json({
                    success: false,
                    error: "Invalid form ID format",
                });
            }

            // First check if the form exists at all (for better error messages)
            const formExists = await Form.findById(formId).select('status name').lean();

            if (!formExists) {
                console.log(`❌ Form with ID ${formId} does not exist in database`);
                return res.status(404).json({
                    success: false,
                    error: "Form not found",
                });
            }

            console.log(`📋 Form found: "${formExists.name}" with status: ${formExists.status}`);

            // Check if published
            if (formExists.status !== 'published') {
                console.log(`⚠️ Form "${formExists.name}" exists but status is "${formExists.status}", not "published"`);
                return res.status(404).json({
                    success: false,
                    error: "Form is not published",
                });
            }

            // Get full form data for published form
            // Note: Include workspaceId as it's needed for frontend tracking
            const form = await Form.findById(formId)
                .select('-userId -stats.conversionRate')
                .lean();

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
 * POST /api/public/forms/:formId/submit
 *
 * Public endpoint for form submissions (no authentication required).
 */
router.post(
    "/forms/:formId/submit",
    async (req: any, res: Response) => {
        try {
            const { formId } = req.params;
            const { data, source, captchaToken } = req.body;

            // Verify reCAPTCHA token
            if (captchaToken) {
                const clientIP = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.socket.remoteAddress || 'unknown';
                const captchaResult = await verifyCaptcha(captchaToken, clientIP);

                if (!captchaResult.success) {
                    console.warn('reCAPTCHA verification failed:', captchaResult.error);
                    return res.status(403).json({
                        success: false,
                        error: "Bot submission detected. Please try again.",
                    });
                }

                console.log(`✅ reCAPTCHA verified. Score: ${captchaResult.score}`);
            }

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
                        // Use findOneAndUpdate with upsert to prevent race condition
                        // This atomically finds or creates the contact
                        const query: any = { workspaceId: form.workspaceId };

                        // Query by email if available (email is unique per workspace)
                        if (contactData.email) {
                            query.email = contactData.email;
                        } else if (contactData.phone) {
                            // If no email, query by phone
                            query.phone = contactData.phone;
                        }

                        const contact = await Contact.findOneAndUpdate(
                            query,
                            {
                                $setOnInsert: contactData, // Only set these fields on insert, not update
                            },
                            {
                                upsert: true, // Create if doesn't exist
                                new: true, // Return the document after update
                                setDefaultsOnInsert: true, // Apply schema defaults on insert
                            }
                        );

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

export default router;
