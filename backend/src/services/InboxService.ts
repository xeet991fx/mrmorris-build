/**
 * Inbox Service (Unibox)
 * 
 * Manages unified inbox for all campaign replies.
 * Aggregates replies from all email accounts in one view.
 */

import EmailMessage from "../models/EmailMessage";
import Campaign from "../models/Campaign";
import Contact from "../models/Contact";
import CampaignEnrollment from "../models/CampaignEnrollment";
import { Types } from "mongoose";

// ============================================
// INBOX SERVICE
// ============================================

class InboxService {
    /**
     * Get all inbox messages (replies) for a workspace
     */
    async getInboxMessages(
        workspaceId: Types.ObjectId,
        filters?: {
            campaign?: string;
            sentiment?: string;
            assignedTo?: string;
            isRead?: boolean;
            search?: string;
        },
        page: number = 1,
        limit: number = 50
    ): Promise<{
        messages: any[];
        total: number;
        page: number;
        totalPages: number;
    }> {
        const query: any = {
            workspaceId,
            replied: true, // Only show messages that have replies
        };

        if (filters?.campaign) {
            query.campaignId = new Types.ObjectId(filters.campaign);
        }

        if (filters?.sentiment) {
            query.replySentiment = filters.sentiment;
        }

        // TODO: Add assignedTo filter when we implement assignment

        if (filters?.search) {
            query.$or = [
                { replySubject: { $regex: filters.search, $options: "i" } },
                { replyBody: { $regex: filters.search, $options: "i" } },
            ];
        }

        const total = await EmailMessage.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        const messages = await EmailMessage.find(query)
            .populate("campaignId", "name")
            .populate("contactId", "name email company")
            .sort({ repliedAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        return {
            messages,
            total,
            page,
            totalPages,
        };
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add isRead field to EmailMessage model
            $set: { "metadata.isRead": true },
        });

        console.log(`✅ Message marked as read: ${messageId}`);
    }

    /**
     * Assign message to user
     */
    async assignToUser(messageId: string, userId: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add assignedTo field to EmailMessage model
            $set: { "metadata.assignedTo": new Types.ObjectId(userId) },
        });

        console.log(`✅ Message assigned to user: ${userId}`);
    }

    /**
     * Label a message
     */
    async labelMessage(messageId: string, label: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add labels field to EmailMessage model
            $addToSet: { "metadata.labels": label },
        });

        console.log(`🏷️ Message labeled: ${label}`);
    }

    /**
     * Process incoming reply (called by webhook or email polling)
     */
    async processReply(
        messageId: string,
        replyData: {
            subject: string;
            body: string;
            receivedAt: Date;
        }
    ): Promise<void> {
        const message = await EmailMessage.findOne({ messageId });
        if (!message) {
            console.warn(`Message not found: ${messageId}`);
            return;
        }

        // Update message with reply
        message.replied = true;
        message.repliedAt = replyData.receivedAt;
        message.replySubject = replyData.subject;
        message.replyBody = replyData.body;
        message.replySentiment = await this.analyzeSentiment(replyData.body) as any;
        await message.save();

        // Update enrollment status
        await CampaignEnrollment.findByIdAndUpdate(message.enrollmentId, {
            status: "replied",
        });

        console.log(`✅ Reply processed for message: ${messageId}`);
    }

    /**
     * Analyze reply sentiment using simple keyword matching
     * In production, use AI/ML for better accuracy
     */
    private async analyzeSentiment(body: string): Promise<string> {
        const lowerBody = body.toLowerCase();

        // Positive keywords
        const positiveKeywords = [
            "interested",
            "yes",
            "sounds good",
            "let's chat",
            "call me",
            "schedule",
            "meeting",
            "demo",
        ];

        // Negative keywords
        const negativeKeywords = [
            "not interested",
            "no thanks",
            "unsubscribe",
            "remove me",
            "stop",
            "spam",
        ];

        // Out of office
        if (
            lowerBody.includes("out of office") ||
            lowerBody.includes("away") ||
            lowerBody.includes("vacation")
        ) {
            return "out_of_office";
        }

        // Unsubscribe
        if (
            lowerBody.includes("unsubscribe") ||
            lowerBody.includes("remove me") ||
            lowerBody.includes("opt out")
        ) {
            return "unsubscribe";
        }

        // Check positive
        for (const keyword of positiveKeywords) {
            if (lowerBody.includes(keyword)) {
                return "positive";
            }
        }

        // Check negative
        for (const keyword of negativeKeywords) {
            if (lowerBody.includes(keyword)) {
                return "negative";
            }
        }

        return "neutral";
    }

    /**
     * Generate AI draft response for a message using Gemini
     */
    async generateAIDraft(messageId: string): Promise<{
        success: boolean;
        draft?: string;
        error?: string;
    }> {
        try {
            const message = await EmailMessage.findById(messageId)
                .populate("contactId", "firstName lastName email company jobTitle tags")
                .populate("campaignId", "name description");

            if (!message) {
                return { success: false, error: "Message not found" };
            }

            // Build context for AI
            const contact = message.contactId as any;
            const campaign = message.campaignId as any;

            const contextInfo = `
Contact Information:
- Name: ${contact?.firstName || ""} ${contact?.lastName || ""}
- Company: ${contact?.company || "Unknown"}
- Job Title: ${contact?.jobTitle || "Unknown"}
- Email: ${contact?.email || ""}
- Tags: ${contact?.tags?.join(", ") || "None"}

Campaign: ${campaign?.name || "Unknown Campaign"}
Campaign Description: ${campaign?.description || "N/A"}

Original Email Subject: ${message.subject}
Original Email Body: ${(message.bodyText || message.bodyHtml || "").substring(0, 500)}

Reply Subject: ${message.replySubject || message.subject}
Reply Body: ${message.replyBody || ""}
Reply Sentiment: ${message.replySentiment || "neutral"}
            `.trim();

            // Use Gemini to generate draft
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `You are a helpful sales assistant drafting a professional email response.

Based on the following context, draft a concise and professional response to the incoming email.

${contextInfo}

Guidelines:
- Be professional but friendly
- Keep the response concise (under 150 words)
- If the sentiment is positive, build on their interest
- If the sentiment is negative/unsubscribe, politely acknowledge
- If out of office, draft a follow-up for when they return
- Use their first name if available
- Do NOT include subject line, just the email body
- End with a clear call-to-action when appropriate

Draft the email response:`;

            const result = await model.generateContent(prompt);
            const draft = result.response.text();

            // Store the draft on the message
            await EmailMessage.findByIdAndUpdate(messageId, {
                $set: {
                    "metadata.aiDraft": draft,
                    "metadata.aiDraftGeneratedAt": new Date(),
                },
            });

            console.log(`🤖 AI draft generated for message: ${messageId}`);

            return {
                success: true,
                draft,
            };
        } catch (err: any) {
            console.error("Failed to generate AI draft:", err);
            return {
                success: false,
                error: err.message || "Failed to generate AI draft",
            };
        }
    }

    /**
     * Get AI draft for a message (if already generated)
     */
    async getAIDraft(messageId: string): Promise<{
        draft?: string;
        generatedAt?: Date;
    }> {
        const message = await EmailMessage.findById(messageId).lean();
        if (!message) return {};

        return {
            draft: (message as any).metadata?.aiDraft,
            generatedAt: (message as any).metadata?.aiDraftGeneratedAt,
        };
    }

    /**
     * Fetch new replies from email accounts
     * Called by cron job
     * 
     * NOTE: This is a placeholder. In production, implement:
     * - IMAP polling for SMTP accounts
     * - Gmail API for Gmail accounts
     * - Webhook receivers for instant notifications
     */
    async fetchNewReplies(): Promise<number> {
        console.log("📥 Fetching new replies... (TODO: Implement IMAP/Gmail API)");
        // TODO: Implement actual email fetching
        return 0;
    }
}

export default new InboxService();
