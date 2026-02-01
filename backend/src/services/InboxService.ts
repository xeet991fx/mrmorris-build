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
import { logger } from "../utils/logger";

// ============================================
// INBOX SERVICE
// ============================================

class InboxService {
    /**
     * Get all inbox messages for a workspace
     * Now supports multiple sources: campaigns, workflows, direct
     */
    async getInboxMessages(
        workspaceId: Types.ObjectId,
        filters?: {
            source?: 'campaign' | 'workflow' | 'direct' | 'all';
            campaign?: string;
            workflow?: string;
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
        };

        // Source filter
        if (filters?.source && filters.source !== 'all') {
            query.source = filters.source;
        }

        // For campaigns, we typically want replied messages
        // For workflows and direct, show all sent emails
        if (filters?.source === 'campaign' || !filters?.source) {
            // Default behavior: only show replied campaign messages
            if (!filters?.source) {
                query.$or = [
                    { source: 'campaign', replied: true },
                    { source: { $in: ['workflow', 'direct'] } }
                ];
            }
        }

        if (filters?.campaign) {
            query.campaignId = new Types.ObjectId(filters.campaign);
        }

        if (filters?.workflow) {
            query.workflowId = new Types.ObjectId(filters.workflow);
        }

        if (filters?.sentiment) {
            query.replySentiment = filters.sentiment;
        }

        if (filters?.isRead !== undefined) {
            query.isRead = filters.isRead;
        }

        if (filters?.search) {
            query.$or = [
                { subject: { $regex: filters.search, $options: "i" } },
                { replySubject: { $regex: filters.search, $options: "i" } },
                { replyBody: { $regex: filters.search, $options: "i" } },
            ];
        }

        const total = await EmailMessage.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        const messages = await EmailMessage.find(query)
            .populate("campaignId", "name")
            .populate("workflowId", "name")
            .populate("contactId", "firstName lastName email company")
            .sort({ sentAt: -1 })
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
     * Get inbox stats by source
     */
    async getStats(workspaceId: Types.ObjectId): Promise<{
        all: number;
        campaigns: number;
        workflows: number;
        direct: number;
        unread: number;
    }> {
        const baseQuery = { workspaceId };

        const [all, campaigns, workflows, direct, unread] = await Promise.all([
            EmailMessage.countDocuments({
                ...baseQuery,
                $or: [
                    { source: 'campaign', replied: true },
                    { source: { $in: ['workflow', 'direct'] } }
                ]
            }),
            EmailMessage.countDocuments({ ...baseQuery, source: 'campaign', replied: true }),
            EmailMessage.countDocuments({ ...baseQuery, source: 'workflow' }),
            EmailMessage.countDocuments({ ...baseQuery, source: 'direct' }),
            EmailMessage.countDocuments({ ...baseQuery, isRead: false }),
        ]);

        return { all, campaigns, workflows, direct, unread };
    }

    /**
     * Get inbox messages grouped by source with subdivisions
     * Now groups emails by contact within each campaign/workflow to create conversations
     */
    async getGroupedInbox(workspaceId: Types.ObjectId): Promise<{
        campaigns: Array<{
            id: string;
            name: string;
            count: number;
            conversations: Array<{
                contactId: string;
                contactName: string;
                contactEmail: string;
                messageCount: number;
                unreadCount: number;
                latestMessage: any;
                messages: any[];
            }>;
        }>;
        workflows: Array<{
            id: string;
            name: string;
            count: number;
            conversations: Array<{
                contactId: string;
                contactName: string;
                contactEmail: string;
                messageCount: number;
                unreadCount: number;
                latestMessage: any;
                messages: any[];
            }>;
        }>;
        direct: Array<{
            contactId: string;
            contactName: string;
            contactEmail: string;
            messageCount: number;
            unreadCount: number;
            latestMessage: any;
            messages: any[];
        }>;
    }> {
        // Get all inbox messages
        const allMessages = await EmailMessage.find({ workspaceId })
            .populate("campaignId", "name")
            .populate("workflowId", "name")
            .populate("contactId", "firstName lastName email company")
            .sort({ sentAt: -1 })
            .lean();

        // Helper to get contact key (use contactId or email as fallback)
        const getContactKey = (msg: any): string => {
            if (msg.contactId && typeof msg.contactId === 'object') {
                return msg.contactId._id.toString();
            }
            if (msg.contactId) {
                return msg.contactId.toString();
            }
            return msg.toEmail || msg.fromEmail || 'unknown';
        };

        // Helper to get contact info
        const getContactInfo = (msg: any): { name: string; email: string } => {
            if (msg.contactId && typeof msg.contactId === 'object') {
                const c = msg.contactId;
                const name = `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.email || 'Unknown';
                return { name, email: c.email || msg.toEmail || '' };
            }
            return {
                name: msg.toEmail || msg.fromEmail || 'Unknown',
                email: msg.toEmail || msg.fromEmail || ''
            };
        };

        // Group by campaigns -> then by contact
        const campaignGroups = new Map<string, {
            id: string;
            name: string;
            contactConversations: Map<string, any[]>;
        }>();

        // Group by workflows -> then by contact
        const workflowGroups = new Map<string, {
            id: string;
            name: string;
            contactConversations: Map<string, any[]>;
        }>();

        // Direct emails grouped by contact
        const directConversations = new Map<string, any[]>();

        for (const msg of allMessages) {
            const contactKey = getContactKey(msg);

            if (msg.source === 'campaign' && msg.campaignId) {
                const campaign = msg.campaignId as any;
                const campaignId = campaign._id.toString();

                if (!campaignGroups.has(campaignId)) {
                    campaignGroups.set(campaignId, {
                        id: campaignId,
                        name: campaign.name || 'Unnamed Campaign',
                        contactConversations: new Map()
                    });
                }

                const group = campaignGroups.get(campaignId)!;
                if (!group.contactConversations.has(contactKey)) {
                    group.contactConversations.set(contactKey, []);
                }
                group.contactConversations.get(contactKey)!.push(msg);

            } else if (msg.source === 'workflow' && msg.workflowId) {
                const workflow = msg.workflowId as any;
                const workflowId = workflow._id.toString();

                if (!workflowGroups.has(workflowId)) {
                    workflowGroups.set(workflowId, {
                        id: workflowId,
                        name: workflow.name || 'Unnamed Workflow',
                        contactConversations: new Map()
                    });
                }

                const group = workflowGroups.get(workflowId)!;
                if (!group.contactConversations.has(contactKey)) {
                    group.contactConversations.set(contactKey, []);
                }
                group.contactConversations.get(contactKey)!.push(msg);

            } else if (msg.source === 'direct') {
                if (!directConversations.has(contactKey)) {
                    directConversations.set(contactKey, []);
                }
                directConversations.get(contactKey)!.push(msg);
            }
        }

        // Helper to build conversation object from messages
        const buildConversation = (contactKey: string, messages: any[]) => {
            // Sort messages chronologically (oldest first) for display
            const sortedMessages = [...messages].sort((a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
            );

            // Latest message for preview (most recent)
            const latestMessage = messages[0]; // Already sorted desc from query
            const contactInfo = getContactInfo(latestMessage);
            const unreadCount = messages.filter(m => !m.isRead && m.replied).length;

            return {
                contactId: contactKey,
                contactName: contactInfo.name,
                contactEmail: contactInfo.email,
                messageCount: messages.length,
                unreadCount,
                latestMessage,
                messages: sortedMessages,
            };
        };

        // Build final response
        const campaigns = Array.from(campaignGroups.values()).map(group => ({
            id: group.id,
            name: group.name,
            count: Array.from(group.contactConversations.values()).reduce((sum, msgs) => sum + msgs.length, 0),
            conversations: Array.from(group.contactConversations.entries()).map(([key, msgs]) =>
                buildConversation(key, msgs)
            ).sort((a, b) =>
                new Date(b.latestMessage.sentAt).getTime() - new Date(a.latestMessage.sentAt).getTime()
            ),
        }));

        const workflows = Array.from(workflowGroups.values()).map(group => ({
            id: group.id,
            name: group.name,
            count: Array.from(group.contactConversations.values()).reduce((sum, msgs) => sum + msgs.length, 0),
            conversations: Array.from(group.contactConversations.entries()).map(([key, msgs]) =>
                buildConversation(key, msgs)
            ).sort((a, b) =>
                new Date(b.latestMessage.sentAt).getTime() - new Date(a.latestMessage.sentAt).getTime()
            ),
        }));

        const direct = Array.from(directConversations.entries()).map(([key, msgs]) =>
            buildConversation(key, msgs)
        ).sort((a, b) =>
            new Date(b.latestMessage.sentAt).getTime() - new Date(a.latestMessage.sentAt).getTime()
        );

        return { campaigns, workflows, direct };
    }

    /**
     * Mark message as read
     */
    async markAsRead(messageId: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add isRead field to EmailMessage model
            $set: { "metadata.isRead": true },
        });

        logger.info("Message marked as read", { messageId });
    }

    /**
     * Assign message to user
     */
    async assignToUser(messageId: string, userId: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add assignedTo field to EmailMessage model
            $set: { "metadata.assignedTo": new Types.ObjectId(userId) },
        });

        logger.info("Message assigned to user", { messageId, userId });
    }

    /**
     * Label a message
     */
    async labelMessage(messageId: string, label: string): Promise<void> {
        await EmailMessage.findByIdAndUpdate(messageId, {
            // TODO: Add labels field to EmailMessage model
            $addToSet: { "metadata.labels": label },
        });

        logger.info("Message labeled", { messageId, label });
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
            logger.warn("Message not found", { messageId });
            return;
        }

        // If already replied, check if this is a newer reply
        if (message.replied && message.repliedAt && new Date(replyData.receivedAt) <= new Date(message.repliedAt)) {
            logger.debug("Skipping older reply", { messageId });
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

        logger.info("Reply processed for message", { messageId });
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
            logger.debug("Starting AI draft generation", { messageId });

            const message = await EmailMessage.findById(messageId)
                .populate("campaignId", "name description");

            if (!message) {
                return { success: false, error: "Message not found" };
            }

            // Check if GEMINI_API_KEY is configured
            if (!process.env.GEMINI_API_KEY) {
                logger.error("GEMINI_API_KEY is not configured");
                return { success: false, error: "AI service is not configured. Please add GEMINI_API_KEY to environment variables." };
            }

            // Fetch full contact data with all fields
            const Contact = (await import("../models/Contact")).default;
            const contact = message.contactId
                ? await Contact.findById(message.contactId).populate("companyId").lean()
                : null;

            const campaign = message.campaignId as any;

            const contactName = contact?.firstName || message.toEmail?.split('@')[0] || "there";

            logger.debug("Building context for contact", { contactName });

            // Build rich contact profile
            let contactProfile = "";
            if (contact) {
                contactProfile = `
CONTACT PROFILE FROM CRM:
- Full Name: ${contact.firstName || ""} ${contact.lastName || ""}
- Email: ${contact.email || ""}
- Phone: ${contact.phone || "Not available"}
- Company: ${contact.company || "Unknown"}
- Job Title: ${contact.jobTitle || contact.title || "Unknown"}
- Status: ${contact.status || "lead"} | Lifecycle Stage: ${contact.lifecycleStage || "lead"}
- Location: ${[contact.city, contact.state, contact.country].filter(Boolean).join(", ") || "Unknown"}
- Source: ${contact.source || "Unknown"}
- Tags: ${contact.tags?.join(", ") || "None"}
${contact.linkedin ? `- LinkedIn: ${contact.linkedin}` : ""}
${contact.website ? `- Website: ${contact.website}` : ""}

ENGAGEMENT DATA:
- Quality Score: ${contact.qualityScore || "N/A"}/100 (Grade: ${contact.qualityGrade || "N/A"})
- Intent Score: ${contact.intentScore || 0} (buying signals)
- Last Contacted: ${contact.lastContactedAt ? new Date(contact.lastContactedAt).toLocaleDateString() : "Never"}
${contact.aiInsights?.sentiment ? `- AI Sentiment: ${contact.aiInsights.sentiment}` : ""}
${contact.aiInsights?.engagementScore ? `- Engagement Score: ${contact.aiInsights.engagementScore}/100` : ""}
${contact.aiInsights?.recommendedActions?.length ? `- Recommended Actions: ${contact.aiInsights.recommendedActions.join(", ")}` : ""}

${contact.notes ? `NOTES:\n${contact.notes}` : ""}
`.trim();
            } else {
                contactProfile = `LIMITED CONTACT INFO (not in CRM yet):
- Email: ${message.toEmail || "Unknown"}`;
            }

            // Use Gemini to generate draft
            const { GoogleGenerativeAI } = require("@google/generative-ai");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const prompt = `You are an expert sales representative writing a highly personalized email reply. You have access to the contact's full CRM profile - use this information to make your response relevant and valuable to them.

${contactProfile}

CAMPAIGN INFO:
- Campaign Name: ${campaign?.name || "Direct Email"}
- Campaign Description: ${campaign?.description || "N/A"}

ORIGINAL EMAIL YOU SENT:
Subject: ${message.subject}
Body: ${(message.bodyText || message.bodyHtml?.replace(/<[^>]*>/g, '') || "").substring(0, 1000)}

THEIR REPLY TO YOU:
Subject: ${message.replySubject || "Re: " + message.subject}
Body: ${message.replyBody || "(No reply content)"}

Detected Sentiment: ${message.replySentiment || "neutral"}

INSTRUCTIONS:
1. Write ONLY the email body - no subject line, no "Subject:" prefix
2. Address them by their first name: "${contactName}"
3. Reference something specific from THEIR reply to show you read it
4. Use their CRM data to personalize (job title, company, interests from tags, location, etc.)
5. If they're a high-intent lead (intent score > 50), be more direct about next steps
6. If they're early stage (lead/subscriber), focus on providing value first
7. Be conversational and human, not robotic or templated
8. Keep it concise (3-5 sentences max)
9. Include a clear next step or question to keep the conversation going
10. Sign off with just your first name or naturally (no formal signature block)

${message.replySentiment === 'positive' ? "Their tone is positive - capitalize on their interest! Suggest a concrete next step like a call, demo, or specific resource." : ""}
${message.replySentiment === 'negative' || message.replySentiment === 'unsubscribe' ? "They seem uninterested - be respectful, acknowledge their position, and leave the door open. Don't be pushy." : ""}
${message.replySentiment === 'out_of_office' ? "They're out of office - note when they return and offer to follow up then." : ""}
${contact?.qualityGrade === 'A' || contact?.qualityGrade === 'B' ? "This is a high-quality lead - prioritize moving them to the next stage." : ""}
${(contact?.intentScore || 0) > 50 ? "High intent detected - they're showing buying signals. Be more direct about solutions." : ""}

Write the email reply now (body only, no subject):`;

            logger.debug("Calling Gemini API with enriched context");
            const result = await model.generateContent(prompt);
            let draft = result.response.text();

            // Clean up the response - remove any subject line if AI included it
            draft = draft.replace(/^Subject:.*\n/i, '').trim();
            draft = draft.replace(/^Re:.*\n/i, '').trim();

            logger.debug("Received draft from AI", { draftLength: draft.length });

            // Store the draft on the message
            await EmailMessage.findByIdAndUpdate(messageId, {
                $set: {
                    "metadata.aiDraft": draft,
                    "metadata.aiDraftGeneratedAt": new Date(),
                },
            });

            logger.info("AI draft generated for message", { messageId });

            return {
                success: true,
                draft,
            };
        } catch (err: any) {
            logger.error("Failed to generate AI draft", { error: err, messageId });
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
     * Get all messages in a thread (conversation)
     * Returns the original message plus all replies in chronological order
     */
    async getThreadMessages(messageId: string): Promise<{
        success: boolean;
        messages: any[];
        error?: string;
    }> {
        try {
            const originalMessage = await EmailMessage.findById(messageId)
                .populate("contactId", "firstName lastName email")
                .lean();

            if (!originalMessage) {
                return { success: false, messages: [], error: "Message not found" };
            }

            // Find all messages in the thread using threadId or messageId
            const threadId = originalMessage.threadId || originalMessage.messageId;

            const threadMessages = await EmailMessage.find({
                $or: [
                    { _id: messageId },
                    { threadId: threadId },
                    { inReplyTo: originalMessage.messageId },
                    { messageId: { $in: [originalMessage.inReplyTo].filter(Boolean) } },
                ]
            })
                .populate("contactId", "firstName lastName email")
                .sort({ sentAt: 1 })
                .lean();

            return {
                success: true,
                messages: threadMessages,
            };
        } catch (error: any) {
            logger.error("Failed to get thread messages", { error, messageId });
            return { success: false, messages: [], error: error.message };
        }
    }

    /**
     * Send a reply email from the inbox
     * Uses the email integration to send via Gmail API or SMTP
     */
    async sendReply(
        messageId: string,
        body: string,
        subject?: string
    ): Promise<{
        success: boolean;
        message?: string;
        sentReply?: any;
        error?: string;
    }> {
        try {
            // Get the original message - first get raw to preserve ObjectIds
            const originalMessageRaw = await EmailMessage.findById(messageId);

            if (!originalMessageRaw) {
                return { success: false, error: "Original message not found" };
            }

            // Store the original contactId before populating
            const originalContactId = originalMessageRaw.contactId;
            const originalCampaignId = originalMessageRaw.campaignId;
            const originalWorkflowId = originalMessageRaw.workflowId;
            const originalWorkspaceId = originalMessageRaw.workspaceId;

            // Now get populated version for contact info
            const originalMessage = await EmailMessage.findById(messageId)
                .populate("contactId", "firstName lastName email")
                .populate("campaignId", "name workspaceId");

            if (!originalMessage) {
                return { success: false, error: "Original message not found" };
            }

            logger.debug("Attempting to send reply for message", { messageId });
            logger.debug("Original message details", { from: originalMessage.fromEmail, to: originalMessage.toEmail });

            // Import models
            const EmailAccount = (await import("../models/EmailAccount")).default;
            const EmailIntegration = (await import("../models/EmailIntegration")).default;

            // Try to find the email account/integration
            let emailAccount: any = null;
            let emailIntegration: any = null;
            let senderEmail = originalMessage.fromEmail;

            // First try EmailAccount (for SMTP-based campaigns)
            if (originalMessage.fromAccountId) {
                emailAccount = await EmailAccount.findById(originalMessage.fromAccountId);
                logger.debug("Found EmailAccount by fromAccountId", { found: !!emailAccount });
            }

            // If no EmailAccount, try by email
            if (!emailAccount) {
                emailAccount = await EmailAccount.findOne({
                    email: originalMessage.fromEmail,
                    workspaceId: originalMessage.workspaceId,
                    status: 'active',
                });
                logger.debug("Found EmailAccount by email", { found: !!emailAccount });
            }

            // If still no EmailAccount, try EmailIntegration (for Gmail API)
            if (!emailAccount) {
                if (originalMessage.fromAccountId) {
                    emailIntegration = await EmailIntegration.findById(originalMessage.fromAccountId)
                        .select("+accessToken +refreshToken");
                }

                if (!emailIntegration) {
                    emailIntegration = await EmailIntegration.findOne({
                        email: originalMessage.fromEmail,
                        workspaceId: originalMessage.workspaceId,
                        isActive: true,
                    }).select("+accessToken +refreshToken");
                }
                logger.debug("Found EmailIntegration", { found: !!emailIntegration });
            }

            if (!emailAccount && !emailIntegration) {
                return { success: false, error: "Email account not found. Please reconnect your email account." };
            }

            // Determine sender email
            if (emailAccount) {
                senderEmail = emailAccount.email;
            } else if (emailIntegration) {
                senderEmail = emailIntegration.email;
            }

            // Prepare reply subject
            const replySubject = subject || (originalMessage.replySubject
                ? `Re: ${originalMessage.replySubject.replace(/^re:\s*/i, "")}`
                : `Re: ${originalMessage.subject.replace(/^re:\s*/i, "")}`);

            // Get the recipient email (the person who replied to us - the contact)
            const contact = originalMessage.contactId as any;
            const recipientEmail = contact?.email || originalMessage.toEmail;

            if (!recipientEmail) {
                return { success: false, error: "Recipient email not found" };
            }

            logger.debug("Sending reply", { from: senderEmail, to: recipientEmail });
            logger.debug("Reply subject", { subject: replySubject });

            // Generate a unique message ID for this reply
            const domain = senderEmail.split("@")[1] || "localhost";
            const replyMessageId = `<reply-${Date.now()}-${Math.random().toString(36).substring(2)}@${domain}>`;

            // Send via appropriate method
            // Priority: EmailIntegration (Gmail API) > EmailAccount (Gmail) > EmailAccount (SMTP)
            try {
                if (emailIntegration && emailIntegration.provider === "gmail") {
                    logger.debug("Sending via EmailIntegration (Gmail API)");
                    await this.sendReplyViaGmail(emailIntegration, recipientEmail, replySubject, body, originalMessage, replyMessageId);
                } else if (emailAccount && emailAccount.provider === "gmail" && emailAccount.accessToken) {
                    logger.debug("Sending via EmailAccount (Gmail)");
                    await this.sendReplyViaGmailAccount(emailAccount, recipientEmail, replySubject, body, originalMessage, replyMessageId);
                } else if (emailAccount && emailAccount.provider === "smtp") {
                    logger.debug("Sending via EmailAccount (SMTP)");
                    await this.sendReplyViaSMTPAccount(emailAccount, recipientEmail, replySubject, body, originalMessage, replyMessageId);
                } else {
                    // Last resort - try to find any active EmailIntegration for the workspace
                    logger.debug("Trying to find any active EmailIntegration for workspace");
                    const fallbackIntegration = await EmailIntegration.findOne({
                        workspaceId: originalMessage.workspaceId,
                        isActive: true,
                        provider: "gmail",
                    }).select("+accessToken +refreshToken");

                    if (fallbackIntegration) {
                        logger.debug("Found fallback EmailIntegration", { email: fallbackIntegration.email });
                        senderEmail = fallbackIntegration.email;
                        await this.sendReplyViaGmail(fallbackIntegration, recipientEmail, replySubject, body, originalMessage, replyMessageId);
                    } else {
                        return { success: false, error: `No valid email provider found. EmailAccount provider: ${emailAccount?.provider}, has tokens: ${!!emailAccount?.accessToken}` };
                    }
                }
            } catch (sendError: any) {
                logger.error("Error sending email", { error: sendError });
                return { success: false, error: `Failed to send: ${sendError.message}` };
            }

            // Create a new EmailMessage record for the sent reply
            // Use the preserved ObjectIds from before population
            const sentReply = await EmailMessage.create({
                source: originalMessage.source || 'direct',
                campaignId: originalCampaignId,
                workflowId: originalWorkflowId,
                contactId: originalContactId,
                workspaceId: originalWorkspaceId,
                fromAccountId: emailAccount?._id || emailIntegration?._id,
                fromEmail: senderEmail,
                toEmail: recipientEmail,
                subject: replySubject,
                bodyHtml: body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`,
                bodyText: body,
                messageId: replyMessageId,
                threadId: originalMessage.threadId || originalMessage.messageId,
                inReplyTo: originalMessage.replyBody ? undefined : originalMessage.messageId,
                sentAt: new Date(),
                opened: false,
                clicked: false,
                replied: false,
                bounced: false,
                isRead: true, // Mark our own sent message as read
            });

            logger.info("Reply sent from inbox", { subject: replySubject, to: recipientEmail });

            return {
                success: true,
                message: "Reply sent successfully",
                sentReply: sentReply.toObject(),
            };
        } catch (error: any) {
            logger.error("Failed to send reply", { error, messageId });
            return { success: false, error: error.message || "Failed to send reply" };
        }
    }

    /**
     * Send reply via Gmail API (using EmailIntegration)
     */
    private async sendReplyViaGmail(
        integration: any,
        recipientEmail: string,
        subject: string,
        body: string,
        originalMessage: any,
        replyMessageId: string
    ): Promise<void> {
        const { google } = await import("googleapis");

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
        );

        oauth2Client.setCredentials({
            access_token: integration.getAccessToken(),
            refresh_token: integration.getRefreshToken(),
        });

        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        // Build the HTML body
        const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

        // Build email with proper reply headers
        const emailLines = [
            `From: ${integration.email}`,
            `To: ${recipientEmail}`,
            `Subject: ${subject}`,
            `Message-ID: ${replyMessageId}`,
        ];

        // Add In-Reply-To header if replying to original message
        if (originalMessage.messageId) {
            emailLines.push(`In-Reply-To: ${originalMessage.messageId}`);
            emailLines.push(`References: ${originalMessage.messageId}`);
        }

        emailLines.push('Content-Type: text/html; charset=utf-8');
        emailLines.push('');
        emailLines.push(htmlBody);

        const rawMessage = emailLines.join('\r\n');
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });
    }

    /**
     * Send reply via Gmail API (using EmailAccount)
     */
    private async sendReplyViaGmailAccount(
        account: any,
        recipientEmail: string,
        subject: string,
        body: string,
        originalMessage: any,
        replyMessageId: string
    ): Promise<void> {
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

        // Build the HTML body
        const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

        // Build email with proper reply headers
        const emailLines = [
            `From: ${account.email}`,
            `To: ${recipientEmail}`,
            `Subject: ${subject}`,
            `Message-ID: ${replyMessageId}`,
        ];

        // Add In-Reply-To header if replying to original message
        if (originalMessage.messageId) {
            emailLines.push(`In-Reply-To: ${originalMessage.messageId}`);
            emailLines.push(`References: ${originalMessage.messageId}`);
        }

        emailLines.push('Content-Type: text/html; charset=utf-8');
        emailLines.push('');
        emailLines.push(htmlBody);

        const rawMessage = emailLines.join('\r\n');
        const encodedMessage = Buffer.from(rawMessage)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage },
        });
    }

    /**
     * Send reply via SMTP (using EmailAccount)
     */
    private async sendReplyViaSMTPAccount(
        account: any,
        recipientEmail: string,
        subject: string,
        body: string,
        originalMessage: any,
        replyMessageId: string
    ): Promise<void> {
        const nodemailer = await import("nodemailer");

        const transporter = nodemailer.createTransport({
            host: account.smtpHost,
            port: account.smtpPort,
            secure: account.smtpPort === 465,
            auth: {
                user: account.smtpUser || account.email,
                pass: account.smtpPassword,
            },
        });

        const htmlBody = body.includes('<p>') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;

        const mailOptions: any = {
            from: account.email,
            to: recipientEmail,
            subject: subject,
            text: body,
            html: htmlBody,
            messageId: replyMessageId,
        };

        // Add reply headers
        if (originalMessage.messageId) {
            mailOptions.inReplyTo = originalMessage.messageId;
            mailOptions.references = originalMessage.messageId;
        }

        await transporter.sendMail(mailOptions);
    }

    /**
     * Fetch new replies from email accounts
     * Called by cron job every 10 minutes or manually for a specific workspace
     */
    async fetchNewReplies(workspaceId?: string): Promise<number> {
        logger.info("Fetching new replies from Gmail", { workspaceId: workspaceId || "all" });

        let totalRepliesProcessed = 0;

        try {
            // Get Gmail integrations - filter by workspace if provided
            const EmailIntegration = (await import("../models/EmailIntegration")).default;
            const IntegrationCredential = (await import("../models/IntegrationCredential")).default;
            const { Types } = await import("mongoose");

            const query: any = {
                provider: "gmail",
                isActive: true,
            };

            if (workspaceId) {
                query.workspaceId = workspaceId;
            }

            const integrations = await EmailIntegration.find(query).select("+accessToken +refreshToken");

            logger.debug("Found Gmail integrations (EmailIntegration)", { count: integrations.length, workspaceId: workspaceId || "all" });

            // ALSO check IntegrationCredential model (where OAuth flow saves Gmail credentials)
            const credQuery: any = {
                type: "gmail",
                status: "Connected",
            };
            if (workspaceId) {
                credQuery.workspaceId = new Types.ObjectId(workspaceId);
            }

            const gmailCredentials = await IntegrationCredential.find(credQuery).select("+encryptedData");
            logger.debug("Found Gmail credentials (IntegrationCredential)", { count: gmailCredentials.length });

            // Combine both sources - create unified integration objects
            const allIntegrations: Array<{
                workspaceId: any;
                getAccessToken: () => string;
                getRefreshToken: () => string;
                email: string;
                save: () => Promise<void>;
                lastSyncAt?: Date;
            }> = [];

            // Add EmailIntegration entries
            for (const integration of integrations) {
                allIntegrations.push({
                    workspaceId: integration.workspaceId,
                    getAccessToken: () => integration.getAccessToken(),
                    getRefreshToken: () => integration.getRefreshToken(),
                    email: integration.email,
                    save: async () => {
                        integration.lastSyncAt = new Date();
                        await integration.save();
                    },
                    lastSyncAt: integration.lastSyncAt,
                });
            }

            // Add IntegrationCredential entries (avoid duplicates by workspaceId)
            const existingWorkspaces = new Set(integrations.map(i => i.workspaceId.toString()));
            for (const cred of gmailCredentials) {
                if (!existingWorkspaces.has(cred.workspaceId.toString())) {
                    try {
                        const credData = cred.getCredentialData();
                        allIntegrations.push({
                            workspaceId: cred.workspaceId,
                            getAccessToken: () => credData.accessToken,
                            getRefreshToken: () => credData.refreshToken,
                            email: cred.profileInfo?.email || "",
                            save: async () => {
                                cred.lastUsed = new Date();
                                await cred.save();
                            },
                            lastSyncAt: cred.lastUsed,
                        });
                    } catch (e: any) {
                        logger.warn("Failed to decrypt IntegrationCredential", { id: cred._id, error: e.message });
                    }
                }
            }

            logger.debug("Total Gmail integrations to process", { count: allIntegrations.length });

            if (allIntegrations.length === 0) {
                logger.debug("No active Gmail integrations found");
                return 0;
            }

            const { google } = await import("googleapis");

            for (const integration of allIntegrations) {
                try {
                    logger.debug("Processing integration", { workspaceId: integration.workspaceId });

                    // Setup OAuth client
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET,
                        `${process.env.BACKEND_URL || "http://localhost:5000"}/api/email/callback/gmail`
                    );

                    oauth2Client.setCredentials({
                        access_token: integration.getAccessToken(),
                        refresh_token: integration.getRefreshToken(),
                    });

                    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

                    // Get messages from inbox - look at last 7 days for testing
                    const query = `in:inbox -from:me newer_than:7d`;
                    logger.debug("Gmail query", { query });

                    const listResponse = await gmail.users.messages.list({
                        userId: "me",
                        q: query,
                        maxResults: 50,
                    });

                    const messages = listResponse.data.messages || [];
                    logger.debug("Found emails in inbox", { count: messages.length });

                    // Get all campaign emails we've sent from this workspace
                    const sentEmails = await EmailMessage.find({
                        workspaceId: integration.workspaceId,
                    }).lean();

                    // Also get all contacts for this workspace to detect replies from known contacts
                    const contacts = await Contact.find({
                        workspaceId: integration.workspaceId,
                    }).select("email firstName lastName").lean();

                    logger.debug("Found sent campaign emails and contacts", { sentEmails: sentEmails.length, contacts: contacts.length });

                    // Create maps for matching
                    const sentToEmails = new Map<string, any>();
                    const sentSubjects = new Map<string, any>();
                    const contactEmails = new Map<string, any>();

                    for (const email of sentEmails) {
                        if (email.toEmail) {
                            sentToEmails.set(email.toEmail.toLowerCase(), email);
                        }
                        if (email.subject) {
                            const cleanSubject = email.subject.replace(/^re:\s*/i, "").toLowerCase().trim();
                            sentSubjects.set(cleanSubject, email);
                        }
                    }

                    for (const contact of contacts) {
                        if (contact.email) {
                            contactEmails.set(contact.email.toLowerCase(), contact);
                        }
                    }

                    logger.debug("Tracking recipients, subjects, and contacts", { recipients: sentToEmails.size, subjects: sentSubjects.size, contacts: contactEmails.size });

                    for (const msg of messages) {
                        try {
                            // Get full message
                            const fullMessage = await gmail.users.messages.get({
                                userId: "me",
                                id: msg.id!,
                                format: "full",
                            });

                            const headers = fullMessage.data.payload?.headers || [];
                            const getHeader = (name: string) =>
                                headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

                            const from = getHeader("From");
                            const subject = getHeader("Subject");
                            const date = getHeader("Date");
                            const inReplyTo = getHeader("In-Reply-To");
                            const references = getHeader("References");

                            // Extract sender email
                            const fromEmail = from.match(/<(.+?)>/)?.[1] || from.split(" ")[0];
                            const cleanSubject = subject.replace(/^re:\s*/i, "").toLowerCase().trim();

                            logger.debug("Checking email", { fromEmail: "***" });

                            // Try to match by sender email first (sent campaign email)
                            let originalEmail = sentToEmails.get(fromEmail.toLowerCase());
                            let matchedBy = "campaign_recipient";
                            let matchedContact = null;

                            // If not found by email, try matching by subject
                            if (!originalEmail && subject.toLowerCase().startsWith("re:")) {
                                originalEmail = sentSubjects.get(cleanSubject);
                                matchedBy = "subject";
                            }

                            // If still no match, check if sender is a known contact (reply from contact)
                            if (!originalEmail) {
                                matchedContact = contactEmails.get(fromEmail.toLowerCase());
                                if (matchedContact) {
                                    matchedBy = "contact";
                                    logger.debug("Email from known contact", { matchType: "contact" });
                                } else {
                                    // Not a known contact or campaign recipient - skip
                                    continue;
                                }
                            } else {
                                logger.debug("Matched original email", { matchedBy, originalEmailId: originalEmail._id });
                            }

                            // Check if this is actually a reply
                            const isReply = subject.toLowerCase().startsWith("re:") ||
                                inReplyTo ||
                                references;

                            if (!isReply) {
                                logger.debug("Not a reply - skipping", { subject, hasRePrefix: subject.toLowerCase().startsWith("re:") });
                                continue;
                            }

                            // Get email body
                            let body = "";
                            const parts = fullMessage.data.payload?.parts || [];
                            if (parts.length > 0) {
                                for (const part of parts) {
                                    if (part.mimeType === "text/plain" && part.body?.data) {
                                        body = Buffer.from(part.body.data, "base64").toString("utf-8");
                                        break;
                                    }
                                }
                            } else if (fullMessage.data.payload?.body?.data) {
                                body = Buffer.from(fullMessage.data.payload.body.data, "base64").toString("utf-8");
                            }

                            // Process reply based on match type
                            if (originalEmail) {
                                // We have an original sent email - update it
                                await this.processReply(originalEmail.messageId, {
                                    subject,
                                    body,
                                    receivedAt: new Date(date),
                                });
                                totalRepliesProcessed++;
                                logger.info("Reply processed", { count: 1 });
                            } else if (matchedContact) {
                                // Reply from a known contact (no original campaign email)
                                // Log for visibility but don't process as there's no original message
                                logger.debug("Reply from contact with no original campaign email");
                                totalRepliesProcessed++;
                            }

                        } catch (msgError: any) {
                            logger.error("Error processing message", { messageId: msg.id, error: msgError.message });
                        }
                    }

                    // Update last sync time
                    await integration.save();

                } catch (integrationError: any) {
                    logger.error("Error fetching replies for integration", { error: integrationError.message });
                }
            }

        } catch (error: any) {
            logger.error("Error in fetchNewReplies", { error: error.message });
        }

        logger.info("Processed new replies", { count: totalRepliesProcessed });
        return totalRepliesProcessed;
    }
}

export default new InboxService();
