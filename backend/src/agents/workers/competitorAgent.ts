/**
 * Competitor Agent - Competitive Intelligence AI
 * 
 * Tracks competitors, detects mentions, surfaces battlecards,
 * and analyzes win/loss patterns.
 * Uses Gemini 2.5 Pro for analysis and response generation.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Competitor from "../../models/Competitor";
import Battlecard from "../../models/Battlecard";
import Opportunity from "../../models/Opportunity";

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

async function executeCompetitorTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "add_competitor": {
            const { name, website, keywords = [], strengths = [], weaknesses = [] } = args;

            if (!name) {
                return { success: false, error: "Competitor name is required" };
            }

            // Check if already exists
            const existing = await Competitor.findOne({ workspaceId, name: new RegExp(`^${name}$`, "i") });
            if (existing) {
                return { success: false, error: `Competitor "${name}" already exists` };
            }

            // Auto-generate keywords if not provided
            let autoKeywords = keywords;
            if (autoKeywords.length === 0) {
                autoKeywords = [
                    name.toLowerCase(),
                    name.toLowerCase().replace(/\s+/g, ""),
                    name.toLowerCase().split(" ")[0],
                ];
            }

            const competitor = await Competitor.create({
                workspaceId,
                name,
                website,
                keywords: autoKeywords,
                strengths,
                weaknesses,
            });

            return {
                success: true,
                competitorId: competitor._id.toString(),
                message: `Added competitor "${name}" with ${autoKeywords.length} detection keywords`,
            };
        }

        case "list_competitors": {
            const competitors = await Competitor.find({ workspaceId })
                .sort({ name: 1 })
                .lean();

            return {
                success: true,
                count: competitors.length,
                competitors: competitors.map((c: any) => ({
                    id: c._id.toString(),
                    name: c.name,
                    website: c.website,
                    keywords: c.keywords,
                    dealsWon: c.dealsWon || 0,
                    dealsLost: c.dealsLost || 0,
                    winRate: c.dealsWon + c.dealsLost > 0
                        ? Math.round((c.dealsWon / (c.dealsWon + c.dealsLost)) * 100)
                        : null,
                })),
            };
        }

        case "get_battlecard": {
            let competitor;

            if (args.competitorId) {
                competitor = await Competitor.findById(args.competitorId);
            } else if (args.competitorName) {
                const regex = createSafeRegex(args.competitorName);
                competitor = await Competitor.findOne({ workspaceId, name: regex });
            }

            if (!competitor) {
                return { success: false, error: "Competitor not found" };
            }

            // Get existing battlecards
            const battlecards = await Battlecard.find({ competitorId: competitor._id })
                .sort({ priority: -1, updatedAt: -1 })
                .lean();

            // If no battlecards, generate one with AI
            if (battlecards.length === 0) {
                const generatePrompt = `Create a competitive battlecard for selling against ${competitor.name}.

Known information:
- Website: ${competitor.website || "Unknown"}
- Strengths: ${competitor.strengths?.join(", ") || "Not documented"}
- Weaknesses: ${competitor.weaknesses?.join(", ") || "Not documented"}

Generate:
1. **Overview** - Brief description of the competitor
2. **Their Strengths** - What they do well (be honest)
3. **Their Weaknesses** - Where they fall short
4. **Our Advantages** - Why choose us over them
5. **Common Objections** - What prospects say about them
6. **Objection Responses** - How to respond to each
7. **Trap Questions** - Questions to ask that highlight our strengths
8. **Key Differentiators** - 3 main points of differentiation

Be specific and actionable. This should help a sales rep win against this competitor.`;

                const generatedCard = await getProModel().invoke([new HumanMessage(generatePrompt)]);

                return {
                    success: true,
                    competitor: competitor.name,
                    source: "ai_generated",
                    battlecard: generatedCard.content,
                    note: "This battlecard was auto-generated. Consider creating official battlecards for better accuracy.",
                };
            }

            return {
                success: true,
                competitor: competitor.name,
                source: "database",
                battlecardsCount: battlecards.length,
                battlecards: battlecards.map((b: any) => ({
                    id: b._id.toString(),
                    title: b.title,
                    category: b.category,
                    content: b.content,
                    objection: b.objection,
                    response: b.response,
                })),
                strengths: competitor.strengths,
                weaknesses: competitor.weaknesses,
            };
        }

        case "detect_mentions": {
            const { text, autoTrack = false } = args;

            if (!text) {
                return { success: false, error: "Text to analyze is required" };
            }

            // Get all competitors and their keywords
            const competitors = await Competitor.find({ workspaceId }).lean();

            if (competitors.length === 0) {
                return {
                    success: true,
                    mentions: [],
                    message: "No competitors tracked yet. Add competitors first."
                };
            }

            // Use AI to detect mentions
            const detectPrompt = `Analyze this text for mentions of competitors:

Text to analyze:
"${text}"

Known competitors and their keywords:
${competitors.map((c: any) => `- ${c.name}: ${c.keywords?.join(", ") || c.name}`).join("\n")}

Also detect:
1. Implied competitor mentions (e.g., "your competitor", "the other solution")
2. Product/feature comparisons
3. Price comparisons
4. Switching mentions (e.g., "we're currently using...")

Return JSON:
{
  "mentions": [
    {
      "competitor": "Name or 'Unknown Competitor'",
      "quote": "exact quote from text",
      "context": "comparison/pricing/feature/general",
      "sentiment": "positive/negative/neutral toward competitor",
      "threat_level": "high/medium/low"
    }
  ],
  "competitorsDetected": ["list of competitor names found"]
}`;

            const detectionResult = await getProModel().invoke([new HumanMessage(detectPrompt)]);

            let parsed = { mentions: [], competitorsDetected: [] };
            try {
                const match = (detectionResult.content as string).match(/\{[\s\S]*\}/);
                if (match) {
                    parsed = JSON.parse(match[0]);
                }
            } catch (e) {
                parsed = { mentions: [], competitorsDetected: [] };
            }

            // Update lastMentionAt for detected competitors
            if (autoTrack && parsed.competitorsDetected?.length > 0) {
                for (const name of parsed.competitorsDetected) {
                    await Competitor.findOneAndUpdate(
                        { workspaceId, name: createSafeRegex(name) },
                        { lastMentionAt: new Date() }
                    );
                }
            }

            return {
                success: true,
                mentionsFound: parsed.mentions?.length || 0,
                mentions: parsed.mentions,
                competitorsDetected: parsed.competitorsDetected,
            };
        }

        case "get_win_loss_stats": {
            const { competitorId, competitorName } = args;

            let filter: any = { workspaceId };

            if (competitorId) {
                filter.competitorIds = competitorId;
            } else if (competitorName) {
                const competitor = await Competitor.findOne({
                    workspaceId,
                    name: createSafeRegex(competitorName)
                });
                if (competitor) {
                    filter.competitorIds = competitor._id;
                }
            }

            // For now, calculate from lost reason mentions
            // In production, you'd track competitorIds on opportunities
            const competitors = await Competitor.find({ workspaceId }).lean();
            const stats: any[] = [];

            for (const competitor of competitors) {
                const lostToCompetitor = await Opportunity.countDocuments({
                    workspaceId,
                    status: "lost",
                    lostReason: createSafeRegex(competitor.name),
                });

                // Get deals where we won but competitor was mentioned
                // This is simplified - in production, track properly
                const totalMentioned = lostToCompetitor + (competitor.dealsWon || 0);

                stats.push({
                    competitor: competitor.name,
                    wins: competitor.dealsWon || 0,
                    losses: lostToCompetitor,
                    total: totalMentioned,
                    winRate: totalMentioned > 0
                        ? Math.round((competitor.dealsWon || 0) / totalMentioned * 100)
                        : null,
                });
            }

            // Sort by losses (biggest threats first)
            stats.sort((a, b) => b.losses - a.losses);

            return {
                success: true,
                stats,
                topThreat: stats[0]?.competitor || null,
            };
        }

        case "generate_response": {
            const { competitorName, objection } = args;

            if (!objection) {
                return { success: false, error: "Please specify the objection to respond to" };
            }

            let competitorContext = "";
            if (competitorName) {
                const competitor = await Competitor.findOne({
                    workspaceId,
                    name: createSafeRegex(competitorName)
                });
                if (competitor) {
                    competitorContext = `
Competitor: ${competitor.name}
Known Strengths: ${competitor.strengths?.join(", ") || "Not documented"}
Known Weaknesses: ${competitor.weaknesses?.join(", ") || "Not documented"}`;
                }
            }

            const responsePrompt = `Generate a professional sales response to this competitive objection:

Objection: "${objection}"
${competitorContext}

Create a response that:
1. Acknowledges the objection (don't dismiss it)
2. Reframes the conversation
3. Highlights our unique value
4. Provides specific proof points or examples
5. Ends with a forward-moving question

Also provide:
- Key talking points (bullet list)
- Questions to ask that expose competitor weaknesses
- Proof points to reference`;

            const responseContent = await getProModel().invoke([new HumanMessage(responsePrompt)]);

            return {
                success: true,
                objection,
                competitor: competitorName || "General",
                response: responseContent.content,
            };
        }

        case "add_battlecard": {
            const { competitorId, competitorName, title, category, content, objection, response } = args;

            let competitor;
            if (competitorId) {
                competitor = await Competitor.findById(competitorId);
            } else if (competitorName) {
                competitor = await Competitor.findOne({
                    workspaceId,
                    name: createSafeRegex(competitorName)
                });
            }

            if (!competitor) {
                return { success: false, error: "Competitor not found" };
            }

            const battlecard = await Battlecard.create({
                workspaceId,
                competitorId: competitor._id,
                title: title || `${category || "General"} - ${competitor.name}`,
                category: category || "general",
                content,
                objection,
                response,
                createdBy: userId,
            });

            return {
                success: true,
                battlecardId: battlecard._id.toString(),
                message: `Battlecard "${battlecard.title}" created for ${competitor.name}`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function competitorAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🎯 Competitor Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Competitive Intelligence Agent. Track competitors and help win deals.

Available tools:

1. add_competitor - Add a competitor to track
   Args: { name: string, website?: string, keywords?: string[], strengths?: string[], weaknesses?: string[] }
   Returns: Created competitor

2. list_competitors - List all tracked competitors
   Args: {}
   Returns: Competitors with win/loss stats

3. get_battlecard - Get competitive positioning for a competitor
   Args: { competitorId?: string, competitorName?: string }
   Returns: Battlecard(s) with objection handling

4. detect_mentions - Scan text for competitor mentions
   Args: { text: string, autoTrack?: boolean }
   Returns: Found mentions with context

5. get_win_loss_stats - Win/loss analysis by competitor
   Args: { competitorId?: string, competitorName?: string }
   Returns: Stats and patterns

6. generate_response - Create response to competitive objection
   Args: { competitorName?: string, objection: string }
   Returns: Professional response with talking points

7. add_battlecard - Create new battlecard for a competitor
   Args: { competitorId?: string, competitorName?: string, title: string, category: string, content: string }
   Returns: Created battlecard

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Add Salesforce as a competitor" → {"tool": "add_competitor", "args": {"name": "Salesforce", "website": "salesforce.com"}}
- "Battlecard for HubSpot" → {"tool": "get_battlecard", "args": {"competitorName": "HubSpot"}}
- "Prospect mentioned they're using Pipedrive" → {"tool": "detect_mentions", "args": {"text": "using Pipedrive"}}
- "How do I respond when they say Zendesk is cheaper?" → {"tool": "generate_response", "args": {"competitorName": "Zendesk", "objection": "Zendesk is cheaper"}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Competitor AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "CompetitorAgent");

        if (toolCall) {
            const result = await executeCompetitorTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "add_competitor") {
                friendlyResponse = `✅ ${result.message}`;
            } else if (toolCall.tool === "list_competitors") {
                if (result.count === 0) {
                    friendlyResponse = "No competitors tracked yet. Add some with 'Add [name] as competitor'.";
                } else {
                    friendlyResponse = `🎯 **${result.count} Tracked Competitor(s):**\n\n${result.competitors.map((c: any) =>
                        `• **${c.name}**${c.website ? ` (${c.website})` : ""}\n  Win Rate: ${c.winRate !== null ? `${c.winRate}%` : "N/A"} | Won: ${c.dealsWon} | Lost: ${c.dealsLost}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "get_battlecard") {
                if (result.source === "ai_generated") {
                    friendlyResponse = `⚔️ **AI-Generated Battlecard: ${result.competitor}**\n\n${result.battlecard}\n\n_${result.note}_`;
                } else {
                    friendlyResponse = `⚔️ **Battlecard: ${result.competitor}**

**Strengths:** ${result.strengths?.join(", ") || "Not documented"}
**Weaknesses:** ${result.weaknesses?.join(", ") || "Not documented"}

${result.battlecards.map((b: any) =>
                        `### ${b.title} (${b.category})\n${b.content}${b.objection ? `\n\n**Objection:** ${b.objection}\n**Response:** ${b.response}` : ""}`
                    ).join("\n\n---\n\n")}`;
                }
            } else if (toolCall.tool === "detect_mentions") {
                if (result.mentionsFound === 0) {
                    friendlyResponse = "No competitor mentions detected in the text.";
                } else {
                    friendlyResponse = `🔍 **${result.mentionsFound} Competitor Mention(s) Found:**\n\n${result.mentions.map((m: any) =>
                        `• **${m.competitor}** [${m.threat_level?.toUpperCase()} threat]\n  "${m.quote}"\n  Context: ${m.context} | Sentiment: ${m.sentiment}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "get_win_loss_stats") {
                friendlyResponse = `📊 **Win/Loss by Competitor:**\n\n${result.stats.map((s: any) =>
                    `• **${s.competitor}:** ${s.winRate !== null ? `${s.winRate}% win rate` : "No data"} (Won: ${s.wins}, Lost: ${s.losses})`
                ).join("\n")
                    }${result.topThreat ? `\n\n⚠️ **Top Threat:** ${result.topThreat}` : ""}`;
            } else if (toolCall.tool === "generate_response") {
                friendlyResponse = `💬 **Competitive Response: ${result.competitor}**\n\n**Objection:** "${result.objection}"\n\n---\n\n${result.response}`;
            } else if (toolCall.tool === "add_battlecard") {
                friendlyResponse = `✅ ${result.message}`;
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
            messages: [new AIMessage("I can help with competitive intelligence! Try:\n• 'Add [company] as competitor'\n• 'Show battlecard for [competitor]'\n• 'Analyze this for competitor mentions: [text]'\n• 'How do I respond when they say [objection]?'")],
            finalResponse: "I can help with competitive intelligence!",
        };

    } catch (error: any) {
        console.error("❌ Competitor Agent error:", error);
        return { error: error.message, finalResponse: "Error processing request. Try again." };
    }
}
