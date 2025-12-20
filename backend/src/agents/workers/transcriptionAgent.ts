/**
 * Transcription Agent - Call Notes AI
 * 
 * Processes call recordings, transcribes audio, summarizes calls,
 * extracts action items, and detects BANT criteria.
 * Uses Gemini 2.5 Pro for understanding nuanced conversations.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import CallRecording from "../../models/CallRecording";
import Contact from "../../models/Contact";
import Opportunity from "../../models/Opportunity";
import Activity from "../../models/Activity";
import Task from "../../models/Task";

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

async function executeTranscriptionTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "transcribe_notes": {
            // For now, accept text notes/transcript directly
            // In production, this would integrate with speech-to-text API
            const { notes, contactName, opportunityName, title } = args;

            if (!notes) {
                return { success: false, error: "Please provide the call notes or transcript text" };
            }

            // Find related contact/opportunity
            let contactId = null;
            let opportunityId = null;

            if (contactName) {
                const regex = new RegExp(contactName, "i");
                const contact = await Contact.findOne({
                    workspaceId,
                    $or: [{ firstName: regex }, { lastName: regex }],
                });
                contactId = contact?._id;
            }

            if (opportunityName) {
                const regex = new RegExp(opportunityName, "i");
                const opp = await Opportunity.findOne({ workspaceId, title: regex });
                opportunityId = opp?._id;
            }

            // Create call recording record
            const recording = await CallRecording.create({
                workspaceId,
                userId,
                title: title || `Call Notes - ${new Date().toLocaleDateString()}`,
                transcript: notes,
                transcribedAt: new Date(),
                recordedAt: new Date(),
                source: "upload",
                contactId,
                opportunityId,
            });

            return {
                success: true,
                recordingId: recording._id.toString(),
                message: "Call notes saved. You can now analyze with 'summarize_call' or 'extract_actions'.",
            };
        }

        case "summarize_call": {
            let recording;

            if (args.recordingId) {
                recording = await CallRecording.findById(args.recordingId);
            } else if (args.transcript) {
                // Direct transcript input
                const summaryPrompt = `Summarize this sales call transcript:

${args.transcript}

Provide:
1. **Executive Summary** (2-3 sentences)
2. **Key Discussion Points** (bullet list)
3. **Prospect's Main Concerns**
4. **Decisions Made**
5. **Next Steps Agreed**
6. **Overall Call Sentiment** (positive/neutral/negative with reason)`;

                const summary = await getProModel().invoke([new HumanMessage(summaryPrompt)]);
                return {
                    success: true,
                    summary: summary.content,
                };
            } else {
                // Get most recent recording
                recording = await CallRecording.findOne({ workspaceId })
                    .sort({ recordedAt: -1 });
            }

            if (!recording || !recording.transcript) {
                return { success: false, error: "No transcript found. Please provide a recording ID or transcript." };
            }

            const summaryPrompt = `Summarize this sales call transcript:

${recording.transcript}

Provide:
1. **Executive Summary** (2-3 sentences)
2. **Key Discussion Points** (bullet list)
3. **Prospect's Main Concerns**
4. **Decisions Made**
5. **Next Steps Agreed**
6. **Overall Call Sentiment** (positive/neutral/negative with reason)`;

            const summary = await getProModel().invoke([new HumanMessage(summaryPrompt)]);

            // Update recording with summary
            recording.summary = summary.content as string;
            await recording.save();

            return {
                success: true,
                recordingId: recording._id.toString(),
                title: recording.title,
                summary: summary.content,
            };
        }

        case "extract_actions": {
            let transcript = args.transcript;

            if (args.recordingId) {
                const recording = await CallRecording.findById(args.recordingId);
                transcript = recording?.transcript;
            }

            if (!transcript) {
                return { success: false, error: "No transcript provided" };
            }

            const actionsPrompt = `Extract action items from this sales call:

${transcript}

For each action item, provide:
1. Task description (clear and actionable)
2. Owner (who should do it - "us" or "prospect" or specific name if mentioned)
3. Priority (high/medium/low based on urgency mentioned)
4. Due date hint (if any timeline was mentioned)

Return as JSON array:
[{"task": "...", "owner": "...", "priority": "...", "dueHint": "..."}]`;

            const actionsResponse = await getProModel().invoke([new HumanMessage(actionsPrompt)]);

            let actions = [];
            try {
                const match = (actionsResponse.content as string).match(/\[[\s\S]*\]/);
                if (match) {
                    actions = JSON.parse(match[0]);
                }
            } catch (e) {
                actions = [];
            }

            // If we have a recording, update it
            if (args.recordingId) {
                await CallRecording.findByIdAndUpdate(args.recordingId, {
                    actionItems: actions.map((a: any) => ({
                        task: a.task,
                        assignee: a.owner,
                        completed: false,
                    })),
                });
            }

            return {
                success: true,
                actionsCount: actions.length,
                actions,
            };
        }

        case "detect_bant": {
            let transcript = args.transcript;

            if (args.recordingId) {
                const recording = await CallRecording.findById(args.recordingId);
                transcript = recording?.transcript;
            }

            if (!transcript) {
                return { success: false, error: "No transcript provided" };
            }

            const bantPrompt = `Analyze this sales call for BANT qualification criteria:

${transcript}

Extract:

**BUDGET:**
- Was budget discussed? (yes/no)
- Budget amount or range if mentioned
- Direct quote from transcript

**AUTHORITY:**
- Is this person a decision maker? (yes/no/unclear)
- Who else is involved in the decision?
- Direct quote showing authority level

**NEED:**
- Were pain points identified? (yes/no)
- List specific needs/problems mentioned
- Direct quote about their needs

**TIMELINE:**
- Was timeline discussed? (yes/no)
- When do they want to implement/buy?
- Direct quote about timeline

Return as JSON:
{
  "budget": {"discussed": boolean, "amount": "...", "quote": "..."},
  "authority": {"isDecisionMaker": boolean, "others": "...", "quote": "..."},
  "need": {"identified": boolean, "painPoints": [...], "quote": "..."},
  "timeline": {"discussed": boolean, "target": "...", "quote": "..."},
  "qualificationScore": 0-100,
  "recommendation": "..."
}`;

            const bantResponse = await getProModel().invoke([new HumanMessage(bantPrompt)]);

            let bant = {};
            try {
                const match = (bantResponse.content as string).match(/\{[\s\S]*\}/);
                if (match) {
                    bant = JSON.parse(match[0]);
                }
            } catch (e) {
                bant = { error: "Could not parse BANT criteria" };
            }

            // Update recording if we have one
            if (args.recordingId) {
                await CallRecording.findByIdAndUpdate(args.recordingId, {
                    keyInsights: {
                        budget: {
                            mentioned: (bant as any).budget?.discussed || false,
                            details: (bant as any).budget?.amount,
                            quote: (bant as any).budget?.quote,
                        },
                        authority: {
                            decisionMaker: (bant as any).authority?.isDecisionMaker || false,
                            details: (bant as any).authority?.others,
                            quote: (bant as any).authority?.quote,
                        },
                        need: {
                            identified: (bant as any).need?.identified || false,
                            painPoints: (bant as any).need?.painPoints || [],
                            quote: (bant as any).need?.quote,
                        },
                        timeline: {
                            mentioned: (bant as any).timeline?.discussed || false,
                            details: (bant as any).timeline?.target,
                            quote: (bant as any).timeline?.quote,
                        },
                    },
                });
            }

            return {
                success: true,
                bant,
            };
        }

        case "update_crm_from_call": {
            const { recordingId, createTasks = true, logActivity = true } = args;

            const recording = await CallRecording.findById(recordingId)
                .populate("contactId")
                .populate("opportunityId");

            if (!recording) {
                return { success: false, error: "Recording not found" };
            }

            const updates: string[] = [];

            // Create activity log
            if (logActivity && recording.contactId) {
                await Activity.create({
                    workspaceId,
                    userId,
                    contactId: recording.contactId,
                    opportunityId: recording.opportunityId,
                    type: "call",
                    description: recording.summary || `Call recorded: ${recording.title}`,
                    outcome: recording.overallSentiment || "neutral",
                });
                updates.push("Activity logged");
            }

            // Create tasks from action items
            if (createTasks && recording.actionItems && recording.actionItems.length > 0) {
                for (const item of recording.actionItems) {
                    if (item.assignee === "us" || item.assignee?.toLowerCase().includes("we")) {
                        await Task.create({
                            workspaceId,
                            userId,
                            title: item.task,
                            description: `From call: ${recording.title}`,
                            priority: "medium",
                            status: "pending",
                            dueDate: item.dueDate || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                        });
                    }
                }
                updates.push(`${recording.actionItems.filter((i: any) => i.assignee === "us" || i.assignee?.toLowerCase().includes("we")).length} tasks created`);
            }

            // Update opportunity if BANT detected
            if (recording.opportunityId && recording.keyInsights) {
                const oppUpdates: any = { lastActivityAt: new Date() };

                if (recording.keyInsights.need?.identified) {
                    oppUpdates.description = recording.keyInsights.need.painPoints?.join(", ");
                }

                await Opportunity.findByIdAndUpdate(recording.opportunityId, oppUpdates);
                updates.push("Opportunity updated");
            }

            return {
                success: true,
                updates,
                message: `CRM updated: ${updates.join(", ")}`,
            };
        }

        case "get_call_sentiment": {
            let transcript = args.transcript;

            if (args.recordingId) {
                const recording = await CallRecording.findById(args.recordingId);
                transcript = recording?.transcript;
            }

            if (!transcript) {
                return { success: false, error: "No transcript provided" };
            }

            const sentimentPrompt = `Analyze the sentiment of this sales call:

${transcript}

Provide:
1. **Overall Sentiment**: positive, neutral, or negative
2. **Confidence**: 0-100
3. **Key Positive Moments**: Quotes showing interest/enthusiasm
4. **Key Negative Moments**: Quotes showing concern/objection
5. **Turning Points**: Where the conversation shifted
6. **Prospect Engagement Level**: high/medium/low

Return as JSON:
{
  "sentiment": "...",
  "confidence": 0-100,
  "positiveQuotes": [...],
  "negativeQuotes": [...],
  "turningPoints": [...],
  "engagementLevel": "..."
}`;

            const sentimentResponse = await getProModel().invoke([new HumanMessage(sentimentPrompt)]);

            let sentiment = {};
            try {
                const match = (sentimentResponse.content as string).match(/\{[\s\S]*\}/);
                if (match) {
                    sentiment = JSON.parse(match[0]);
                }
            } catch (e) {
                sentiment = { sentiment: "neutral", error: "Could not analyze" };
            }

            // Update recording
            if (args.recordingId) {
                await CallRecording.findByIdAndUpdate(args.recordingId, {
                    overallSentiment: (sentiment as any).sentiment,
                });
            }

            return {
                success: true,
                sentiment,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function transcriptionAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🎙️ Transcription Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Call Transcription Agent. Process sales calls and extract valuable insights.

Available tools:

1. transcribe_notes - Save call notes/transcript for analysis
   Args: { notes: string, contactName?: string, opportunityName?: string, title?: string }
   Returns: Recording ID for further analysis

2. summarize_call - Create executive summary of a call
   Args: { recordingId?: string, transcript?: string }
   Returns: Key points, decisions, next steps

3. extract_actions - Parse action items from call
   Args: { recordingId?: string, transcript?: string }
   Returns: List of action items with owners

4. detect_bant - Extract BANT qualification criteria
   Args: { recordingId?: string, transcript?: string }
   Returns: Budget, Authority, Need, Timeline analysis

5. update_crm_from_call - Auto-update CRM from call insights
   Args: { recordingId: string, createTasks?: boolean, logActivity?: boolean }
   Returns: Updates made (tasks, activities, opportunity fields)

6. get_call_sentiment - Analyze call sentiment
   Args: { recordingId?: string, transcript?: string }
   Returns: Sentiment analysis with key moments

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Summarize: [call transcript here]" → {"tool": "summarize_call", "args": {"transcript": "..."}}
- "What action items from my last call?" → {"tool": "extract_actions", "args": {}}
- "Check BANT for this call: [transcript]" → {"tool": "detect_bant", "args": {"transcript": "..."}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Transcription AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeTranscriptionTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "transcribe_notes") {
                friendlyResponse = `✅ ${result.message}\n\nRecording ID: ${result.recordingId}`;
            } else if (toolCall.tool === "summarize_call") {
                friendlyResponse = `📝 **Call Summary${result.title ? `: ${result.title}` : ""}**\n\n${result.summary}`;
            } else if (toolCall.tool === "extract_actions") {
                if (result.actionsCount === 0) {
                    friendlyResponse = "No specific action items detected in the call.";
                } else {
                    friendlyResponse = `✅ **${result.actionsCount} Action Items Found:**\n\n${result.actions.map((a: any, i: number) =>
                        `${i + 1}. **${a.task}**\n   Owner: ${a.owner} | Priority: ${a.priority}${a.dueHint ? ` | Due: ${a.dueHint}` : ""}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "detect_bant") {
                const b = result.bant;
                friendlyResponse = `🎯 **BANT Qualification Analysis**

**Budget:** ${b.budget?.discussed ? `✅ Discussed - ${b.budget.amount || "Amount not specified"}` : "❌ Not discussed"}
${b.budget?.quote ? `> "${b.budget.quote}"` : ""}

**Authority:** ${b.authority?.isDecisionMaker ? "✅ Decision Maker" : "⚠️ Not confirmed as decision maker"}
${b.authority?.others ? `Others involved: ${b.authority.others}` : ""}
${b.authority?.quote ? `> "${b.authority.quote}"` : ""}

**Need:** ${b.need?.identified ? "✅ Pain points identified" : "❌ Needs unclear"}
${b.need?.painPoints?.length > 0 ? `Pain points: ${b.need.painPoints.join(", ")}` : ""}
${b.need?.quote ? `> "${b.need.quote}"` : ""}

**Timeline:** ${b.timeline?.discussed ? `✅ ${b.timeline.target || "Timeline mentioned"}` : "❌ No timeline discussed"}
${b.timeline?.quote ? `> "${b.timeline.quote}"` : ""}

**Qualification Score:** ${b.qualificationScore || "N/A"}/100
**Recommendation:** ${b.recommendation || "Continue qualification"}`;
            } else if (toolCall.tool === "update_crm_from_call") {
                friendlyResponse = `✅ **CRM Updated**\n\n${result.updates?.join("\n• ") || result.message}`;
            } else if (toolCall.tool === "get_call_sentiment") {
                const s = result.sentiment;
                const emoji = s.sentiment === "positive" ? "😊" : s.sentiment === "negative" ? "😟" : "😐";
                friendlyResponse = `${emoji} **Call Sentiment: ${s.sentiment?.toUpperCase()}** (${s.confidence}% confidence)

**Engagement Level:** ${s.engagementLevel}

**Positive Moments:**
${s.positiveQuotes?.map((q: string) => `• "${q}"`).join("\n") || "None detected"}

**Concerns/Objections:**
${s.negativeQuotes?.map((q: string) => `• "${q}"`).join("\n") || "None detected"}`;
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
            messages: [new AIMessage("I can help analyze your sales calls! Try:\n• 'Summarize this call: [paste transcript]'\n• 'Extract action items from: [transcript]'\n• 'Check BANT qualification: [transcript]'\n• 'What was the sentiment of my call?'")],
            finalResponse: "I can help with call transcription and analysis!",
        };

    } catch (error: any) {
        console.error("❌ Transcription Agent error:", error);
        return { error: error.message, finalResponse: "Error processing call. Try again." };
    }
}
