/**
 * Email Action Executor
 * 
 * Sends automated emails to contacts as part of workflow automation.
 * Supports:
 * 1. AI-generated content (using Gemini)
 * 2. Connected Gmail account (if available) - emails appear from user's Gmail
 * 3. SMTP fallback - uses system email configuration
 */

import { google } from "googleapis";
import { Types } from "mongoose";
import Activity from "../../../models/Activity";
import IntegrationCredential from "../../../models/IntegrationCredential";
import EmailMessage from "../../../models/EmailMessage";
import Contact from "../../../models/Contact";
import emailService from "../../email";
import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { generateTrackingId, getTrackingPixelUrl } from "../../../routes/emailTracking";
import { getProModel } from "../../../agents/modelFactory";
import { tokenRefreshService, IntegrationExpiredError } from "../../TokenRefreshService";

// Gmail OAuth client factory
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
};

// Story 5.4 AC4: Rate limit retry configuration
const GMAIL_RATE_LIMIT_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
};

// Email template detection thresholds
const TEMPLATE_DETECTION_THRESHOLDS = {
    minBodyLength: 100,
    minWordCountWithPlaceholders: 30,
    minWordCountForGenericCheck: 50,
};

export class EmailActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const {
            emailSubject,
            emailBody,
            useCustomEmail,
            recipientEmail,
            sendFromAccountId,
            // AI Generation options
            useAIGeneration,
            emailPurpose,
            emailTone,
            companyName
        } = step.config;

        // Determine the recipient email address
        let toEmail: string;

        if (useCustomEmail && recipientEmail) {
            // Use custom email (supports placeholders like {{email}})
            toEmail = replacePlaceholders(recipientEmail, entity);
        } else {
            // Default: send to the enrolled entity's email
            toEmail = entity.email;
        }

        // Validate email exists and is valid (Story 5.4 AC5)
        if (!toEmail) {
            return this.skipped("No email address available");
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(toEmail)) {
            this.log(`❌ Invalid email format: ${toEmail}`);
            return this.error(`Invalid email address: ${toEmail}`);
        }

        let subject: string;
        let body: string;

        // DEBUG: Log what we're working with
        console.log(`📧 Email Action Debug:`, {
            emailBody: emailBody?.substring(0, 100),
            emailBodyLength: emailBody?.length || 0,
            useAIGeneration,
        });

        // Detect if template is too basic/generic and should be upgraded by AI
        const isBasicTemplate = this.isBasicTemplate(emailBody || "");
        console.log(`📧 isBasicTemplate: ${isBasicTemplate}`);
        const shouldUseAI = useAIGeneration || isBasicTemplate;

        // Use AI to generate email content if enabled OR if template is basic
        if (shouldUseAI) {
            if (isBasicTemplate && !useAIGeneration) {
                console.log(`🤖 Detected basic template, auto-upgrading with AI for: ${entity.firstName} ${entity.lastName}`);
            } else {
                console.log(`🤖 Generating AI email for: ${entity.firstName} ${entity.lastName}`);
            }
            const aiContent = await this.generateAIEmail(entity, emailPurpose, emailTone, companyName);
            subject = aiContent.subject;
            body = aiContent.body;
        } else {
            // Use static templates with placeholder replacement
            subject = replacePlaceholders(emailSubject || "Automated Message", entity);
            body = replacePlaceholders(emailBody || "", entity);
        }

        // Add email tracking pixel and wrap links
        const trackingId = generateTrackingId(
            enrollment.workspaceId.toString(),
            entity._id?.toString() || enrollment.entityId.toString(),
            "workflow",
            enrollment._id?.toString() || ""
        );

        // Add tracking pixel at the end of email body
        const trackingPixelUrl = getTrackingPixelUrl(trackingId);
        const trackingPixel = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none" alt="" />`;

        // Wrap links with click tracking
        body = this.wrapLinksWithTracking(body, trackingId);

        // Append tracking pixel
        body = body + trackingPixel;

        // Build entity data for email template
        const entityData = {
            firstName: entity.firstName || "",
            lastName: entity.lastName || "",
            name: entity.name || `${entity.firstName || ""} ${entity.lastName || ""}`.trim(),
            email: entity.email,
            phone: entity.phone || "",
            company: entity.company || "",
            status: entity.status || "",
            source: entity.source || "",
        };

        // Try to send via Gmail if a connected account exists
        let result: { success: boolean; messageId?: string; error?: string; sentVia?: string };

        // Check for connected Gmail integration (Story 5.4: IntegrationCredential model)
        const workspaceObjId = new Types.ObjectId(enrollment.workspaceId.toString());
        console.log("🔍 Checking Gmail integration:", {
            workspaceId: workspaceObjId.toString(),
            type: 'gmail',
            status: 'Connected',
        });

        const gmailCredential = await IntegrationCredential.findOne({
            workspaceId: workspaceObjId,
            type: 'gmail',
            status: 'Connected',
        }).select('+encryptedData');

        console.log("🔍 IntegrationCredential query result:", gmailCredential ? "FOUND" : "NOT FOUND");

        if (gmailCredential) {
            try {
                // Story 5.4 Task 6.2: Ensure valid token before sending
                const validAccessToken = await tokenRefreshService.ensureValidToken(gmailCredential._id.toString());
                console.log("✅ Token validated/refreshed for Gmail");

                const credData = gmailCredential.getCredentialData();
                const senderEmail = gmailCredential.profileInfo?.email || credData.email;
                console.log("✅ Found Gmail credential:", senderEmail);

                // Send via Gmail API using stored credentials
                result = await this.sendViaGmailCredential(
                    gmailCredential._id.toString(),
                    validAccessToken,
                    senderEmail,
                    toEmail,
                    subject,
                    body
                );
                result.sentVia = 'gmail';
            } catch (error: any) {
                // Story 5.4 Task 6.5, 6.6: Handle integration expiration
                if (error instanceof IntegrationExpiredError) {
                    console.error("❌ Gmail integration expired:", error.message);
                    result = {
                        success: false,
                        error: "Gmail integration expired. Please reconnect in Settings.",
                        sentVia: 'gmail'
                    };
                } else {
                    console.error("❌ Token refresh failed:", error.message);
                    result = {
                        success: false,
                        error: `Gmail token refresh failed: ${error.message}`,
                        sentVia: 'gmail'
                    };
                }
            }
        } else {
            console.log("⚠️ No Gmail integration found, using SMTP fallback");
            // Fallback to SMTP
            result = await emailService.sendWorkflowEmail(toEmail, subject, body, entityData);
            result.sentVia = "smtp";
        }

        if (!result.success) {
            this.log(`❌ Failed to send workflow email: ${result.error}`);
            return this.error(result.error || "Failed to send email");
        }

        // Determine sender email for logging/display
        let sentFrom = process.env.EMAIL_USER || "system";
        if (result.sentVia === 'gmail' && gmailCredential) {
            // Gmail credential was used, get the email from IntegrationCredential
            sentFrom = gmailCredential.profileInfo?.email || sentFrom;
        }

        // Save email to EmailMessage for inbox display
        try {
            // Find contact by email if entity doesn't have _id
            let contactId = entity._id;
            if (!contactId) {
                const contact = await Contact.findOne({
                    workspaceId: enrollment.workspaceId,
                    email: toEmail
                });
                contactId = contact?._id;
            }

            if (contactId) {
                await EmailMessage.create({
                    source: 'workflow',
                    workflowId: enrollment.workflowId,
                    workflowEnrollmentId: enrollment._id,
                    contactId: new Types.ObjectId(contactId.toString()),
                    workspaceId: new Types.ObjectId(enrollment.workspaceId.toString()),
                    fromEmail: sentFrom,
                    toEmail: toEmail,
                    subject: subject,
                    bodyHtml: body,
                    bodyText: body.replace(/<[^>]*>/g, ''),
                    messageId: result.messageId || `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    sentAt: new Date(),
                    stepId: step.id,
                    isRead: false,
                });
                console.log(`📧 Workflow email saved to inbox`);
            }
        } catch (saveError: any) {
            console.error(`⚠️ Failed to save workflow email to inbox:`, saveError.message);
        }

        // Clear console log for email sent
        console.log(`\n========================================`);
        console.log(`📧 EMAIL SENT SUCCESSFULLY!`);
        console.log(`   To: ${toEmail}`);
        console.log(`   From: ${sentFrom}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Via: ${result.sentVia || "gmail"}`);
        console.log(`========================================\n`);

        // Story 5.4 AC6: Create activity record for CRM tracking
        try {
            const entityId = entity._id || enrollment.entityId;

            // Validate entityId exists before creating activity
            if (!entityId) {
                console.warn(`⚠️ Cannot create activity: no entityId available for ${toEmail}`);
            } else {
                await Activity.create({
                    workspaceId: context.workspaceId,
                    entityType: 'contact', // Workflow emails typically target contacts
                    entityId: entityId,
                    type: 'email',
                    title: `Email sent to ${toEmail}`,
                    description: `Subject: ${subject}`,
                    direction: 'outbound',
                    emailSubject: subject,
                    emailBody: body,
                    workflowId: enrollment.workflowId,
                    workflowEnrollmentId: enrollment._id,
                    automated: true,
                    metadata: {
                        messageId: result.messageId,
                        sentVia: result.sentVia || 'gmail',
                    },
                });
                this.log(`✅ Activity logged for email to ${toEmail}`);
            }
        } catch (activityError: any) {
            // Log error but don't fail the email action if activity creation fails
            console.error(`⚠️ Failed to create activity: ${activityError.message}`);
        }

        this.log(`✅ Workflow email completed: ${result.sentVia} delivery to ${toEmail}`);

        return this.success({
            sent: true,
            to: toEmail,
            from: sentFrom,
            subject,
            messageId: result.messageId,
            sentVia: result.sentVia || "gmail",
        });
    }

    /**
     * Send email via Gmail API using IntegrationCredential data
     * Story 5.4 AC4: Handle 429 rate limit errors with exponential backoff
     * Story 5.4 AC7: Handle 401 errors with token refresh and retry
     */
    private async sendViaGmailCredential(
        credentialId: string,
        accessToken: string,
        fromEmail: string,
        to: string,
        subject: string,
        body: string,
        retryOnAuth: boolean = true,
        retryAttempt: number = 0
    ): Promise<{ success: boolean; messageId?: string; error?: string; sentVia: string }> {
        try {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: accessToken,
            });

            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            // Create email message in RFC 2822 format
            const emailLines = [
                `From: ${fromEmail}`,
                `To: ${to}`,
                `Subject: ${subject}`,
                "Content-Type: text/html; charset=utf-8",
                "",
                body,
            ];

            const rawMessage = emailLines.join("\r\n");
            const encodedMessage = Buffer.from(rawMessage)
                .toString("base64")
                .replace(/\+/g, "-")
                .replace(/\//g, "_")
                .replace(/=+$/, "");

            const response = await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: encodedMessage,
                },
            });

            return {
                success: true,
                messageId: response.data.id || undefined,
                sentVia: "gmail",
            };
        } catch (error: any) {
            console.error("Gmail credential send error:", error.message);

            // Story 5.4 AC4: Handle 429 rate limit with exponential backoff (1s, 2s, 4s)
            if ((error.code === 429 || error.response?.status === 429) && retryAttempt < GMAIL_RATE_LIMIT_CONFIG.maxRetries) {
                const delayMs = Math.pow(GMAIL_RATE_LIMIT_CONFIG.backoffMultiplier, retryAttempt) * GMAIL_RATE_LIMIT_CONFIG.initialDelayMs;
                console.warn(`⚠️ Gmail rate limit hit (429). Retry ${retryAttempt + 1}/${GMAIL_RATE_LIMIT_CONFIG.maxRetries} after ${delayMs}ms...`);

                await new Promise(resolve => setTimeout(resolve, delayMs));

                // Retry with incremented attempt counter
                return this.sendViaGmailCredential(
                    credentialId,
                    accessToken,
                    fromEmail,
                    to,
                    subject,
                    body,
                    retryOnAuth,
                    retryAttempt + 1
                );
            } else if ((error.code === 429 || error.response?.status === 429) && retryAttempt >= GMAIL_RATE_LIMIT_CONFIG.maxRetries) {
                // All retries exhausted
                console.error("❌ Gmail rate limit exceeded after all retries");
                return {
                    success: false,
                    error: "Gmail rate limit exceeded. Please wait and try again.",
                    sentVia: "gmail",
                };
            }

            // Story 5.4 AC7: Handle 401 by triggering token refresh and retry
            if ((error.code === 401 || error.response?.status === 401) && retryOnAuth) {
                console.warn("⚠️ 401 error detected, attempting token refresh...");
                try {
                    // Attempt to refresh token
                    const newAccessToken = await tokenRefreshService.refreshToken(credentialId);
                    console.log("✅ Token refreshed after 401, retrying send...");

                    // Retry send with new token (retryOnAuth=false to prevent infinite loop)
                    return this.sendViaGmailCredential(
                        credentialId,
                        newAccessToken,
                        fromEmail,
                        to,
                        subject,
                        body,
                        false,
                        retryAttempt
                    );
                } catch (refreshError: any) {
                    console.error("❌ Token refresh failed after 401:", refreshError.message);
                    return {
                        success: false,
                        error: "Gmail integration expired. Please reconnect in Settings.",
                        sentVia: "gmail",
                    };
                }
            }

            return {
                success: false,
                error: `Gmail error: ${error.message}`,
                sentVia: "gmail",
            };
        }
    }

    /**
     * Wrap all links in the email body with click tracking
     */
    private wrapLinksWithTracking(htmlBody: string, trackingId: string): string {
        const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";

        // Match all <a href="..."> tags
        return htmlBody.replace(
            /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*?)>/gi,
            (match, beforeHref, url, afterHref) => {
                // Don't track if it's already a tracking link
                if (url.includes('/api/email-tracking/')) {
                    return match;
                }

                // Skip placeholder/invalid URLs that shouldn't be tracked
                const skipPatterns = ['#', 'javascript:', 'mailto:', 'tel:', 'data:'];
                if (skipPatterns.some(pattern => url.startsWith(pattern) || url === pattern)) {
                    return match;
                }

                // Encode the original URL
                const encodedUrl = Buffer.from(url).toString("base64");
                const trackingUrl = `${baseUrl}/api/email-tracking/click/${trackingId}?url=${encodedUrl}`;

                return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
            }
        );
    }

    /**
     * Generate AI-powered email content using Gemini
     */
    private async generateAIEmail(
        entity: any,
        purpose?: string,
        tone?: string,
        companyName?: string
    ): Promise<{ subject: string; body: string }> {
        const contactName = `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || "there";
        const company = entity.company || companyName || "our company";
        const jobTitle = entity.jobTitle || "";
        const emailPurpose = purpose || "welcome";
        const emailTone = tone || "professional yet friendly";

        const prompt = `You are an expert email copywriter. Write a ${emailTone} email for the following context:

PURPOSE: ${emailPurpose}
RECIPIENT NAME: ${contactName}
RECIPIENT COMPANY: ${entity.company || "Unknown"}
RECIPIENT JOB TITLE: ${jobTitle || "Unknown"}
SENDER COMPANY: ${company}

Requirements:
1. Write a compelling subject line (max 60 chars)
2. Write a personalized email body (150-250 words)
3. Use HTML formatting for the body (paragraphs, line breaks)
4. DO NOT include any links or buttons. No <a> tags. No call-to-action buttons. Just plain text with HTML paragraphs.
5. Be warm, professional, and NOT generic
6. Reference their specific role/company if available
7. Make it feel human, not templated
8. End with a friendly sign-off inviting them to reply

Respond in this exact JSON format only, no other text:
{"subject": "...", "body": "<p>...</p>"}`;

        try {
            const model = getProModel();
            const response = await model.invoke(prompt);
            const text = response.content as string;

            // Parse JSON from response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    subject: parsed.subject || `Welcome, ${contactName}!`,
                    body: parsed.body || `<p>Hi ${contactName},</p><p>We're excited to have you!</p>`,
                };
            }
        } catch (error: any) {
            console.error("AI email generation failed:", error.message);
        }

        // Fallback if AI fails
        return {
            subject: `Welcome to ${company}, ${contactName}!`,
            body: `<p>Hi ${contactName},</p>
<p>We're thrilled to welcome you to ${company}! ${jobTitle ? `As a ${jobTitle}, ` : ""}we believe you'll find great value in what we offer.</p>
<p>Our team is here to help you succeed. Don't hesitate to reach out if you have any questions.</p>
<p>Best regards,<br/>The ${company} Team</p>`,
        };
    }

    /**
     * Detect if an email template is too basic/generic and should be upgraded by AI
     */
    private isBasicTemplate(body: string): boolean {
        // Empty or very short templates
        if (!body || body.length < TEMPLATE_DETECTION_THRESHOLDS.minBodyLength) return true;

        // Count placeholders - if mostly placeholders, it's basic
        const placeholderCount = (body.match(/\{\{[^}]+\}\}/g) || []).length;
        const wordCount = body.split(/\s+/).length;
        if (placeholderCount > 0 && wordCount < TEMPLATE_DETECTION_THRESHOLDS.minWordCountWithPlaceholders) return true;

        // Common generic phrases that indicate a basic template
        const genericPhrases = [
            "welcome! we're so glad",
            "we're glad to have you",
            "welcome to our",
            "thank you for joining",
            "hi {{contact",
            "hello {{contact",
            "dear {{contact",
        ];

        const lowerBody = body.toLowerCase();
        for (const phrase of genericPhrases) {
            if (lowerBody.includes(phrase) && wordCount < TEMPLATE_DETECTION_THRESHOLDS.minWordCountForGenericCheck) {
                return true;
            }
        }

        return false;
    }
}

export default new EmailActionExecutor()
