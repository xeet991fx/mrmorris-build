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

        let sent = 0;

        for (const enrollment of enrollments) {
            try {
                const campaign = enrollment.campaignId as unknown as any;
                const contact = enrollment.contactId as unknown as any;

                // Check if campaign is active
                if (campaign.status !== "active") {
                    continue;
                }

                // Check if within sending time window
                if (!this.isWithinSendingWindow(campaign)) {
                    continue;
                }

                //Check daily limit
                const sentTodayForCampaign = await this.getCampaignSentToday(campaign._id);
                if (sentTodayForCampaign >= campaign.dailyLimit) {
                    console.log(`⏸️ Campaign ${campaign.name} daily limit reached`);
                    continue;
                }

                // Get current step
                const step = campaign.steps[enrollment.currentStepIndex];
                if (!step) {
                    // No more steps, complete enrollment
                    enrollment.status = "completed";
                    enrollment.completedAt = new Date();
                    await enrollment.save();
                    continue;
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
                    continue;
                }

                // Send email
                const result = await this.sendCampaignEmail(
                    campaign,
                    enrollment,
                    step,
                    contact
                );

                if (result.success) {
                    sent++;

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
                }
            } catch (error: any) {
                console.error(`Error sending email for enrollment ${enrollment._id}:`, error.message);
            }
        }

        console.log(`📧 Sent ${sent} campaign emails`);
        return sent;
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
            // Get sending account
            const account = await EmailAccountService.rotateSendingAccount(
                campaign.workspaceId,
                campaign.fromAccounts
            );

            if (!account) {
                return { success: false, error: "No available email accounts" };
            }

            // Personalize subject and body
            const subject = this.personalizeText(step.subject, contact);
            const body = this.personalizeText(step.body, contact);

            // Create transporter
            let transporter;
            if (account.provider === "gmail") {
                transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        type: "OAuth2",
                        user: account.email,
                        accessToken: account.accessToken,
                        refreshToken: account.refreshToken,
                    },
                });
            } else {
                const password = EmailAccountService.getSMTPPassword(account);
                transporter = nodemailer.createTransport({
                    host: account.smtpHost,
                    port: account.smtpPort,
                    secure: account.smtpPort === 465,
                    auth: {
                        user: account.smtpUser,
                        pass: password,
                    },
                });
            }

            // Send email
            const info = await transporter.sendMail({
                from: account.email,
                to: contact.email,
                subject,
                text: body,
                html: `<p>${body.replace(/\n/g, "<br>")}</p>`,
            });

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
                bodyHtml: `<p>${body.replace(/\n/g, "<br>")}</p>`,
                bodyText: body,
                messageId: info.messageId,
                sentAt: new Date(),
                stepId: step.id,
            });

            // Increment account sent count
            await EmailAccountService.incrementSentCount(account._id as Types.ObjectId);

            console.log(`✅ Sent: ${subject} → ${contact.email}`);

            return {
                success: true,
                messageId: info.messageId,
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
        return text
            .replace(/\{\{firstName\}\}/g, contact.firstName || contact.name?.split(" ")[0] || "")
            .replace(/\{\{lastName\}\}/g, contact.lastName || contact.name?.split(" ")[1] || "")
            .replace(/\{\{name\}\}/g, contact.name || "")
            .replace(/\{\{email\}\}/g, contact.email || "")
            .replace(/\{\{company\}\}/g, contact.company || "");
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
     */
    private isWithinSendingWindow(campaign: any): boolean {
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
}

export default new CampaignService();
