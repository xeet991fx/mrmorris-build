/**
 * Campaign Worker Agent
 * 
 * Handles email campaigns: create, enroll contacts, send, get stats.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Campaign from "../../models/Campaign";
import CampaignEnrollment from "../../models/CampaignEnrollment";
import Contact from "../../models/Contact";

function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args) return parsed;
        }
    } catch (e) { }
    return null;
}

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

            const regex = new RegExp(campaignName, "i");
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

            const campaignRegex = new RegExp(campaignName, "i");
            const campaign = await Campaign.findOne({ workspaceId, name: campaignRegex });

            if (!campaign) {
                return { success: false, error: `Campaign "${campaignName}" not found` };
            }

            // Find contacts
            const contactFilter: any = { workspaceId };
            if (contactQuery) {
                const regex = new RegExp(contactQuery, "i");
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

            const regex = new RegExp(campaignName, "i");
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

Available tools:

1. create_campaign - Create email campaign
   Args: { name, subject?, body? }

2. list_campaigns - List campaigns
   Args: { status? (draft/sending/sent/paused) }

3. get_campaign_stats - Get campaign performance
   Args: { campaignName }

4. enroll_contacts - Add contacts to campaign
   Args: { campaignName, contactQuery? (search term) }

5. send_campaign - Launch a campaign
   Args: { campaignName }

Respond with JSON: {"tool": "...", "args": {...}}`;

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
            messages: [new AIMessage("I can help with campaigns! Try:\n• 'Create a campaign called Summer Sale'\n• 'Show my campaigns'\n• 'Get stats for Black Friday campaign'")],
            finalResponse: "I can help with campaigns!",
        };

    } catch (error: any) {
        console.error("❌ Campaign Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
