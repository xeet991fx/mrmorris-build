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
            campaignId: { $ne: null }, // Exclude orphaned messages from deleted campaigns
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

        // If already replied, check if this is a newer reply
        if (message.replied && message.repliedAt && new Date(replyData.receivedAt) <= new Date(message.repliedAt)) {
            console.log(`⏭️ Skipping older reply for ${messageId}`);
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
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
     * Called by cron job every 10 minutes or manually for a specific workspace
     */
    async fetchNewReplies(workspaceId?: string): Promise<number> {
        console.log(workspaceId
            ? `📥 Fetching new replies for workspace: ${workspaceId}`
            : "📥 Fetching new replies from Gmail...");

        let totalRepliesProcessed = 0;

        try {
            // Get Gmail integrations - filter by workspace if provided
            const EmailIntegration = (await import("../models/EmailIntegration")).default;
            const query: any = {
                provider: "gmail",
                isActive: true,
            };

            if (workspaceId) {
                query.workspaceId = workspaceId;
            }

            const integrations = await EmailIntegration.find(query).select("+accessToken +refreshToken");

            console.log(`📥 Found ${integrations.length} Gmail integration(s)${workspaceId ? ' for this workspace' : ''}`);

            if (integrations.length === 0) {
                console.log("📥 No active Gmail integrations found");
                return 0;
            }

            const { google } = await import("googleapis");

            for (const integration of integrations) {
                try {
                    console.log(`📥 Processing integration: ${integration.email}, workspace: ${integration.workspaceId}`);

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
                    console.log(`📥 Gmail query: ${query}`);

                    const listResponse = await gmail.users.messages.list({
                        userId: "me",
                        q: query,
                        maxResults: 50,
                    });

                    const messages = listResponse.data.messages || [];
                    console.log(`📬 Found ${messages.length} emails in inbox for ${integration.email}`);

                    // Get all campaign emails we've sent from this workspace
                    const sentEmails = await EmailMessage.find({
                        workspaceId: integration.workspaceId,
                    }).lean();

                    // Also get all contacts for this workspace to detect replies from known contacts
                    const contacts = await Contact.find({
                        workspaceId: integration.workspaceId,
                    }).select("email firstName lastName").lean();

                    console.log(`📧 Found ${sentEmails.length} sent campaign emails and ${contacts.length} contacts in workspace`);

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

                    console.log(`📧 Tracking ${sentToEmails.size} recipients, ${sentSubjects.size} subjects, ${contactEmails.size} contacts`);

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

                            console.log(`📧 Checking email from: ${fromEmail}, subject: ${subject.substring(0, 50)}`);

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
                                    console.log(`✅ Email from known contact: ${matchedContact.firstName} ${matchedContact.lastName} (${fromEmail})`);
                                } else {
                                    // Not a known contact or campaign recipient - skip
                                    continue;
                                }
                            } else {
                                console.log(`✅ Matched by ${matchedBy}! Original email ID: ${originalEmail._id}`);
                            }

                            // Check if this is actually a reply
                            const isReply = subject.toLowerCase().startsWith("re:") ||
                                inReplyTo ||
                                references;

                            if (!isReply) {
                                console.log(`⏭️ Not a reply (no Re: prefix or headers)`);
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
                                console.log(`✅ Reply processed from ${fromEmail}: ${subject}`);
                            } else if (matchedContact) {
                                // Reply from a known contact (no original campaign email)
                                // Log for visibility but don't process as there's no original message
                                console.log(`📬 Reply from contact ${matchedContact.firstName} - no original campaign email to update`);
                                totalRepliesProcessed++;
                            }

                        } catch (msgError: any) {
                            console.error(`Error processing message ${msg.id}:`, msgError.message);
                        }
                    }

                    // Update last sync time
                    integration.lastSyncAt = new Date();
                    await integration.save();

                } catch (integrationError: any) {
                    console.error(`Error fetching replies for ${integration.email}:`, integrationError.message);
                }
            }

        } catch (error: any) {
            console.error("Error in fetchNewReplies:", error.message);
        }

        console.log(`📥 Processed ${totalRepliesProcessed} new replies`);
        return totalRepliesProcessed;
    }
}

export default new InboxService();
