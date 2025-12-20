/**
 * Lead Score Worker Agent
 * 
 * Handles lead scoring: get hot leads, score contacts, set scoring rules.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import LeadScore from "../../models/LeadScore";
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

async function executeLeadScoreTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "get_hot_leads": {
            const { minScore, limit } = args;

            const threshold = minScore || 50;

            const scores = await LeadScore.find({
                workspaceId,
                currentScore: { $gte: threshold },
            })
                .populate("contactId", "firstName lastName email company")
                .sort({ currentScore: -1 })
                .limit(limit || 10)
                .lean();

            return {
                success: true,
                count: scores.length,
                leads: scores.map((s: any) => ({
                    name: s.contactId ? `${s.contactId.firstName} ${s.contactId.lastName}` : "Unknown",
                    email: s.contactId?.email,
                    company: s.contactId?.company,
                    score: s.currentScore,
                    grade: s.grade,
                })),
            };
        }

        case "get_contact_score": {
            const { contactName } = args;

            const regex = new RegExp(contactName, "i");
            const contact = await Contact.findOne({
                workspaceId,
                $or: [{ firstName: regex }, { lastName: regex }],
            });

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            const score = await LeadScore.findOne({ contactId: contact._id }).lean();

            if (!score) {
                return {
                    success: true,
                    contact: `${contact.firstName} ${contact.lastName}`,
                    score: 0,
                    grade: "D",
                    message: `${contact.firstName} has no lead score yet`,
                };
            }

            return {
                success: true,
                contact: `${contact.firstName} ${contact.lastName}`,
                score: (score as any).currentScore,
                grade: (score as any).grade,
                events: (score as any).events?.slice(-5) || [],
            };
        }

        case "add_score_points": {
            const { contactName, points, reason } = args;

            const regex = new RegExp(contactName, "i");
            const contact = await Contact.findOne({
                workspaceId,
                $or: [{ firstName: regex }, { lastName: regex }],
            });

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            let leadScore = await LeadScore.findOne({ contactId: contact._id });

            if (!leadScore) {
                leadScore = await LeadScore.create({
                    workspaceId,
                    contactId: contact._id,
                    currentScore: points || 10,
                    previousScore: 0,
                    scoreHistory: [{ eventType: "manual", points: points || 10, reason: reason || "Manual score", timestamp: new Date() }],
                    grade: "C",
                });
            } else {
                leadScore.currentScore += points || 10;
                (leadScore as any).scoreHistory.push({
                    eventType: "manual",
                    points: points || 10,
                    reason: reason || "Manual score",
                    timestamp: new Date(),
                });

                // Update grade
                if (leadScore.currentScore >= 80) leadScore.grade = "A";
                else if (leadScore.currentScore >= 60) leadScore.grade = "B";
                else if (leadScore.currentScore >= 40) leadScore.grade = "C";
                else leadScore.grade = "D";

                await leadScore.save();
            }

            return {
                success: true,
                message: `Added ${points || 10} points to ${contact.firstName}. New score: ${leadScore.currentScore} (${leadScore.grade})`,
            };
        }

        case "get_lead_distribution": {
            const scores = await LeadScore.find({ workspaceId }).lean();

            const distribution = { A: 0, B: 0, C: 0, D: 0 };
            for (const score of scores) {
                const grade = (score as any).grade || "D";
                distribution[grade as keyof typeof distribution]++;
            }

            return {
                success: true,
                total: scores.length,
                distribution,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function leadScoreAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📈 Lead Score Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Lead Score Agent. Manage lead scoring and qualification.

Available tools:

1. get_hot_leads - Get high-scoring leads
   Args: { minScore? (default 50), limit? (default 10) }

2. get_contact_score - Get a contact's lead score
   Args: { contactName }

3. add_score_points - Add points to a contact's score
   Args: { contactName, points?, reason? }

4. get_lead_distribution - Get score distribution (A/B/C/D grades)
   Args: {}

Respond with JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Lead Score AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeLeadScoreTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "get_hot_leads" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No hot leads found. Try lowering the score threshold.";
                } else {
                    friendlyResponse = `🔥 ${result.count} Hot Lead(s):\n${result.leads.map((l: any) => `• ${l.name} (${l.score} pts, Grade ${l.grade})${l.company ? ` - ${l.company}` : ""}`).join("\n")}`;
                }
            } else if (toolCall.tool === "get_contact_score" && result.success) {
                friendlyResponse = `${result.contact}: ${result.score} pts (Grade ${result.grade})`;
            } else if (toolCall.tool === "get_lead_distribution" && result.success) {
                friendlyResponse = `📊 Lead Distribution (${result.total} total):\n• Grade A: ${result.distribution.A}\n• Grade B: ${result.distribution.B}\n• Grade C: ${result.distribution.C}\n• Grade D: ${result.distribution.D}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with lead scoring! Try:\n• 'Show my hot leads'\n• 'What's John's lead score?'\n• 'Add 20 points to Sarah for demo request'")],
            finalResponse: "I can help with lead scoring!",
        };

    } catch (error: any) {
        console.error("❌ Lead Score Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
