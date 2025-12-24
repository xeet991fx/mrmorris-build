/**
 * Email Worker Agent
 * 
 * Handles email-related CRM operations: drafts, templates, sending.
 * Uses Google Vertex AI with Gemini 2.5 Flash.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import EmailTemplate from "../../models/EmailTemplate";
import Contact from "../../models/Contact";
import { createSafeRegex } from "../utils/escapeRegex";

/**
 * Execute email tools
 */
async function executeEmailTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "draft_email": {
            const { to, subject, body, tone, purpose } = args;

            // Generate email content using AI if body not fully provided
            let emailBody = body;
            if (!body && purpose) {
                const draftPrompt = `Write a professional ${tone || "friendly"} email for: ${purpose}`;
                const draftResponse = await getProModel().invoke([
                    new SystemMessage("You are an expert email writer. Write concise, professional emails."),
                    new HumanMessage(draftPrompt),
                ]);
                emailBody = draftResponse.content as string;
            }

            return {
                success: true,
                draft: {
                    to,
                    subject: subject || `Regarding: ${purpose || "your request"}`,
                    body: emailBody,
                },
                message: "Email draft created successfully",
            };
        }

        case "create_template": {
            const { name, subject, body, category } = args;

            const template = await EmailTemplate.create({
                workspaceId,
                userId,
                name,
                subject,
                body,
                category: category || "general",
                isActive: true,
            });

            return {
                success: true,
                templateId: template._id.toString(),
                message: `Template "${name}" created successfully`,
            };
        }

        case "update_template": {
            const { templateName, name, subject, body, category } = args;

            const searchRegex = createSafeRegex(templateName);
            const updates: any = {};
            if (name) updates.name = name;
            if (subject) updates.subject = subject;
            if (body) updates.body = body;
            if (category) updates.category = category;

            const template = await EmailTemplate.findOneAndUpdate(
                { workspaceId, name: searchRegex, isActive: true },
                { $set: updates },
                { new: true }
            );

            if (!template) {
                return { success: false, error: `Template "${templateName}" not found` };
            }

            return {
                success: true,
                message: `Template "${template.name}" updated successfully`,
            };
        }

        case "delete_template": {
            const { templateName } = args;

            const searchRegex = createSafeRegex(templateName);
            const template = await EmailTemplate.findOneAndUpdate(
                { workspaceId, name: searchRegex, isActive: true },
                { isActive: false },
                { new: true }
            );

            if (!template) {
                return { success: false, error: `Template "${templateName}" not found` };
            }

            return {
                success: true,
                message: `Template "${template.name}" deleted successfully 🗑️`,
            };
        }

        case "purge_templates": {
            // Hard delete all inactive templates
            const result = await EmailTemplate.deleteMany({ workspaceId, isActive: false });

            return {
                success: true,
                message: `Permanently deleted ${result.deletedCount} inactive template(s) 🧹`,
                deletedCount: result.deletedCount,
            };
        }

        case "send_email": {
            const { to, subject, body, templateName } = args;

            let emailSubject = subject;
            let emailBody = body;

            // If using a template, fetch it
            if (templateName && (!subject || !body)) {
                const searchRegex = createSafeRegex(templateName);
                const template = await EmailTemplate.findOne({
                    workspaceId,
                    name: searchRegex,
                    isActive: true,
                }).lean();

                if (template) {
                    emailSubject = emailSubject || (template as any).subject;
                    emailBody = emailBody || (template as any).body;
                }
            }

            if (!to || !emailSubject || !emailBody) {
                return { success: false, error: "Missing required fields: to, subject, or body" };
            }

            // Send via Resend
            try {
                const { Resend } = await import("resend");
                const resend = new Resend(process.env.RESEND_API_KEY);

                await resend.emails.send({
                    from: process.env.RESEND_FROM_EMAIL || "noreply@resend.dev",
                    to: to,
                    subject: emailSubject,
                    html: emailBody.replace(/\n/g, "<br>"),
                });

                return {
                    success: true,
                    message: `Email sent to ${to} successfully! 📧`,
                };
            } catch (error: any) {
                return {
                    success: false,
                    error: `Failed to send email: ${error.message}`,
                };
            }
        }

        case "list_templates": {
            const { category } = args;

            const query: any = { workspaceId, isActive: true };
            if (category) query.category = category;

            const templates = await EmailTemplate.find(query)
                .select("name subject category")
                .limit(20)
                .lean();

            return {
                success: true,
                count: templates.length,
                templates: templates.map((t: any) => ({
                    id: t._id.toString(),
                    name: t.name,
                    subject: t.subject,
                    category: t.category,
                })),
            };
        }

        case "get_contact_email": {
            const { contactName } = args;
            const searchRegex = createSafeRegex(contactName);

            const contact = await Contact.findOne({
                workspaceId,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                ],
            }).select("firstName lastName email company").lean();

            if (!contact) {
                return { success: false, error: `Contact "${contactName}" not found` };
            }

            return {
                success: true,
                contact: {
                    name: `${(contact as any).firstName} ${(contact as any).lastName}`.trim(),
                    email: (contact as any).email,
                    company: (contact as any).company,
                },
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

/**
 * Email Agent Node
 */
export async function emailAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📧 Email Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // PHASE 1: AUTONOMOUS CONTEXT GATHERING
        const [EmailTemplate, Contact] = await Promise.all([
            (await import("../../models/EmailTemplate")).default,
            (await import("../../models/Contact")).default
        ]);

        const [templates, sampleContacts] = await Promise.all([
            EmailTemplate.find({ workspaceId: state.workspaceId })
                .select("name subject category createdAt")
                .sort({ createdAt: -1 })
                .limit(5)
                .lean(),
            Contact.find({ workspaceId: state.workspaceId })
                .select("firstName lastName email company")
                .limit(3)
                .lean()
        ]);

        const templateContext = templates.length > 0
            ? `EMAIL TEMPLATES (NEWEST first):\n${templates.map((t: any, i: number) => {
                const isNewest = i === 0 ? " 🆕 LATEST" : "";
                return `${i + 1}. "${t.name}" (${t.category || "general"}) - "${t.subject}"${isNewest}`;
              }).join('\n')}`
            : "No templates. This will be the first template.";

        const contactContext = sampleContacts.length > 0
            ? `SAMPLE CONTACTS (for personalization):\n${sampleContacts.map((c: any) =>
                `• ${c.firstName} ${c.lastName} (${c.email}) at ${c.company || "Unknown"}`
              ).join('\n')}`
            : "No contacts yet.";

        const systemPrompt = `You are an ELITE Email Communication Specialist powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: Create intelligent, personalized emails using real data.

📊 CURRENT EMAIL CONTEXT:
${templateContext}

${contactContext}

USER REQUEST: "${userRequest}"

🧠 AUTONOMOUS PROCESS:

STEP 1: INTENT - DRAFT/SEND/CREATE_TEMPLATE/UPDATE/DELETE/LIST?
STEP 2: PERSONALIZATION
- Use contact data: {{firstName}}, {{lastName}}, {{company}}
- Professional tone unless specified otherwise
- Clear subject lines
- If deleting latest template: #1 is newest (🆕)

STEP 3: SMART EMAIL WRITING
❌ BAD: "Hi, We wanted to reach out..."
✅ GOOD: "Hi {{firstName}}, Based on {{company}}'s recent..."

🔧 TOOLS:
1. draft_email - { to, subject, body, tone?, purpose? }
2. send_email - { to, subject, body, templateName? }
3. create_template - { name, subject, body, category }
4. update_template - { templateName, name?, subject?, body?, category? }
5. delete_template - { templateName }
6. list_templates - { category? }
7. get_contact_email - { contactName }

📝 FORMAT:
ANALYSIS: [Your thinking - personalization strategy, tone, purpose]
JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;

        // PHASE 3: EXTRACT REASONING
        const analysisMatch = responseText.match(/ANALYSIS:(.*?)(?=JSON:|$)/s);
        const aiAnalysis = analysisMatch ? analysisMatch[1].trim() : "";

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            console.log(`🔧 Executing email tool: ${toolCall.tool}`);

            const result = await executeEmailTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            console.log("✅ Email tool result:", result);

            let friendlyResponse = "";
            if (result.success) {
                if (toolCall.tool === "draft_email") {
                    friendlyResponse = `Here's your email draft:\n\n**To:** ${result.draft.to || "[recipient]"}\n**Subject:** ${result.draft.subject}\n\n${result.draft.body}`;
                } else if (toolCall.tool === "send_email" || toolCall.tool === "create_template" ||
                    toolCall.tool === "update_template" || toolCall.tool === "delete_template") {
                    friendlyResponse = result.message;
                } else if (toolCall.tool === "list_templates") {
                    if (result.count === 0) {
                        friendlyResponse = "No email templates found.";
                    } else {
                        friendlyResponse = `Found ${result.count} template(s):\n${result.templates.map((t: any) => `• ${t.name} (${t.category})`).join("\n")}`;
                    }
                } else if (toolCall.tool === "get_contact_email") {
                    friendlyResponse = `${result.contact.name}'s email is ${result.contact.email}${result.contact.company ? ` (${result.contact.company})` : ""}`;
                } else {
                    friendlyResponse = result.message || "Done!";
                }
            } else {
                friendlyResponse = `Sorry, I couldn't complete that: ${result.error}`;
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result, aiAnalysis: aiAnalysis || null },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with email communication! Try:\n• 'Draft an email to John Smith about our proposal'\n• 'Create a follow-up email template'\n• 'Delete the latest template'\n• 'List all email templates'")],
            finalResponse: "I can help with email communication!",
        };

    } catch (error: any) {
        console.error("❌ Email Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error processing your email request. Please try again.",
        };
    }
}
