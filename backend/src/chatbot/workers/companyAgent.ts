/**
 * Company Worker Agent
 * 
 * Handles company/account management: create, search, update, get contacts.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import Company from "../../models/Company";
import Contact from "../../models/Contact";
import { createSafeRegex } from "../utils/escapeRegex";
async function executeCompanyTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_company": {
            const { name, website, industry, location } = args;

            const company = await Company.create({
                workspaceId,
                userId,
                name,
                website: website || "",
                industry: industry || "",
                status: "lead",
            });

            return {
                success: true,
                companyId: company._id.toString(),
                message: `Company "${name}" created successfully`,
            };
        }

        case "search_companies": {
            const { query, industry } = args;

            const filter: any = { workspaceId };
            if (query) {
                const regex = createSafeRegex(query);
                filter.$or = [{ name: regex }, { domain: regex }];
            }
            if (industry) {
                filter.industry = createSafeRegex(industry);
            }

            const companies = await Company.find(filter)
                .select("name domain industry size")
                .limit(15)
                .lean();

            return {
                success: true,
                count: companies.length,
                companies: companies.map((c: any) => ({
                    id: c._id.toString(),
                    name: c.name,
                    domain: c.domain,
                    industry: c.industry,
                    size: c.size,
                })),
            };
        }

        case "get_company_contacts": {
            const { companyName } = args;

            const regex = createSafeRegex(companyName);
            const company = await Company.findOne({ workspaceId, name: regex });

            if (!company) {
                return { success: false, error: `Company "${companyName}" not found` };
            }

            const contacts = await Contact.find({
                workspaceId,
                companyId: company._id,
            })
                .select("firstName lastName email title")
                .limit(20)
                .lean();

            return {
                success: true,
                company: company.name,
                count: contacts.length,
                contacts: contacts.map((c: any) => ({
                    name: `${c.firstName} ${c.lastName}`,
                    email: c.email,
                    title: c.title,
                })),
            };
        }

        case "update_company": {
            const { companyName, updates } = args;

            const regex = createSafeRegex(companyName);
            const company = await Company.findOneAndUpdate(
                { workspaceId, name: regex },
                { $set: updates },
                { new: true }
            );

            if (!company) {
                return { success: false, error: `Company "${companyName}" not found` };
            }

            return {
                success: true,
                message: `Company "${company.name}" updated`,
            };
        }

        case "delete_company": {
            const { companyName } = args;

            const regex = createSafeRegex(companyName);

            // Check for contacts at this company
            const company = await Company.findOne({ workspaceId, name: regex });
            if (!company) {
                return { success: false, error: `Company "${companyName}" not found` };
            }

            const contactCount = await Contact.countDocuments({ workspaceId, companyId: company._id });
            if (contactCount > 0) {
                return { success: false, error: `Cannot delete company with ${contactCount} contacts. Remove contacts first.` };
            }

            await Company.findByIdAndDelete(company._id);

            return {
                success: true,
                message: `Company "${company.name}" deleted 🗑️`,
            };
        }

        case "bulk_delete_companies": {
            const { industry, status, olderThanDays, withoutContacts } = args;

            // Build filter
            const filter: any = { workspaceId };
            if (industry) filter.industry = createSafeRegex(industry);
            if (status) filter.status = status;
            if (olderThanDays) {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
                filter.createdAt = { $lt: cutoffDate };
            }

            // Safety: require at least one filter
            if (!industry && !status && !olderThanDays && !withoutContacts) {
                return { success: false, error: "Please specify industry, status, olderThanDays, or withoutContacts" };
            }

            // If withoutContacts, only delete companies with no contacts
            let companiesToDelete;
            if (withoutContacts) {
                const companies = await Company.find(filter).select("_id").lean();
                const companyIds = [];
                for (const company of companies) {
                    const contactCount = await Contact.countDocuments({ companyId: company._id });
                    if (contactCount === 0) companyIds.push(company._id);
                }
                filter._id = { $in: companyIds };
            }

            const result = await Company.deleteMany(filter);

            return {
                success: true,
                message: `Deleted ${result.deletedCount} company(s) 🗑️`,
                deletedCount: result.deletedCount,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function companyAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🏢 Company Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are a CRM Company Agent. Manage company/account records.

IMPORTANT: Always respond with a JSON tool call. NEVER ask for more information - use sensible defaults.

Tools:
1. create_company - Args: { name, domain?, industry?, size? }
2. search_companies - Args: { query?, industry? }
3. get_company_contacts - Args: { companyName }
4. update_company - Args: { companyName, updates }
5. delete_company - Args: { companyName }
6. bulk_delete_companies - Bulk delete. Args: { industry?, status?, olderThanDays?, withoutContacts? }

Examples:
- "delete all tech companies" → {"tool": "bulk_delete_companies", "args": {"industry": "tech"}}
- "delete companies with no contacts" → {"tool": "bulk_delete_companies", "args": {"withoutContacts": true}}

Respond with ONLY JSON: {"tool": "...", "args": {...}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Company AI Response:", responseText);

        const toolCall = parseToolCall(responseText);

        if (toolCall) {
            const result = await executeCompanyTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = result.success ? result.message : `Sorry: ${result.error}`;

            if (toolCall.tool === "search_companies" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = "No companies found.";
                } else {
                    friendlyResponse = `Found ${result.count} company(s):\n${result.companies.map((c: any) => `• ${c.name}${c.industry ? ` (${c.industry})` : ""}`).join("\n")}`;
                }
            } else if (toolCall.tool === "get_company_contacts" && result.success) {
                if (result.count === 0) {
                    friendlyResponse = `No contacts found at ${result.company}`;
                } else {
                    friendlyResponse = `${result.count} contact(s) at ${result.company}:\n${result.contacts.map((c: any) => `• ${c.name}${c.title ? ` - ${c.title}` : ""}`).join("\n")}`;
                }
            }

            return {
                messages: [new AIMessage(friendlyResponse)],
                toolResults: { [toolCall.tool]: result },
                finalResponse: friendlyResponse,
            };
        }

        return {
            messages: [new AIMessage("I can help with companies! Try:\n• 'Delete Acme Corp'\n• 'Show all tech companies'\n• 'Who works at Google?'")],
            finalResponse: "I can help with companies!",
        };

    } catch (error: any) {
        console.error("❌ Company Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
