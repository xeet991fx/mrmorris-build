/**
 * Campaign Worker Agent
 * 
 * Handles email campaigns: create, enroll contacts, send, get stats.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import Campaign from "../../models/Campaign";
import CampaignEnrollment from "../../models/CampaignEnrollment";
import Contact from "../../models/Contact";
import { createSafeRegex } from "../utils/escapeRegex";
async function executeCampaignTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_campaign": {
            const { name, subject, body } = args;

            const campaign = await Campaign.create({
                workspaceId,
                userId,
                name: name || "New Campaign",
                subject: subject || "Check this out",
                body: body || "Hello,\n\nWe wanted to reach out...",
                status: "draft",
            });

            return {
                success: true,
                campaignId: campaign._id.toString(),
                message: `Campaign "${campaign.name}" created in draft mode`,
            };
        }

        case "update_campaign": {
            const { campaignName, name, subject, body } = args;

            const regex = createSafeRegex(campaignName);
            const updates: any = {};
            if (name) updates.name = name;
            if (subject) updates.subject = subject;
            if (body) updates.body = body;

            const campaign = await Campaign.findOneAndUpdate(
                { workspaceId, name: regex },
                { $set: updates },
                { new: true }
            );

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            return {
                success: true,
                message: `Campaign "${campaign.name}" updated successfully ✏️`,
            };
        }

        case "delete_campaign": {
            const { campaignName } = args;

            const regex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOneAndDelete({ workspaceId, name: regex });

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            // Also delete all enrollments
            await CampaignEnrollment.deleteMany({ campaignId: campaign._id });

            return {
                success: true,
                message: `Campaign "${campaign.name}" and all enrollments deleted 🗑️`,
            };
        }

        case "pause_campaign": {
            const { campaignName } = args;

            const regex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOneAndUpdate(
                { workspaceId, name: regex },
                { status: "paused" },
                { new: true }
            );

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            return {
                success: true,
                message: `Campaign "${campaign.name}" paused ⏸️`,
            };
        }

        case "resume_campaign": {
            const { campaignName } = args;

            const regex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOneAndUpdate(
                { workspaceId, name: regex, status: "paused" },
                { status: "sending" },
                { new: true }
            );

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found or not paused` };
            }

            return {
                success: true,
                message: `Campaign "${campaign.name}" resumed ▶️`,
            };
        }

        case "list_campaigns": {
            const { status } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;

            const campaigns = await Campaign.find(filter)
                .select("name status subject")
                .limit(20)
                .lean();

            return {
                success: true,
                count: campaigns.length,
                campaigns: campaigns.map((c: any) => ({
                    id: c._id.toString(),
                    name: c.name,
                    status: c.status,
                    subject: c.subject,
                })),
            };
        }

        case "get_campaign_stats": {
            const { campaignName } = args;

            const regex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOne({ workspaceId, name: regex }).lean();

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            const enrollments = await CampaignEnrollment.find({
                campaignId: (campaign as any)._id,
            }).lean();

            const stats = {
                total: enrollments.length,
                sent: enrollments.filter((e: any) => e.status === "sent").length,
                opened: enrollments.filter((e: any) => e.opened).length,
                clicked: enrollments.filter((e: any) => e.clicked).length,
            };

            return {
                success: true,
                campaign: (campaign as any).name,
                stats,
            };
        }

        case "enroll_contacts": {
            const { campaignName, contactQuery } = args;

            const campaignRegex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOne({ workspaceId, name: campaignRegex });

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            // Find contacts
            const contactFilter: any = { workspaceId };
            if (contactQuery) {
                const regex = createSafeRegex(contactQuery);
                contactFilter.$or = [
                    { firstName: regex },
                    { lastName: regex },
                    { company: regex },
                ];
            }

            const contacts = await Contact.find(contactFilter).limit(100);

            let enrolled = 0;
            for (const contact of contacts) {
                const existing = await CampaignEnrollment.findOne({
                    campaignId: campaign._id,
                    contactId: contact._id,
                });
                if (!existing) {
                    await CampaignEnrollment.create({
                        workspaceId,
                        campaignId: campaign._id,
                        contactId: contact._id,
                        status: "pending",
                    });
                    enrolled++;
                }
            }

            return {
                success: true,
                message: `Enrolled ${enrolled} contact(s) in campaign "${campaign.name}"`,
            };
        }

        case "send_campaign": {
            const { campaignName } = args;

            const regex = createSafeRegex(campaignName);
            const campaign = await Campaign.findOneAndUpdate(
                { workspaceId, name: regex },
                { status: "sending", sentAt: new Date() },
                { new: true }
            );

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            return {
                success: true,
                message: `Campaign "${campaign.name}" is now sending! 🚀`,
            };
        }

        case "bulk_delete_campaigns": {
            const { status, olderThanDays } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!status && !olderThanDays) {
                return { success: false, error: "Please specify status or olderThanDays to bulk delete" };
            }

            // Get campaign IDs to delete enrollments
            const campaigns = await Campaign.find(filter).select("_id").lean();
            const campaignIds = campaigns.map((c: any) => c._id);

            // Delete enrollments first
            await CampaignEnrollment.deleteMany({ campaignId: { $in: campaignIds } });

            // Delete campaigns
            const result = await Campaign.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} campaign(s) and their enrollments 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function campaignAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📧 Campaign Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Campaign Agent. Manage email campaigns.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Available tools:
1. create_campaign - Args: { name, subject?, body? }
2. update_campaign - Args: { campaignName, name?, subject?, body? }
3. delete_campaign - Args: { campaignName }
4. pause_campaign - Args: { campaignName }
5. resume_campaign - Args: { campaignName }
6. list_campaigns - Args: { status? }
7. get_campaign_stats - Args: { campaignName }
8. enroll_contacts - Args: { campaignName, contactQuery? }
9. send_campaign - Args: { campaignName }
10. bulk_delete_campaigns - Bulk delete. Args: { status?, olderThanDays? }

Examples:
- "delete all sent campaigns" → {"tool": "bulk_delete_campaigns", "args": {"status": "sent"}}
- "delete campaigns older than 90 days" → {"tool": "bulk_delete_campaigns", "args": {"olderThanDays": 90}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Campaign AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeCampaignTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "list_campaigns" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No campaigns found.";
                } else {
                    friendlyResponse = `Found ${result.count} campaign(s):\n${result.campaigns.map((c: any) => `• ${c.name} (${c.status})`).join("\n")}`;
                }
            } else if (toolCall.tool === "get_campaign_stats" && result.success) {
                friendlyResponse = `📊 ${result.campaign} Stats:\n• Total: ${result.stats.total}\n• Sent: ${result.stats.sent}\n• Opened: ${result.stats.opened}\n• Clicked: ${result.stats.clicked}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with campaigns! Try:\n• 'Delete the old campaign'\n• 'Pause the newsletter'\n• 'Show my campaigns'")],
            finalResponse: "I can help with campaigns!",
        };

    } catch (error: any) {
        console.error("❌ Campaign Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
