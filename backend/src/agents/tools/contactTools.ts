/**
 * Contact Tools for LangGraph Agents
 *
 * These tools allow agents to interact with the CRM's contact system.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";
import { triggerWorkflow } from "../../middleware/workflowTrigger";

// Schema definitions
const createContactSchema = z.object({
    firstName: z.string().describe("First name of the contact"),
    lastName: z.string().optional().describe("Last name of the contact"),
    email: z.string().email().optional().describe("Email address of the contact"),
    phone: z.string().optional().describe("Phone number"),
    company: z.string().optional().describe("Company or organization name"),
    jobTitle: z.string().optional().describe("Job title or role"),
    notes: z.string().optional().describe("Any additional notes about the contact"),
});

const searchContactsSchema = z.object({
    query: z.string().describe("Search query - matches against name, email, company, or notes"),
    limit: z.number().optional().default(10).describe("Maximum number of results to return"),
});

const updateContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to update"),
    firstName: z.string().optional().describe("Updated first name"),
    lastName: z.string().optional().describe("Updated last name"),
    email: z.string().email().optional().describe("Updated email address"),
    phone: z.string().optional().describe("Updated phone number"),
    company: z.string().optional().describe("Updated company name"),
    jobTitle: z.string().optional().describe("Updated job title"),
    notes: z.string().optional().describe("Updated notes"),
    status: z.enum(["lead", "prospect", "customer", "churned"]).optional().describe("Updated status"),
});

const getContactSchema = z.object({
    contactId: z.string().describe("The ID of the contact to retrieve"),
});

/**
 * Create a new contact in the CRM
 */
export const createContactTool = (tool as any)(
    async (input: z.infer<typeof createContactSchema>, config: any) => {
        const { firstName, lastName, email, phone, company, jobTitle, notes } = input;
        const { workspaceId, userId } = config.configurable || {};

        if (!workspaceId) {
            return JSON.stringify({ success: false, error: "Workspace ID is required" });
        }

        try {
            // Check for duplicate email
            if (email) {
                const existing = await Contact.findOne({ workspaceId, email });
                if (existing) {
                    return JSON.stringify({
                        success: false,
                        error: `Contact with email ${email} already exists`,
                        existingContactId: existing._id.toString(),
                    });
                }
            }

            // Create the contact
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

            // Publish event for workflow triggers
            await eventPublisher.publish("contact.created", {
                contactId: contact._id.toString(),
                firstName: contact.firstName,
                lastName: contact.lastName,
                email: contact.email,
            }, {
                workspaceId,
                userId,
                source: "system",
            });

            // Trigger workflow directly (bypasses Redis queue which may be rate-limited)
            triggerWorkflow("contact:created", contact, workspaceId);

            return JSON.stringify({
                success: true,
                message: `Created contact: ${firstName} ${lastName}`,
                contactId: contact._id.toString(),
                contact: {
                    id: contact._id.toString(),
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    email: contact.email,
                    company: contact.company,
                },
            });
        } catch (error: any) {
            console.error("Create contact tool error:", error);
            return JSON.stringify({
                success: false,
                error: error.message || "Failed to create contact",
            });
        }
    },
    {
        name: "create_contact",
        description: "Create a new contact in the CRM. Use this when the user wants to add a new person to their contacts.",
        schema: createContactSchema,
    }
);

/**
 * Search for contacts in the CRM
 */
export const searchContactsTool = (tool as any)(
    async (input: z.infer<typeof searchContactsSchema>, config: any) => {
        const { query, limit = 10 } = input;
        const { workspaceId } = config.configurable || {};

        if (!workspaceId) {
            return JSON.stringify({ success: false, error: "Workspace ID is required" });
        }

        try {
            // Build search query
            const searchRegex = new RegExp(query, "i");
            const contacts = await Contact.find({
                workspaceId,
                $or: [
                    { firstName: searchRegex },
                    { lastName: searchRegex },
                    { email: searchRegex },
                    { company: searchRegex },
                    { jobTitle: searchRegex },
                ],
            })
                .limit(limit)
                .select("firstName lastName email company jobTitle status")
                .lean();

            return JSON.stringify({
                success: true,
                count: contacts.length,
                contacts: contacts.map((c: any) => ({
                    id: c._id.toString(),
                    name: `${c.firstName} ${c.lastName}`.trim(),
                    email: c.email,
                    company: c.company,
                    jobTitle: c.jobTitle,
                    status: c.status,
                })),
            });
        } catch (error: any) {
            console.error("Search contacts tool error:", error);
            return JSON.stringify({
                success: false,
                error: error.message || "Failed to search contacts",
            });
        }
    },
    {
        name: "search_contacts",
        description: "Search for contacts in the CRM by name, email, company, or job title.",
        schema: searchContactsSchema,
    }
);

/**
 * Update an existing contact
 */
export const updateContactTool = (tool as any)(
    async (input: z.infer<typeof updateContactSchema>, config: any) => {
        const { contactId, ...updates } = input;
        const { workspaceId, userId } = config.configurable || {};

        if (!workspaceId) {
            return JSON.stringify({ success: false, error: "Workspace ID is required" });
        }

        try {
            const contact = await Contact.findOneAndUpdate(
                { _id: contactId, workspaceId },
                { $set: updates },
                { new: true, runValidators: true }
            );

            if (!contact) {
                return JSON.stringify({
                    success: false,
                    error: "Contact not found",
                });
            }

            // Publish update event
            await eventPublisher.publish("contact.updated", {
                contactId: contact._id.toString(),
                updates,
            }, {
                workspaceId,
                userId,
                source: "system",
            });

            return JSON.stringify({
                success: true,
                message: `Updated contact: ${contact.firstName} ${contact.lastName}`,
                contact: {
                    id: contact._id.toString(),
                    firstName: contact.firstName,
                    lastName: contact.lastName,
                    email: contact.email,
                    company: contact.company,
                },
            });
        } catch (error: any) {
            console.error("Update contact tool error:", error);
            return JSON.stringify({
                success: false,
                error: error.message || "Failed to update contact",
            });
        }
    },
    {
        name: "update_contact",
        description: "Update an existing contact's information.",
        schema: updateContactSchema,
    }
);

/**
 * Get contact details by ID
 */
export const getContactTool = (tool as any)(
    async (input: z.infer<typeof getContactSchema>, config: any) => {
        const { contactId } = input;
        const { workspaceId } = config.configurable || {};

        if (!workspaceId) {
            return JSON.stringify({ success: false, error: "Workspace ID is required" });
        }

        try {
            const contact = await Contact.findOne({ _id: contactId, workspaceId }).lean();

            if (!contact) {
                return JSON.stringify({
                    success: false,
                    error: "Contact not found",
                });
            }

            return JSON.stringify({
                success: true,
                contact: {
                    id: (contact as any)._id.toString(),
                    firstName: (contact as any).firstName,
                    lastName: (contact as any).lastName,
                    email: (contact as any).email,
                    phone: (contact as any).phone,
                    company: (contact as any).company,
                    jobTitle: (contact as any).jobTitle,
                    status: (contact as any).status,
                    source: (contact as any).source,
                    notes: (contact as any).notes,
                    createdAt: (contact as any).createdAt,
                },
            });
        } catch (error: any) {
            console.error("Get contact tool error:", error);
            return JSON.stringify({
                success: false,
                error: error.message || "Failed to get contact",
            });
        }
    },
    {
        name: "get_contact",
        description: "Get detailed information about a specific contact by their ID.",
        schema: getContactSchema,
    }
);

// Export all contact tools
export const contactTools = [
    createContactTool,
    searchContactsTool,
    updateContactTool,
    getContactTool,
];
