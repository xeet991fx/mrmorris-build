import { SubAgent } from "deepagents";
import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import Contact from "../../../models/Contact";

// Helper to create tools from our existing tool classes
function createContactTools(workspaceId: string, userId: string): any[] {
    return [
        new DynamicStructuredTool({
            name: "search_contacts",
            description: "Search for contacts in the CRM with filters like status, name, email, company, tags",
            schema: z.object({
                query: z.string().optional().describe("Search query for name, email, or company"),
                status: z.enum(["lead", "prospect", "customer", "inactive"]).optional().describe("Contact status"),
                limit: z.number().optional().default(10).describe("Maximum results to return"),
                sortBy: z.enum(["createdAt", "score", "lastActivity"]).optional().describe("Sort field"),
            }),
            func: async (input) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.query) {
                        filter.$or = [
                            { firstName: { $regex: input.query, $options: "i" } },
                            { lastName: { $regex: input.query, $options: "i" } },
                            { email: { $regex: input.query, $options: "i" } },
                            { company: { $regex: input.query, $options: "i" } },
                        ];
                    }
                    if (input.status) filter.status = input.status;

                    const contacts = await Contact.find(filter)
                        .sort({ [input.sortBy || "createdAt"]: -1 })
                        .limit(input.limit || 10)
                        .lean();

                    return JSON.stringify({
                        success: true,
                        count: contacts.length,
                        contacts: contacts.map((c: any) => ({
                            id: c._id,
                            name: `${c.firstName} ${c.lastName}`.trim(),
                            email: c.email,
                            company: c.company,
                            status: c.status,
                            score: c.score,
                        })),
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "create_contact",
            description: "Create a new contact in the CRM",
            schema: z.object({
                firstName: z.string().describe("First name"),
                lastName: z.string().optional().describe("Last name"),
                email: z.string().email().describe("Email address"),
                company: z.string().optional().describe("Company name"),
                phone: z.string().optional().describe("Phone number"),
                status: z.enum(["lead", "prospect", "customer"]).optional().default("lead"),
                tags: z.array(z.string()).optional().describe("Tags for the contact"),
            }),
            func: async (input) => {
                try {
                    const contact = await Contact.create({
                        ...input,
                        workspaceId: workspaceId,
                        createdBy: userId,
                    });
                    return JSON.stringify({
                        success: true,
                        message: `Created contact ${input.firstName} ${input.lastName || ""}`,
                        contact: {
                            id: contact._id,
                            name: `${contact.firstName} ${contact.lastName || ""}`.trim(),
                            email: contact.email,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "update_contact",
            description: "Update an existing contact's information",
            schema: z.object({
                contactId: z.string().describe("The ID of the contact to update"),
                updates: z.object({
                    firstName: z.string().optional(),
                    lastName: z.string().optional(),
                    email: z.string().email().optional(),
                    company: z.string().optional(),
                    phone: z.string().optional(),
                    status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
                    tags: z.array(z.string()).optional(),
                    score: z.number().optional(),
                }).describe("Fields to update"),
            }),
            func: async (input) => {
                try {
                    const contact = await Contact.findOneAndUpdate(
                        { _id: input.contactId, workspaceId: workspaceId },
                        { $set: input.updates },
                        { new: true }
                    );
                    if (!contact) {
                        return JSON.stringify({ success: false, error: "Contact not found" });
                    }
                    return JSON.stringify({
                        success: true,
                        message: `Updated contact ${contact.firstName}`,
                        contact: {
                            id: contact._id,
                            name: `${contact.firstName} ${contact.lastName || ""}`.trim(),
                            email: contact.email,
                            status: contact.status,
                        },
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),

        new DynamicStructuredTool({
            name: "score_contacts",
            description: "Score contacts based on their engagement and activity",
            schema: z.object({
                contactIds: z.array(z.string()).optional().describe("Specific contact IDs to score, or leave empty for all"),
            }),
            func: async (input) => {
                try {
                    const filter: any = { workspaceId: workspaceId };
                    if (input.contactIds?.length) {
                        filter._id = { $in: input.contactIds };
                    }

                    const contacts = await Contact.find(filter).lean();
                    const scored = contacts.map((c: any) => {
                        // Simple scoring algorithm
                        let score = 50; // Base score
                        if (c.email) score += 10;
                        if (c.phone) score += 10;
                        if (c.company) score += 10;
                        if (c.status === "customer") score += 20;
                        else if (c.status === "prospect") score += 10;
                        return { id: c._id, name: `${c.firstName} ${c.lastName || ""}`, score };
                    });

                    return JSON.stringify({
                        success: true,
                        message: `Scored ${scored.length} contacts`,
                        contacts: scored,
                    });
                } catch (error: any) {
                    return JSON.stringify({ success: false, error: error.message });
                }
            },
        } as any),
    ];
}

// Export tools directly for use without SubAgent wrapper (to avoid channel conflicts)
export function getContactTools(workspaceId: string, userId: string): any[] {
    return createContactTools(workspaceId, userId);
}

export function createContactSubagent(workspaceId: string, userId: string): SubAgent {
    return {
        name: "contact-manager",
        description: "Specialized agent for contact and lead management. Use this for: searching contacts, creating new contacts, updating contact information, scoring leads, and enriching contact data.",
        systemPrompt: `You are an expert contact and lead management assistant for a CRM system.

## Your Expertise
- Finding and filtering contacts with complex criteria
- Creating and organizing contact records
- Scoring and qualifying leads
- Enriching contact data

## Behavior Guidelines
1. When searching, use smart defaults (e.g., status=lead for "hottest leads")
2. Always return actionable summaries, not just raw data
3. Highlight important insights (high-value leads, missing data, etc.)
4. Be proactive about suggesting next steps

## Response Format
- Start with a summary of what you found/did
- Use bullet points for lists
- Highlight important items in **bold**
- Keep responses concise and actionable`,
        tools: createContactTools(workspaceId, userId),
    };
}
