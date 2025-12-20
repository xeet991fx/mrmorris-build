/**
 * Company Worker Agent
 * 
 * Handles company/account management: create, search, update, get contacts.
 * Uses Google Vertex AI with Gemini 2.5 Pro.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import Company from "../../models/Company";
import Contact from "../../models/Contact";

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
                const regex = new RegExp(query, "i");
                filter.$or = [{ name: regex }, { domain: regex }];
            }
            if (industry) {
                filter.industry = new RegExp(industry, "i");
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

            const regex = new RegExp(companyName, "i");
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

            const regex = new RegExp(companyName, "i");
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

Available tools:

1. create_company - Create a new company
   Args: { name, domain?, industry?, size?, location? }

2. search_companies - Search companies
   Args: { query?, industry? }

3. get_company_contacts - Get contacts at a company
   Args: { companyName }

4. update_company - Update company info
   Args: { companyName, updates: { domain?, industry?, size?, location? } }

Respond with JSON: {"tool": "...", "args": {...}}`;

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
            messages: [new AIMessage("I can help with companies! Try:\n• 'Create company Acme Corp in tech industry'\n• 'Show all tech companies'\n• 'Who works at Google?'")],
            finalResponse: "I can help with companies!",
        };

    } catch (error: any) {
        console.error("❌ Company Agent error:", error);
        return { error: error.message, finalResponse: "Error. Try again." };
    }
}
