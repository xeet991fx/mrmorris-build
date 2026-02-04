/**
 * Contact Worker Agent
 * 
 * Handles all contact-related CRM operations.
 * Uses Google Vertex AI with Gemini 2.5 Pro for intelligent parsing.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";
import { parseToolCall } from "../utils/parseToolCall";
import { createSafeRegex } from "../utils/escapeRegex";
import { triggerWorkflow } from "../../middleware/workflowTrigger";

/**
 * Execute contact tools
 */
async function executeContactTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_contact": {
            const { firstName, lastName, email, phone, company, jobTitle, notes } = args;

            if (email) {
                const existing = await Contact.findOne({ workspaceId, email });
                if (existing) {
                    return { success: false, error: `Contact with email ${email} already exists` };
                }
            }

            const contact = await Contact.create({
                workspaceId,
                userId,
                firstName: firstName || "",
                lastName: lastName || "",
                email: email || "",
                phone: phone || "",
                company: company || "",
                jobTitle: jobTitle || "",
                notes: notes || "",
                status: "lead",
                source: "AI Agent",
            });

            await eventPublisher.publish("contact.created", {
                contactId: contact._id.toString(),
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
            }, { workspaceId, userId, source: "system" });

            // Trigger workflow directly (bypasses Redis queue which may be rate-limited)
            triggerWorkflow("contact:created", contact, workspaceId);

            return {
                success: true,
                message: `Created contact: ${firstName} ${lastName}`,
                contactId: contact._id.toString(),
            };
        }

        case "search_contacts": {
            const { query, limit = 10 } = args;
            const searchRegex = createSafeRegex(query);

            const contacts = await Contact.find({
                workspaceId,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                    { company: searchRegex },
                ],
            })
                .limit(limit)
                .select("firstName lastName email company status")
                .lean();

            return {
                success: true,
                count: contacts.length,
                contacts: contacts.map((c: any) => ({
                    id: c._id.toString(),
                    name: `${c.firstName} ${c.lastName}`.trim(),
                    email: c.email,
                    company: c.company,
                })),
            };
        }

        case "update_contact": {
            const { contactId, updates } = args;

            const contact = await Contact.findOneAndUpdate(
                { _id: contactId, workspaceId },
                { $set: updates },
                { new: true }
            );

            if (!contact) {
                return { success: false, error: "Contact not found" };
            }

            await eventPublisher.publish("contact.updated", {
                contactId: contact._id.toString(),
                updates,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Updated contact: ${contact.firstName} ${contact.lastName}`,
            };
        }

        case "delete_contact": {
            const { contactId } = args;

            const contact = await Contact.findOneAndDelete({
                _id: contactId,
                workspaceId,
            });

            if (!contact) {
                return { success: false, error: "Contact not found" };
            }

            await eventPublisher.publish("contact.deleted", {
                contactId: contact._id.toString(),
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
            }, { workspaceId, userId, source: "system" });

            return {
                success: true,
                message: `Deleted contact: ${contact.firstName} ${contact.lastName}`,
                deletedId: contact._id.toString(),
            };
        }

        case "delete_contacts_bulk": {
            const { criteria } = args;

            // Build filter based on criteria
            const filter: any = { workspaceId };

            if (criteria.withoutEmail) {
                filter.$or = [
                    { email: "" },
                    { email: { $exists: false } },
                ];
            }

            if (criteria.withoutPhone) {
                filter.$or = [
                    { phone: "" },
                    { phone: { $exists: false } },
                ];
            }

            if (criteria.status) {
                filter.status = criteria.status;
            }

            if (criteria.company) {
                filter.company = createSafeRegex(criteria.company);
            }

            // First get the contacts to be deleted (for confirmation)
            const contactsToDelete = await Contact.find(filter)
                .select("firstName lastName email company")
                .lean();

            if (contactsToDelete.length === 0) {
                return {
                    success: true,
                    message: "No contacts found matching the criteria",
                    deletedCount: 0,
                };
            }

            // Delete them
            const result = await Contact.deleteMany(filter);

            // Publish events for each deleted contact
            for (const contact of contactsToDelete) {
                await eventPublisher.publish("contact.deleted", {
                    contactId: (contact as any)._id.toString(),
                    firstName: (contact as any).firstName,
                    lastName: (contact as any).lastName,
                    email: (contact as any).email,
                }, { workspaceId, userId, source: "system" });
            }

            return {
                success: true,
                message: `Deleted ${result.deletedCount} contact(s)`,
                deletedCount: result.deletedCount,
                deletedContacts: contactsToDelete.map((c: any) => ({
                    name: `${c.firstName} ${c.lastName}`.trim(),
                    email: c.email,
                    company: c.company,
                })),
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Contact Agent Node
 */
export async function contactAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🧑‍💼 Contact Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // PHASE 1: AUTONOMOUS CONTEXT GATHERING
        console.log("🧠 Gathering contact context from CRM...");

        const existingContacts = await Contact.find({ workspaceId: state.workspaceId })
            .select("firstName lastName email company jobTitle createdAt")
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const getTimeAgo = (date: any): string => {
            if (!date) return "unknown";
            const diffMs = new Date().getTime() - new Date(date).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return `${Math.floor(diffDays / 7)}w ago`;
        };

        const contactContext = existingContacts.length > 0
            ? `EXISTING CONTACTS (sorted NEWEST first):\n${existingContacts.map((c: any, i: number) => {
                const timeAgo = getTimeAgo(c.createdAt);
                const isNewest = i === 0 ? " 🆕 LATEST" : "";
                return `${i + 1}. ${c.firstName} ${c.lastName} (${c.email}) at ${c.company || "No company"} - Added ${timeAgo}${isNewest}`;
              }).join('\n')}\n\nTotal contacts: ${existingContacts.length}+ (showing newest 10)`
            : "No contacts found. This will be the first contact.";

        const companyStats = existingContacts.reduce((acc: any, c: any) => {
            if (c.company) acc[c.company] = (acc[c.company] || 0) + 1;
            return acc;
        }, {});
        const topCompanies = Object.entries(companyStats).sort((a: any, b: any) => b[1] - a[1]).slice(0, 3);
        const companyContext = topCompanies.length > 0
            ? `\nTop companies: ${topCompanies.map(([name, count]) => `${name} (${count})`).join(", ")}`
            : "";

        console.log("✓ Context gathered");

        // PHASE 2: INTELLIGENT SYSTEM PROMPT
        const systemPrompt = `You are an ELITE CRM Contact Manager powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: You analyze REAL CRM data and make INTELLIGENT decisions.

📊 CURRENT CRM CONTEXT:
${contactContext}${companyContext}

USER REQUEST: "${userRequest}"

🧠 YOUR AUTONOMOUS PROCESS:

STEP 1: INTENT ANALYSIS
- CREATE new contact?
- SEARCH/FIND contacts?
- UPDATE existing contact?
- DELETE contact(s)?

STEP 2: CONTEXTUAL INTELLIGENCE
- Check EXISTING CONTACTS above for duplicates/patterns
- If creating: Does contact/company already exist?
- If deleting latest: #1 is the newest (marked 🆕)
- Use company patterns for better data

STEP 3: SMART DEFAULTS
- Auto-group contacts by company
- Suggest job titles based on patterns
- Avoid duplicates

🔧 AVAILABLE TOOLS:

1. create_contact - { firstName, lastName, email?, phone?, company?, jobTitle?, notes? }
2. search_contacts - { query, limit? }
3. update_contact - { contactId, updates }
4. delete_contact - { contactId }
5. delete_contacts_bulk - { criteria: { withoutEmail?, withoutPhone?, status?, company? } }

💡 EXAMPLES OF INTELLIGENCE:

❌ BAD: Just create "John Smith" with no context
✅ GOOD: "Creating John Smith... I see you already have 2 contacts at Acme Corp. Adding John to that company group."

📝 RESPONSE FORMAT:

ANALYSIS:
[Your thinking: What is user asking? CREATE/SEARCH/UPDATE/DELETE? Any duplicates? Which company group?]

JSON:
{"tool": "tool_name", "args": {...}}

Be contextually intelligent, not robotic!`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Contact AI Response (first 300 chars):", responseText.substring(0, 300));

        // PHASE 3: EXTRACT REASONING
        const analysisMatch = responseText.match(/ANALYSIS:(.*?)(?=JSON:|$)/s);
        const aiAnalysis = analysisMatch ? analysisMatch[1].trim() : "";

        if (aiAnalysis) {
            console.log("🧠 AI Analysis:", aiAnalysis.substring(0, 150));
        }

        const toolCall = parseToolCall(responseText, "ContactAgent");

        if (toolCall) {
            console.log(`🔧 Executing tool: ${toolCall.tool}`);

            const result = await executeContactTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Tool result:", result);

            // PHASE 4: CONTEXTUAL RESPONSE
            let friendlyResponse = "";

            if (result.success) {
                if (toolCall.tool === "create_contact") {
                    friendlyResponse = `✅ Created contact: **${toolCall.args.firstName} ${toolCall.args.lastName || ""}**${toolCall.args.company ? ` at ${toolCall.args.company}` : ""}\n${result.message}`;
                } else if (toolCall.tool === "search_contacts") {
                    if (result.count === 0) {
                        friendlyResponse = `No contacts found matching "${toolCall.args.query}".`;
                    } else {
                        friendlyResponse = `Found **${result.count} contact(s)**:\n${result.contacts.map((c: any) => `• **${c.name}** (${c.email || "no email"}) - ${c.company || "no company"}`).join("\n")}`;
                    }
                } else if (toolCall.tool === "update_contact") {
                    friendlyResponse = `✅ ${result.message}`;
                } else if (toolCall.tool === "delete_contact") {
                    friendlyResponse = `✅ ${result.message}`;
                } else if (toolCall.tool === "delete_contacts_bulk") {
                    if (result.deletedCount === 0) {
                        friendlyResponse = result.message;
                    } else {
                        friendlyResponse = `✅ Successfully deleted ${result.deletedCount} contact(s):\n${result.deletedContacts.map((c: any) => `• ${c.name} (${c.email || "no email"})`).join("\n")}`;
                    }
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that action: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: {
                    [toolCall.tool]: result,
                    aiAnalysis: aiAnalysis || null
                },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help you manage contacts! Try:\n• 'Create a contact for John Smith at Acme Corp'\n• 'Find contacts at Microsoft'\n• 'Delete the latest contact'")],
            finalResponse: "I can help you manage contacts! Try:\n• 'Create a contact for John Smith at Acme Corp'\n• 'Find contacts at Microsoft'\n• 'Delete the latest contact'",
        };

    } catch (error: any) {
        console.error("❌ Contact Agent error:", error);
        return {
            error: error.message || "Contact agent failed",
            finalResponse: "I encountered an error while processing your request. Please try again.",
        };
    }
}
