/**
 * Briefing Agent - Meeting Preparation AI
 * 
 * Generates pre-call briefing documents by researching companies,
 * summarizing past interactions, and suggesting talking points.
 * Uses Gemini 2.5 Pro for intelligent document generation.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Contact from "../../models/Contact";
import Company from "../../models/Company";
import Opportunity from "../../models/Opportunity";
import Activity from "../../models/Activity";
import EmailMessage from "../../models/EmailMessage";

function parseToolCall(response: string): { tool: string; args: any } | null {
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.tool && parsed.args !== undefined) return parsed;
        }
    } catch (e) { }
    return null;
}

function daysSince(date: Date | undefined): number {
    if (!date) return 999;
    return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

async function executeBriefingTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "generate_briefing": {
            let contact = null;
            let company = null;
            let opportunities: any[] = [];
            let activities: any[] = [];
            let emails: any[] = [];

            // Find contact by ID or name
            if (args.contactId) {
                contact = await Contact.findOne({ workspaceId, _id: args.contactId }).lean();
            } else if (args.contactName) {
                const regex = createSafeRegex(args.contactName);
                contact = await Contact.findOne({
                    workspaceId,
                    $or: [
                        { firstName: regex },
                        { lastName: regex },
                        { $expr: { $regexMatch: { input: { $concat: ["$firstName", " ", "$lastName"] }, regex: args.contactName, options: "i" } } },
                    ],
                }).lean();
            }

            if (!contact && args.companyName) {
                // Find company directly
                const regex = createSafeRegex(args.companyName);
                company = await Company.findOne({ workspaceId, name: regex }).lean();
            }

            if (contact) {
                // Get related data
                if ((contact as any).companyId) {
                    company = await Company.findById((contact as any).companyId).lean();
                } else if ((contact as any).company) {
                    const regex = new RegExp((contact as any).company, "i");
                    company = await Company.findOne({ workspaceId, name: regex }).lean();
                }

                opportunities = await Opportunity.find({
                    workspaceId,
                    $or: [
                        { contactId: (contact as any)._id },
                        { companyId: company?._id },
                    ],
                }).sort({ updatedAt: -1 }).limit(5).lean();

                activities = await Activity.find({
                    workspaceId,
                    $or: [
                        { contactId: (contact as any)._id },
                        { opportunityId: { $in: opportunities.map((o: any) => o._id) } },
                    ],
                }).sort({ createdAt: -1 }).limit(15).lean();

                emails = await EmailMessage.find({
                    workspaceId,
                    $or: [
                        { to: (contact as any).email },
                        { from: (contact as any).email },
                    ],
                }).sort({ sentAt: -1 }).limit(10).lean();
            }

            // Generate AI briefing - SHORT and ACTIONABLE format
            const briefingPrompt = `Generate a SHORT, PUNCHY meeting briefing. Maximum 200 words. Use bullet points only.

CONTACT: ${contact ? `${(contact as any).firstName} ${(contact as any).lastName} - ${(contact as any).jobTitle || "Unknown title"} at ${(contact as any).company || (company as any)?.name || "Unknown company"}` : "Not found"}
COMPANY: ${company ? `${(company as any).name} | ${(company as any).industry || "Unknown"} | ${(company as any).companySize || "?"} employees` : "No company data"}
DEALS: ${opportunities.length > 0 ? opportunities.map((o: any) => `$${o.value?.toLocaleString() || 0} - ${o.title}`).join(", ") : "None"}
LAST CONTACT: ${activities.length > 0 ? `${daysSince(activities[0]?.createdAt)} days ago` : "Never"}
EMAILS: ${emails.length} in history

Return ONLY this format (no extra text):

**Quick Facts:**
• [One-liner about the contact/company]
• [Deal status if any]
• [Last interaction]

**3 Key Talking Points:**
1. [Question about their pain]
2. [Question to qualify]
3. [Question to advance]

**Watch Out For:**
• [Potential objection]

**Your Goal:**
• [One clear objective for this meeting]`;

            const briefingResponse = await getProModel().invoke([new HumanMessage(briefingPrompt)]);

            return {
                success: true,
                contact: contact ? {
                    name: `${(contact as any).firstName} ${(contact as any).lastName}`,
                    title: (contact as any).jobTitle,
                    company: (contact as any).company || (company as any)?.name,
                } : null,
                briefing: briefingResponse.content,
                generatedAt: new Date().toISOString(),
            };
        }

        case "summarize_interactions": {
            let contactId = args.contactId;

            if (!contactId && args.contactName) {
                const regex = createSafeRegex(args.contactName);
                const contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: regex }, { lastName: regex }],
                });
                contactId = contact?._id;
            }

            if (!contactId) {
                return { success: false, error: "Contact not found" };
            }

            const activities = await Activity.find({ workspaceId, contactId })
                .sort({ createdAt: -1 })
                .limit(30)
                .lean();

            const emails = await EmailMessage.find({
                workspaceId,
                contactId,
            }).sort({ sentAt: -1 }).limit(20).lean();

            const summaryPrompt = `Summarize the interaction history with this contact:

ACTIVITIES (${activities.length} total):
${activities.map((a: any) => `[${a.type}] ${a.description} - ${new Date(a.createdAt).toLocaleDateString()}`).join("\n")}

EMAILS (${emails.length} total):
${emails.map((e: any) => `Subject: ${e.subject} - ${new Date(e.sentAt).toLocaleDateString()}`).join("\n")}

Provide:
1. Timeline summary (key milestones)
2. Engagement level (high/medium/low)
3. Key topics discussed
4. Relationship status assessment
5. Recommended next action`;

            const summary = await getProModel().invoke([new HumanMessage(summaryPrompt)]);

            return {
                success: true,
                activitiesCount: activities.length,
                emailsCount: emails.length,
                summary: summary.content,
            };
        }

        case "suggest_talking_points": {
            let context = "";

            if (args.opportunityId) {
                const opp = await Opportunity.findById(args.opportunityId)
                    .populate("contactId")
                    .populate("companyId")
                    .lean();

                if (opp) {
                    context = `Opportunity: ${(opp as any).title}
Value: $${(opp as any).value}
Stage: ${(opp as any).stageId}
Industry: ${args.industry || (opp as any).companyId?.industry || "Unknown"}
Deal Temperature: ${(opp as any).dealTemperature || "Unknown"}`;
                }
            }

            const talkingPointsPrompt = `Generate 7 strategic talking points for a sales call.

Context:
${context || `Industry: ${args.industry || "Unknown"}\nDeal Stage: ${args.dealStage || "Discovery"}`}

Generate talking points that:
1. Build rapport
2. Uncover pain points
3. Qualify the opportunity (budget, authority, need, timeline)
4. Address likely objections
5. Move toward next steps

Format as numbered list with brief explanation for each.`;

            const points = await getProModel().invoke([new HumanMessage(talkingPointsPrompt)]);

            return {
                success: true,
                talkingPoints: points.content,
            };
        }

        case "get_company_news": {
            // Use AI to generate contextual information about the company
            const newsPrompt = `Provide relevant business context and potential talking points about ${args.companyName}.

Include:
1. Industry trends affecting companies like this
2. Common challenges in their space
3. Potential pain points based on company size/type
4. Recent market developments to reference
5. Conversation starters related to their business

Note: If you don't have specific recent news, provide industry-relevant insights that would be valuable in a sales conversation.`;

            const news = await getProModel().invoke([new HumanMessage(newsPrompt)]);

            return {
                success: true,
                companyName: args.companyName,
                insights: news.content,
                note: "Based on general industry knowledge. For real-time news, integrate a news API.",
            };
        }

        case "get_contact_insights": {
            const contact = await Contact.findOne({ workspaceId, _id: args.contactId }).lean();
            if (!contact) {
                return { success: false, error: "Contact not found" };
            }

            const activities = await Activity.find({ contactId: args.contactId })
                .sort({ createdAt: -1 })
                .lean();

            const emails = await EmailMessage.find({ contactId: args.contactId }).lean();

            // Analyze patterns
            const insightsPrompt = `Analyze this contact's engagement patterns:

Contact: ${(contact as any).firstName} ${(contact as any).lastName}
Job Title: ${(contact as any).jobTitle}
Lead Score: ${(contact as any).leadScore || "Not scored"}
Status: ${(contact as any).status}

Activity Types: ${[...new Set(activities.map((a: any) => a.type))].join(", ")}
Total Activities: ${activities.length}
Email Count: ${emails.length}

Provide:
1. Engagement level assessment
2. Best time/channel to reach them (based on activity patterns)
3. Key interests (based on interactions)
4. Communication style recommendation
5. Risk of disengagement (if any)`;

            const insights = await getProModel().invoke([new HumanMessage(insightsPrompt)]);

            return {
                success: true,
                contact: `${(contact as any).firstName} ${(contact as any).lastName}`,
                insights: insights.content,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function briefingAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📋 Briefing Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Meeting Preparation Agent. Help salespeople prepare for calls and meetings.

Available tools:

1. generate_briefing - Create comprehensive pre-call briefing document
   Args: { contactId?: string, contactName?: string, companyName?: string }
   Returns: Full briefing with company info, history, talking points

2. summarize_interactions - Summarize all past interactions with a contact
   Args: { contactId?: string, contactName?: string }
   Returns: Timeline and engagement summary

3. suggest_talking_points - Generate strategic questions and topics
   Args: { opportunityId?: string, industry?: string, dealStage?: string }
   Returns: Tailored talking points

4. get_company_news - Get company/industry insights
   Args: { companyName: string }
   Returns: Business context and relevant insights

5. get_contact_insights - AI analysis of contact engagement patterns
   Args: { contactId: string }
   Returns: Engagement patterns, preferences, recommendations

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Prepare for meeting with John" → {"tool": "generate_briefing", "args": {"contactName": "John"}}
- "Brief me on TechCorp" → {"tool": "generate_briefing", "args": {"companyName": "TechCorp"}}
- "What should I ask about?" → {"tool": "suggest_talking_points", "args": {}}
- "Summarize my interactions with Sarah" → {"tool": "summarize_interactions", "args": {"contactName": "Sarah"}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Briefing AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "BriefingAgent");

        if (toolCall) {
            const result = await executeBriefingTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "generate_briefing") {
                friendlyResponse = `📋 **Meeting Briefing${result.contact ? ` - ${result.contact.name}` : ""}**\n\n${result.briefing}`;
            } else if (toolCall.tool === "summarize_interactions") {
                friendlyResponse = `📊 **Interaction Summary**\n\nActivities: ${result.activitiesCount} | Emails: ${result.emailsCount}\n\n${result.summary}`;
            } else if (toolCall.tool === "suggest_talking_points") {
                friendlyResponse = `💬 **Suggested Talking Points**\n\n${result.talkingPoints}`;
            } else if (toolCall.tool === "get_company_news") {
                friendlyResponse = `📰 **Insights: ${result.companyName}**\n\n${result.insights}`;
            } else if (toolCall.tool === "get_contact_insights") {
                friendlyResponse = `🔍 **Contact Insights: ${result.contact}**\n\n${result.insights}`;
            } else {
                friendlyResponse = result.message || JSON.stringify(result);
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help you prepare for meetings! Try:\n• 'Prepare for meeting with [name]'\n• 'Brief me on [company]'\n• 'What should I discuss in my next call?'\n• 'Summarize my interactions with [contact]'")],
            finalResponse: "I can help with meeting preparation!",
        };

    } catch (error: any) {
        console.error("❌ Briefing Agent error:", error);
        return { error: error.message, finalResponse: "Error generating briefing. Try again." };
    }
}
