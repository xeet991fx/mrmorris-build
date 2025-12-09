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
