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
import { createSafeRegex } from "../utils/escapeRegex";

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

            const regex = createSafeRegex(contactName);
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

            const regex = createSafeRegex(contactName);
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

        case "reset_score": {
            const { contactName } = args;

            const regex = createSafeRegex(contactName);
            const contact = await Contact.findOne({
                workspaceId,
                $or: [{ firstName: regex }, { lastName: regex }],
            });

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            const result = await LeadScore.findOneAndDelete({ contactId: contact._id });

            if (!result) {
                return { success: false, error: `No lead score found for ${contactName}` };
            }

            return {
                success: true,
                message: `Lead score for ${contact.firstName} ${contact.lastName} reset to 0 🔄`,
            };
        }

        case "bulk_reset_scores": {
            const { grade, belowScore } = args;

            const filter: any = { workspaceId };
            if (grade) filter.grade = grade;
            if (belowScore) filter.currentScore = { $lt: belowScore };

            // Safety: require at least one filter
            if (!grade && !belowScore) {
                return { success: false, error: "Please specify grade or belowScore to bulk reset" };
            }

            const result = await LeadScore.deleteMany(filter);

            return {
                success: true,
                message: `Reset ${result.deletedCount} lead score(s) 🔄`,
                deletedCount: result.deletedCount,
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

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Tools:
1. get_hot_leads - Args: { minScore?, limit? }
2. get_contact_score - Args: { contactName }
3. add_score_points - Args: { contactName, points?, reason? }
4. get_lead_distribution - Args: {}
5. reset_score - Args: { contactName }
6. bulk_reset_scores - Bulk reset. Args: { grade?, belowScore? }

Examples:
- "reset all D grade scores" → {"tool": "bulk_reset_scores", "args": {"grade": "D"}}
- "reset scores below 20" → {"tool": "bulk_reset_scores", "args": {"belowScore": 20}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

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
            messages: [new AIMessage("I can help with lead scoring! Try:\n• 'Reset John's score'\n• 'Show my hot leads'\n• 'What's Sarah's lead score?'")],
            finalResponse: "I can help with lead scoring!",
        };

    } catch (error: any) {
        console.error("❌ Lead Score Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
