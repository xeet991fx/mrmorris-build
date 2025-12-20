/**
 * Email Worker Agent
 * 
 * Handles email-related CRM operations: drafts, templates, sending.
 * Uses Google Vertex AI with Gemini 2.5 Flash.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import EmailTemplate from "../../models/EmailTemplate";
import Contact from "../../models/Contact";
import { createSafeRegex } from "../utils/escapeRegex";

/**
 * Parse tool call from AI response
 */
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

        const systemPrompt = `You are a CRM Email Agent. Manage emails and templates.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Available tools:
1. draft_email - Draft an email. Args: { to, subject, body, tone, purpose }
2. send_email - Send an email immediately. Args: { to, subject, body, templateName? }
3. create_template - Create an email template. Args: { name, subject, body, category }
4. update_template - Update a template. Args: { templateName, name?, subject?, body?, category? }
5. delete_template - Delete a template. Args: { templateName }
6. list_templates - List email templates. Args: { category? }
7. get_contact_email - Get a contact's email. Args: { contactName }

Examples:
- "send email to john@test.com about meeting" → {"tool": "send_email", "args": {"to": "john@test.com", "subject": "Meeting", "body": "Hi,\\n\\nI wanted to discuss our upcoming meeting..."}}
- "delete welcome template" → {"tool": "delete_template", "args": {"templateName": "welcome"}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Email AI Response:", responseText);

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
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with emails! Try:\n• 'Send email to john@test.com about our meeting'\n• 'Delete the welcome template'\n• 'Update the follow-up template subject'")],
            finalResponse: "I can help with emails!",
        };

    } catch (error: any) {
        console.error("❌ Email Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an error processing your email request. Please try again.",
        };
    }
}
