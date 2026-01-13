/**
 * Campaign Service
 * 
 * Manages cold email campaigns including enrollment, sending, and tracking.
 */

import Campaign, { ICampaign, ICampaignStep } from "../models/Campaign";
import CampaignEnrollment from "../models/CampaignEnrollment";
import EmailMessage from "../models/EmailMessage";
import Contact from "../models/Contact";
import EmailAccountService from "./EmailAccountService";
import nodemailer, { Transporter } from "nodemailer";
import { Types } from "mongoose";
import { getProModel } from "../agents/modelFactory";
import { processBatches } from "../utils/batchProcessor";

// ============================================
// CAMPAIGN SERVICE
// ============================================

class CampaignService {
    /**
     * Create a new campaign
     */
    async createCampaign(
        workspaceId: Types.ObjectId,
        userId: Types.ObjectId,
        data: {
            name: string;
            description?: string;
            fromAccounts: Types.ObjectId[];
            dailyLimit?: number;
            sendingSchedule?: any;
            steps: ICampaignStep[];
        }
    ): Promise<ICampaign> {
        const campaign = await Campaign.create({
            workspaceId,
            userId,
            ...data,
            status: "draft",
        });

        console.log(`✅ Campaign created: ${campaign.name}`);
        return campaign;
    }

    /**
     * Enroll contacts into a campaign
     */
    async enrollContacts(
        campaignId: string,
        contactIds: string[]
    ): Promise<{ enrolled: number; skipped: number }> {
        const campaign = await Campaign.findById(campaignId);
        if (!campaign) {
            throw new Error("Campaign not found");
        }

        let enrolled = 0;
        let skipped = 0;

        for (const contactId of contactIds) {
            try {
                // Check if already enrolled
                const existing = await CampaignEnrollment.findOne({
                    campaignId: campaign._id,
                    contactId: new Types.ObjectId(contactId),
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                // Create enrollment
                const firstStep = campaign.steps[0];
                const nextSendAt = this.calculateNextSendTime(
                    campaign,
                    firstStep.delayDays,
                    firstStep.delayHours
                );

                await CampaignEnrollment.create({
                    campaignId: campaign._id,
                    contactId: new Types.ObjectId(contactId),
                    workspaceId: campaign.workspaceId,
                    status: "pending",
                    currentStepIndex: 0,
                    nextSendAt,
                });

                enrolled++;
            } catch (error: any) {
                console.error(`Failed to enroll contact ${contactId}:`, error.message);
                skipped++;
            }
        }

        // Update campaign stats
        campaign.totalEnrolled += enrolled;
        campaign.activeEnrollments += enrolled;
        await campaign.save();

        console.log(`📊 Enrolled ${enrolled} contacts, skipped ${skipped}`);
        return { enrolled, skipped };
    }

    /**
     * Send next batch of campaign emails
     * Called by cron job every 5 minutes
     * Uses parallel batch processing for scalability
     */
    async sendNextBatch(): Promise<number> {
        console.log("📤 Processing campaign emails...");

        const now = new Date();

        // Find enrollments ready to send
        const enrollments = await CampaignEnrollment.find({
            status: { $in: ["pending", "active"] },
            nextSendAt: { $lte: now },
        })
            .limit(100) // Process 100 at a time
            .populate("campaignId")
            .populate("contactId");

        if (enrollments.length === 0) {
            return 0;
        }

        console.log(`📊 Found ${enrollments.length} enrollments to process`);

        // Process enrollments in parallel batches of 10
        const batchResult = await processBatches(
            enrollments,
            async (enrollment) => this.processEnrollment(enrollment, now),
            {
                batchSize: 10,
                batchDelayMs: 200, // Small delay between batches to prevent overwhelming email providers
                continueOnError: true,
                onProgress: (processed, total) => {
                    if (processed % 20 === 0) {
                        console.log(`📧 Progress: ${processed}/${total} enrollments`);
                    }
                },
            }
        );

        console.log(`📧 Campaign batch complete: ${batchResult.successCount} sent, ${batchResult.errorCount} errors in ${batchResult.duration}ms`);
        return batchResult.successCount;
    }

    /**
     * Process a single enrollment - extracted for parallel processing
     */
    private async processEnrollment(enrollment: any, now: Date): Promise<{ sent: boolean; error?: string }> {
        const campaign = enrollment.campaignId as unknown as any;
        const contact = enrollment.contactId as unknown as any;

        // Check if campaign exists (might have been deleted)
        if (!campaign || !campaign._id) {
            console.log(`⚠️ Enrollment ${enrollment._id} has no campaign, marking as completed`);
            enrollment.status = "completed";
            await enrollment.save();
            return { sent: false, error: "No campaign" };
        }

        // Check if contact exists (might have been deleted)
        if (!contact || !contact._id) {
            console.log(`⚠️ Enrollment ${enrollment._id} has no contact, marking as completed`);
            enrollment.status = "completed";
            await enrollment.save();
            return { sent: false, error: "No contact" };
        }

        // Check if campaign is active
        if (campaign.status !== "active") {
            return { sent: false, error: "Campaign not active" };
        }

        // Check if within sending time window
        if (!this.isWithinSendingWindow(campaign)) {
            return { sent: false, error: "Outside sending window" };
        }

        // Check daily limit
        const sentTodayForCampaign = await this.getCampaignSentToday(campaign._id);
        if (sentTodayForCampaign >= campaign.dailyLimit) {
            console.log(`⏸️ Campaign ${campaign.name} daily limit reached`);
            return { sent: false, error: "Daily limit reached" };
        }

        // Get current step
        const step = campaign.steps[enrollment.currentStepIndex];
        if (!step) {
            // No more steps, complete enrollment
            enrollment.status = "completed";
            enrollment.completedAt = new Date();
            await enrollment.save();
            return { sent: false, error: "No more steps" };
        }

        // Check conditional sending
        if (!this.shouldSendStep(step, enrollment)) {
            // Skip to next step
            enrollment.currentStepIndex += 1;
            const nextStep = campaign.steps[enrollment.currentStepIndex];
            if (nextStep) {
                enrollment.nextSendAt = this.calculateNextSendTime(
                    campaign,
                    nextStep.delayDays,
                    nextStep.delayHours
                );
            } else {
                enrollment.status = "completed";
            }
            await enrollment.save();
            return { sent: false, error: "Step condition not met" };
        }

        // Send email
        const result = await this.sendCampaignEmail(
            campaign,
            enrollment,
            step,
            contact
        );

        if (result.success) {
            // Update enrollment
            enrollment.status = "active";
            enrollment.emailsSent.push({
                stepId: step.id,
                messageId: result.messageId!,
                sentAt: now,
                fromAccountId: result.fromAccountId as Types.ObjectId,
                opened: false,
                clicked: false,
                replied: false,
                bounced: false,
            });

            // Move to next step
            enrollment.currentStepIndex += 1;
            const nextStep = campaign.steps[enrollment.currentStepIndex];
            if (nextStep) {
                enrollment.nextSendAt = this.calculateNextSendTime(
                    campaign,
                    nextStep.delayDays,
                    nextStep.delayHours
                );
            } else {
                enrollment.nextSendAt = undefined;
            }

            await enrollment.save();

            // Update campaign stats
            campaign.stats.sent += 1;
            await campaign.save();

            return { sent: true };
        }

        return { sent: false, error: result.error };
    }


    /**
     * Send a campaign email
     */
    private async sendCampaignEmail(
        campaign: any,
        enrollment: any,
        step: ICampaignStep,
        contact: any
    ): Promise<{
        success: boolean;
        messageId?: string;
        fromAccountId?: Types.ObjectId;
        error?: string;
    }> {
        try {
            // Get sending account (try EmailAccount first)
            let account = await EmailAccountService.rotateSendingAccount(
                campaign.workspaceId,
                campaign.fromAccounts
            );

            // If no EmailAccount found, try EmailIntegration (Gmail OAuth from Settings)
            if (!account && campaign.fromAccounts && campaign.fromAccounts.length > 0) {
                const EmailIntegration = (await import("../models/EmailIntegration")).default;

                // Try to find a Gmail integration that matches one of the fromAccounts
                const integration = await EmailIntegration.findOne({
                    _id: { $in: campaign.fromAccounts },
                    workspaceId: campaign.workspaceId,
                    isActive: true,
                }).select("+accessToken +refreshToken");

                if (integration) {
                    // Use integration as account (create compatible object)
                    account = {
                        _id: integration._id,
                        email: integration.email,
                        provider: "gmail",
                        accessToken: integration.getAccessToken(),
                        refreshToken: integration.getRefreshToken(),
                    } as any;
                    console.log(`📧 Using Gmail integration: ${integration.email}`);
                }
            }

            if (!account) {
                return { success: false, error: "No available email accounts" };
            }


            // Personalize subject and body - use AI if template is basic
            let subject = this.personalizeText(step.subject, contact);
            let body = this.personalizeText(step.body, contact);

            // Auto-upgrade basic templates with AI
            if (this.isBasicTemplate(step.body)) {
                console.log(`🤖 Campaign: Detected basic template, auto-upgrading with AI for: ${contact.firstName} ${contact.lastName}`);
                const aiContent = await this.generateAIEmail(contact, step.subject);
                subject = aiContent.subject;
                body = aiContent.body;
            }

            let htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, "<br>")}</p>`;

            // Generate email tracking ID (will be saved to EmailMessage later)
            const trackingId = Buffer.from(
                `${campaign.workspaceId}:${contact._id}:campaign:${campaign._id}:${Date.now()}`
            ).toString("base64");

            // Add tracking pixel for open tracking
            const baseUrl = process.env.BACKEND_URL || "http://localhost:5000";
            const trackingPixel = `<img src="${baseUrl}/api/email-tracking/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
            htmlBody += trackingPixel;

            // Wrap links with click tracking
            htmlBody = this.wrapLinksWithTracking(htmlBody, trackingId, baseUrl);

            let messageId: string | undefined;

            // Check if this is a Gmail Integration (use Gmail API) or EmailAccount (use nodemailer)
            if (account.provider === "gmail" && account.accessToken) {
                // Use Gmail API to send (for EmailIntegration accounts)
                const { google } = await import("googleapis");

                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET,
                    `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
                );

                oauth2Client.setCredentials({
                    access_token: account.accessToken,
                    refresh_token: account.refreshToken,
                });

                const gmail = google.gmail({ version: "v1", auth: oauth2Client });

                // Create email message in RFC 2822 format
                const emailLines = [
                    `From: ${account.email}`,
                    `To: ${contact.email}`,
                    `Subject: ${subject}`,
                    "Content-Type: text/html; charset=utf-8",
                    "",
                    htmlBody,
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

                messageId = response.data.id || undefined;
            } else {
                // Use nodemailer for SMTP accounts
                const password = EmailAccountService.getSMTPPassword(account);
                const transporter = nodemailer.createTransport({
                    host: account.smtpHost,
                    port: account.smtpPort,
                    secure: account.smtpPort === 465,
                    auth: {
                        user: account.smtpUser,
                        pass: password,
                    },
                });

                const info = await transporter.sendMail({
                    from: account.email,
                    to: contact.email,
                    subject,
                    text: body,
                    html: htmlBody,
                });

                messageId = info.messageId;
            }

            // Track email message
            await EmailMessage.create({
                campaignId: campaign._id,
                enrollmentId: enrollment._id,
                contactId: contact._id,
                workspaceId: campaign.workspaceId,
                fromAccountId: account._id,
                fromEmail: account.email,
                toEmail: contact.email,
                subject,
                bodyHtml: htmlBody,
                bodyText: body,
                messageId: messageId,
                sentAt: new Date(),
                stepId: step.id,
            });

            // Increment account sent count (only for EmailAccount, not integrations)
            if (!account.accessToken) {
                await EmailAccountService.incrementSentCount(account._id as Types.ObjectId);
            }

            console.log(`✅ Sent: ${subject} → ${contact.email}`);

            return {
                success: true,
                messageId: messageId,
                fromAccountId: account._id as Types.ObjectId,
            };
        } catch (error: any) {
            console.error("Send email error:", error.message);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    /**
     * Personalize text with contact data
     */
    private personalizeText(text: string, contact: any): string {
        const firstName = contact.firstName || contact.name?.split(" ")[0] || "";
        const lastName = contact.lastName || contact.name?.split(" ")[1] || "";
        const fullName = contact.name || `${firstName} ${lastName}`.trim();

        return text
            // Standard patterns
            .replace(/\{\{firstName\}\}/g, firstName)
            .replace(/\{\{lastName\}\}/g, lastName)
            .replace(/\{\{name\}\}/g, fullName)
            .replace(/\{\{email\}\}/g, contact.email || "")
            .replace(/\{\{company\}\}/g, contact.company || "")
            .replace(/\{\{phone\}\}/g, contact.phone || "")
            // contact.* patterns (for legacy/alternative template formats)
            .replace(/\{\{contact\.name\}\}/g, fullName)
            .replace(/\{\{contact\.firstName\}\}/g, firstName)
            .replace(/\{\{contact\.lastName\}\}/g, lastName)
            .replace(/\{\{contact\.email\}\}/g, contact.email || "")
            .replace(/\{\{contact\.company\}\}/g, contact.company || "")
            .replace(/\{\{contact\.phone\}\}/g, contact.phone || "");
    }

    /**
     * Wrap all links in email with click tracking
     */
    private wrapLinksWithTracking(htmlBody: string, trackingId: string, baseUrl: string): string {
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
     * Check if should send step based on conditions
     */
    private shouldSendStep(step: ICampaignStep, enrollment: any): boolean {
        if (!step.sendIf) return true;

        const previousEmail = enrollment.emailsSent[enrollment.emailsSent.length - 1];
        if (!previousEmail) return true;

        if (step.sendIf.previousEmailOpened !== undefined) {
            if (step.sendIf.previousEmailOpened !== previousEmail.opened) {
                return false;
            }
        }

        if (step.sendIf.previousEmailClicked !== undefined) {
            if (step.sendIf.previousEmailClicked !== previousEmail.clicked) {
                return false;
            }
        }

        if (step.sendIf.previousEmailReplied !== undefined) {
            if (step.sendIf.previousEmailReplied !== previousEmail.replied) {
                return false;
            }
        }

        return true;
    }

    /**
     * Calculate next send time based on delay
     */
    private calculateNextSendTime(
        campaign: any,
        delayDays: number,
        delayHours: number
    ): Date {
        const now = new Date();
        const totalMs = (delayDays * 24 * 60 + delayHours * 60) * 60 * 1000;
        return new Date(now.getTime() + totalMs);
    }

    /**
     * Check if within sending time window
     * TODO: Re-enable for production
     */
    private isWithinSendingWindow(campaign: any): boolean {
        // TESTING MODE: Send 24/7
        // Remove this return statement to enable time window checks
        return true;

        /* PRODUCTION CODE - uncomment when ready:
        const now = new Date();
        const schedule = campaign.sendingSchedule;

        // Check weekends
        if (!schedule.sendOnWeekends) {
            const day = now.getDay();
            if (day === 0 || day === 6) return false; // Sunday or Saturday
        }

        // Check time window
        const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
            now.getMinutes()
        ).padStart(2, "0")}`;

        if (currentTime < schedule.startTime || currentTime > schedule.endTime) {
            return false;
        }

        return true;
        */
    }

    /**
     * Get campaign emails sent today
     */
    private async getCampaignSentToday(campaignId: Types.ObjectId): Promise<number> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const count = await EmailMessage.countDocuments({
            campaignId,
            sentAt: { $gte: today },
        });

        return count;
    }

    /**
     * Update campaign stats
     */
    async updateCampaignStats(campaignId: string): Promise<void> {
        const messages = await EmailMessage.find({ campaignId });

        const stats = {
            sent: messages.length,
            delivered: messages.filter((m) => !m.bounced).length,
            opened: messages.filter((m) => m.opened).length,
            clicked: messages.filter((m) => m.clicked).length,
            replied: messages.filter((m) => m.replied).length,
            bounced: messages.filter((m) => m.bounced).length,
            unsubscribed: 0, // TODO: Track unsubscribes
            positiveReplies: messages.filter((m) => m.replySentiment === "positive").length,
            negativeReplies: messages.filter((m) => m.replySentiment === "negative").length,
        };

        await Campaign.findByIdAndUpdate(campaignId, { stats });
    }

    /**
     * Detect if an email template is too basic/generic and should be upgraded by AI
     */
    private isBasicTemplate(body: string): boolean {
        // Empty or very short templates
        if (!body || body.length < 100) return true;

        // Count placeholders - if mostly placeholders, it's basic
        const placeholderCount = (body.match(/\{\{[^}]+\}\}/g) || []).length;
        const wordCount = body.split(/\s+/).length;
        if (placeholderCount > 0 && wordCount < 30) return true;

        // Common generic phrases that indicate a basic template
        const genericPhrases = [
            "welcome! we're so glad",
            "we're glad to have you",
            "welcome to our",
            "thank you for joining",
            "hi {{contact",
            "hello {{contact",
            "dear {{contact",
            "hi {{name",
            "hello {{name",
        ];

        const lowerBody = body.toLowerCase();
        for (const phrase of genericPhrases) {
            if (lowerBody.includes(phrase) && wordCount < 50) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate AI-powered email content using Gemini
     */
    private async generateAIEmail(
        contact: any,
        originalSubject?: string
    ): Promise<{ subject: string; body: string }> {
        const contactName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "there";
        const company = contact.company || "our company";
        const jobTitle = contact.jobTitle || "";

        // Infer purpose from subject if available
        const purpose = originalSubject?.toLowerCase().includes("welcome") ? "welcome" :
            originalSubject?.toLowerCase().includes("follow") ? "follow-up" : "outreach";

        const prompt = `You are an expert email copywriter. Write a professional yet friendly email for the following context:

PURPOSE: ${purpose}
RECIPIENT NAME: ${contactName}
RECIPIENT COMPANY: ${contact.company || "Unknown"}
RECIPIENT JOB TITLE: ${jobTitle || "Unknown"}
SENDER COMPANY: ${company}

Requirements:
1. Write a compelling subject line (max 60 chars)
2. Write a personalized email body (150-250 words)
3. Use HTML formatting for the body (paragraphs, line breaks)
4. Include a clear call-to-action if appropriate
5. Be warm, professional, and NOT generic
6. Reference their specific role/company if available
7. Make it feel human, not templated

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
                    body: parsed.body || `<p>Hi ${contactName},</p><p>We're excited to connect!</p>`,
                };
            }
        } catch (error: any) {
            console.error("AI email generation failed:", error.message);
        }

        // Fallback if AI fails
        return {
            subject: `Welcome to ${company}, ${contactName}!`,
            body: `<p>Hi ${contactName},</p>
<p>We're thrilled to connect with you! ${jobTitle ? `As a ${jobTitle}, ` : ""}we believe you'll find great value in what we offer.</p>
<p>Our team is here to help you succeed. Don't hesitate to reach out if you have any questions.</p>
<p>Best regards,<br/>The ${company} Team</p>`,
        };
    }
}

export default new CampaignService();
