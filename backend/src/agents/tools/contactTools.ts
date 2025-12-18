/**
 * Contact Tools for LangGraph Agents
 * 
 * These tools allow agents to interact with the CRM's contact system.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Contact from "../../models/Contact";
import { eventPublisher } from "../../events";

/**
 * Create a new contact in the CRM
 */
export const createContactTool = tool(
    async (input, config) => {
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
        schema: z.object({
            firstName: z.string().describe("First name of the contact"),
            lastName: z.string().optional().describe("Last name of the contact"),
            email: z.string().email().optional().describe("Email address of the contact"),
            phone: z.string().optional().describe("Phone number"),
            company: z.string().optional().describe("Company or organization name"),
            jobTitle: z.string().optional().describe("Job title or role"),
            notes: z.string().optional().describe("Any additional notes about the contact"),
        }),
    }
);

/**
 * Search for contacts in the CRM
 */
export const searchContactsTool = tool(
    async (input, config) => {
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
        schema: z.object({
            query: z.string().describe("Search query to find contacts"),
            limit: z.number().optional().describe("Maximum number of results to return (default 10)"),
        }),
    }
);

/**
 * Update an existing contact
 */
export const updateContactTool = tool(
    async (input, config) => {
        const { contactId, updates } = input;
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
        schema: z.object({
            contactId: z.string().describe("The ID of the contact to update"),
            updates: z.object({
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                email: z.string().email().optional(),
                phone: z.string().optional(),
                company: z.string().optional(),
                jobTitle: z.string().optional(),
                status: z.enum(["lead", "prospect", "customer", "inactive"]).optional(),
                notes: z.string().optional(),
            }).describe("Fields to update"),
        }),
    }
);

/**
 * Get contact details by ID
 */
export const getContactTool = tool(
    async (input, config) => {
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
        schema: z.object({
            contactId: z.string().describe("The ID of the contact to retrieve"),
        }),
    }
);

// Export all contact tools
export const contactTools = [
    createContactTool,
    searchContactsTool,
    updateContactTool,
    getContactTool,
];
