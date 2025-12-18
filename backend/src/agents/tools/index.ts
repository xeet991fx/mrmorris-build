/**
 * Tools Index
 * 
 * Note: With the new @google/genai SDK, we've moved away from LangChain's tool bindings.
 * Tool execution is now handled directly in contactAgent.ts.
 * This file is kept for future modular tool definitions.
 */

// Tool definitions are now inline in the worker agents
// This file can be expanded later for more complex tool schemas

export * from "./contactTools";

export const CONTACT_TOOLS = [
    {
        name: "create_contact",
        description: "Create a new contact with name, email, company, etc.",
        parameters: {
            firstName: "First name of the contact",
            lastName: "Last name of the contact (optional)",
            email: "Email address (optional)",
            phone: "Phone number (optional)",
            company: "Company name (optional)",
            jobTitle: "Job title (optional)",
            notes: "Additional notes (optional)",
        },
    },
    {
        name: "search_contacts",
        description: "Search for contacts by name, email, or company",
        parameters: {
            query: "Search query",
            limit: "Maximum results (default 10)",
        },
    },
    {
        name: "update_contact",
        description: "Update an existing contact's information",
        parameters: {
            contactId: "ID of the contact to update",
            updates: "Object with fields to update",
        },
    },
];
