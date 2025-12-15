/**
 * Email Action Executor
 * 
 * Sends automated emails to contacts as part of workflow automation.
 * Supports sending via:
 * 1. Connected Gmail account (if available) - emails appear from user's Gmail
 * 2. SMTP fallback - uses system email configuration
 */

import { google } from "googleapis";
import Activity from "../../../models/Activity";
import EmailIntegration from "../../../models/EmailIntegration";
import emailService from "../../email";
import { replacePlaceholders } from "../utils";
import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { generateTrackingId, getTrackingPixelUrl } from "../../../routes/emailTracking";

// Gmail OAuth client factory
const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
    );
};

export class EmailActionExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const { emailSubject, emailBody, useCustomEmail, recipientEmail, sendFromAccountId } = step.config;

        // Determine the recipient email address
        let toEmail: string;

        if (useCustomEmail && recipientEmail) {
            // Use custom email (supports placeholders like {{email}})
            toEmail = replacePlaceholders(recipientEmail, entity);
        } else {
            // Default: send to the enrolled entity's email
            toEmail = entity.email;
        }

        // Validate email exists
        if (!toEmail) {
            return this.skipped("No email address available");
        }

        // Replace placeholders in subject and body
        const subject = replacePlaceholders(emailSubject || "Automated Message", entity);
        let body = replacePlaceholders(emailBody || "", entity);

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

        // Check for connected Gmail account
        console.log("🔍 Looking for Gmail integration:", {
            workspaceId: enrollment.workspaceId,
            provider: "gmail",
            sendFromAccountId: sendFromAccountId || "any",
        });

        const gmailIntegration = await EmailIntegration.findOne({
            workspaceId: enrollment.workspaceId,
            provider: "gmail",
            isActive: true,
            ...(sendFromAccountId ? { _id: sendFromAccountId } : {}),
        }).select("+accessToken +refreshToken");

        if (gmailIntegration) {
            console.log("✅ Found Gmail integration:", gmailIntegration.email);
            // Send via Gmail API
            result = await this.sendViaGmail(gmailIntegration, toEmail, subject, body);
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

        const sentFrom = gmailIntegration?.email || process.env.EMAIL_USER || "system";

        // Clear console log for email sent
        console.log(`\n========================================`);
        console.log(`📧 EMAIL SENT SUCCESSFULLY!`);
        console.log(`   To: ${toEmail}`);
        console.log(`   From: ${sentFrom}`);
        console.log(`   Subject: ${subject}`);
        console.log(`   Via: ${result.sentVia || "gmail"}`);
        console.log(`========================================\n`);

        // Note: Activity logging skipped for workflow emails
        // The Activity model requires opportunityId and userId which aren't available in workflow context
        // Email sending is already logged via console above
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
     * Send email via Gmail API
     */
    private async sendViaGmail(
        integration: any,
        to: string,
        subject: string,
        body: string
    ): Promise<{ success: boolean; messageId?: string; error?: string; sentVia: string }> {
        try {
            const oauth2Client = getOAuth2Client();
            oauth2Client.setCredentials({
                access_token: integration.getAccessToken(),
                refresh_token: integration.getRefreshToken(),
            });

            // Handle token refresh
            oauth2Client.on("tokens", async (tokens: { access_token?: string | null; refresh_token?: string | null; expiry_date?: number | null }) => {
                if (tokens.access_token) {
                    integration.setTokens(
                        tokens.access_token,
                        tokens.refresh_token || integration.getRefreshToken()
                    );
                    if (tokens.expiry_date) {
                        integration.expiresAt = new Date(tokens.expiry_date);
                    }
                    await integration.save();
                }
            });

            const gmail = google.gmail({ version: "v1", auth: oauth2Client });

            // Create email message in RFC 2822 format
            const emailLines = [
                `From: ${integration.email}`,
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
            console.error("Gmail send error:", error.message);

            // If Gmail fails, check if we should fallback to SMTP
            if (error.code === 401 || error.code === 403) {
                // Token expired or invalid permissions
                integration.isActive = false;
                integration.syncError = "Token expired or invalid permissions";
                await integration.save();
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

                // Encode the original URL
                const encodedUrl = Buffer.from(url).toString("base64");
                const trackingUrl = `${baseUrl}/api/email-tracking/click/${trackingId}?url=${encodedUrl}`;

                return `<a ${beforeHref}href="${trackingUrl}"${afterHref}>`;
            }
        );
    }
}

export default new EmailActionExecutor()
