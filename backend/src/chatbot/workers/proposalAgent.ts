/**
 * Proposal Agent - Document Generation AI
 * 
 * Creates proposals, SOWs, and pricing documents.
 * Finds similar past deals for reference.
 * Uses Gemini 2.5 Pro for creative document generation.
 */

import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { parseToolCall } from "../utils/parseToolCall";
import { createSafeRegex } from "../utils/escapeRegex";
import Proposal from "../../models/Proposal";
import Opportunity from "../../models/Opportunity";
import Contact from "../../models/Contact";
import Company from "../../models/Company";
async function executeProposalTool(
    toolName: string,
    args: any,
    workspaceId: string,
    userId: string
): Promise<any> {
    switch (toolName) {
        case "create_proposal": {
            const { opportunityId, opportunityName, templateType = "standard" } = args;

            let opportunity;
            if (opportunityId) {
                opportunity = await Opportunity.findById(opportunityId)
                    .populate("contactId")
                    .populate("companyId");
            } else if (opportunityName) {
                const regex = createSafeRegex(opportunityName);
                opportunity = await Opportunity.findOne({ workspaceId, title: regex })
                    .populate("contactId")
                    .populate("companyId");
            }

            if (!opportunity) {
                return { success: false, error: "Opportunity not found. Please specify an opportunity name or ID." };
            }

            const contact = opportunity.contactId as any;
            const company = opportunity.companyId as any;

            // Find similar won deals for reference
            const similarDeals = await Opportunity.find({
                workspaceId,
                status: "won",
                _id: { $ne: opportunity._id },
                value: {
                    $gte: (opportunity.value || 0) * 0.5,
                    $lte: (opportunity.value || 0) * 2
                },
            }).limit(3).lean();

            // Generate proposal content
            const proposalPrompt = `Generate a professional sales proposal for:

**CLIENT:**
Company: ${company?.name || opportunity.companyId || "Not specified"}
Contact: ${contact ? `${contact.firstName} ${contact.lastName}` : "Not specified"}
Title: ${contact?.jobTitle || "Not specified"}

**OPPORTUNITY:**
Title: ${opportunity.title}
Value: $${(opportunity.value || 0).toLocaleString()}
Description: ${opportunity.description || "No description"}

**SIMILAR WON DEALS (for reference):**
${similarDeals.map((d: any) => `- ${d.title}: $${d.value?.toLocaleString()} - ${d.description || "N/A"}`).join("\n")}

Generate a ${templateType} proposal with these sections:

1. **Executive Summary** (2-3 paragraphs - capture attention, show understanding)
2. **Understanding of Requirements** (show you listened to their needs)
3. **Proposed Solution** (detailed approach and deliverables)
4. **Timeline** (realistic implementation timeline)
5. **Why Choose Us** (unique value propositions)
6. **Investment** (present the value, not just price)
7. **Next Steps** (clear call to action)

Be professional, persuasive, and specific. Use confident language.
Format each section clearly with headers.`;

            const proposalContent = await getProModel().invoke([new HumanMessage(proposalPrompt)]);

            // Create proposal record
            const proposal = await Proposal.create({
                workspaceId,
                userId,
                opportunityId: opportunity._id,
                title: `Proposal - ${opportunity.title}`,
                templateType,
                status: "draft",
                executiveSummary: "", // Will be extracted if needed
                proposedSolution: proposalContent.content as string,
                pricing: {
                    items: [{
                        name: opportunity.title,
                        description: opportunity.description || "",
                        quantity: 1,
                        unitPrice: opportunity.value || 0,
                        total: opportunity.value || 0,
                    }],
                    subtotal: opportunity.value || 0,
                    total: opportunity.value || 0,
                    currency: opportunity.currency || "USD",
                    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                },
                referenceDealIds: similarDeals.map((d: any) => d._id),
                version: 1,
            });

            return {
                success: true,
                proposalId: proposal._id.toString(),
                opportunityTitle: opportunity.title,
                clientCompany: company?.name || "Not specified",
                content: proposalContent.content,
            };
        }

        case "find_similar_deals": {
            const { opportunityId, industry, dealValue, companySize } = args;

            let searchCriteria: any = { workspaceId, status: "won" };

            if (opportunityId) {
                const opp = await Opportunity.findById(opportunityId);
                if (opp) {
                    searchCriteria.value = {
                        $gte: (opp.value || 0) * 0.5,
                        $lte: (opp.value || 0) * 2,
                    };
                }
            } else if (dealValue) {
                searchCriteria.value = {
                    $gte: dealValue * 0.5,
                    $lte: dealValue * 2,
                };
            }

            const similarDeals = await Opportunity.find(searchCriteria)
                .populate("companyId", "name industry")
                .sort({ actualCloseDate: -1 })
                .limit(10)
                .lean();

            return {
                success: true,
                count: similarDeals.length,
                deals: similarDeals.map((d: any) => ({
                    id: d._id.toString(),
                    title: d.title,
                    value: d.value,
                    company: d.companyId?.name,
                    industry: d.companyId?.industry,
                    closedAt: d.actualCloseDate,
                    description: d.description?.substring(0, 200),
                })),
            };
        }

        case "generate_pricing": {
            const { opportunityId, items, discount } = args;

            let opportunity;
            if (opportunityId) {
                opportunity = await Opportunity.findById(opportunityId);
            }

            let pricingItems = items || [];

            if (pricingItems.length === 0 && opportunity) {
                pricingItems = [{
                    name: opportunity.title,
                    quantity: 1,
                    unitPrice: opportunity.value || 0,
                }];
            }

            // Calculate totals
            const calculatedItems = pricingItems.map((item: any) => ({
                ...item,
                total: (item.quantity || 1) * (item.unitPrice || 0),
            }));

            const subtotal = calculatedItems.reduce((sum: number, item: any) => sum + item.total, 0);
            const discountAmount = discount ? subtotal * (discount / 100) : 0;
            const total = subtotal - discountAmount;

            // Generate pricing table
            const pricingPrompt = `Format this pricing information as a professional pricing table:

Items:
${calculatedItems.map((i: any) => `- ${i.name}: ${i.quantity} x $${i.unitPrice?.toLocaleString()} = $${i.total?.toLocaleString()}`).join("\n")}

Subtotal: $${subtotal.toLocaleString()}
${discount ? `Discount (${discount}%): -$${discountAmount.toLocaleString()}` : ""}
Total: $${total.toLocaleString()}

Create a professional presentation of this pricing with:
1. Clear item descriptions
2. Value justification for each line item
3. Summary of what's included
4. Payment terms suggestion`;

            const pricingContent = await getProModel().invoke([new HumanMessage(pricingPrompt)]);

            return {
                success: true,
                items: calculatedItems,
                subtotal,
                discount: discount || 0,
                discountAmount,
                total,
                formattedPricing: pricingContent.content,
            };
        }

        case "list_proposals": {
            const { status, opportunityId } = args;

            const filter: any = { workspaceId };
            if (status) filter.status = status;
            if (opportunityId) filter.opportunityId = opportunityId;

            const proposals = await Proposal.find(filter)
                .populate("opportunityId", "title value")
                .sort({ createdAt: -1 })
                .limit(20)
                .lean();

            return {
                success: true,
                count: proposals.length,
                proposals: proposals.map((p: any) => ({
                    id: p._id.toString(),
                    title: p.title,
                    opportunity: p.opportunityId?.title,
                    value: p.pricing?.total,
                    status: p.status,
                    createdAt: p.createdAt,
                    sentAt: p.sentAt,
                })),
            };
        }

        case "update_proposal": {
            const { proposalId, section, content } = args;

            const proposal = await Proposal.findById(proposalId);
            if (!proposal) {
                return { success: false, error: "Proposal not found" };
            }

            // Update the specified section
            const updateField: any = {};
            switch (section) {
                case "summary":
                case "executiveSummary":
                    updateField.executiveSummary = content;
                    break;
                case "solution":
                case "proposedSolution":
                    updateField.proposedSolution = content;
                    break;
                case "timeline":
                    updateField.timeline = content;
                    break;
                case "whyUs":
                    updateField.whyUs = content;
                    break;
                case "terms":
                    updateField.terms = content;
                    break;
                default:
                    return { success: false, error: `Unknown section: ${section}` };
            }

            updateField.version = (proposal.version || 1) + 1;

            await Proposal.findByIdAndUpdate(proposalId, updateField);

            return {
                success: true,
                message: `Updated ${section} section (now version ${updateField.version})`,
            };
        }

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

export async function proposalAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("📄 Proposal Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        const systemPrompt = `You are an AI Proposal Agent. Create professional sales documents.

Available tools:

1. create_proposal - Generate proposal draft from deal data
   Args: { opportunityId?: string, opportunityName?: string, templateType?: "standard" | "enterprise" | "startup" }
   Returns: Full proposal content

2. find_similar_deals - Find comparable past deals for reference
   Args: { opportunityId?: string, industry?: string, dealValue?: number }
   Returns: Similar won deals with details

3. generate_pricing - Create formatted pricing table
   Args: { opportunityId?: string, items?: [{name, quantity, unitPrice}], discount?: number }
   Returns: Formatted pricing with totals

4. list_proposals - List existing proposals
   Args: { status?: "draft" | "sent" | "accepted" | "declined", opportunityId?: string }
   Returns: List of proposals

5. update_proposal - Edit a proposal section
   Args: { proposalId: string, section: string, content: string }
   Returns: Update confirmation

Respond with JSON: {"tool": "...", "args": {...}}

Examples:
- "Create proposal for the TechCorp deal" → {"tool": "create_proposal", "args": {"opportunityName": "TechCorp"}}
- "Find similar deals to reference" → {"tool": "find_similar_deals", "args": {}}
- "Generate pricing for $50,000 deal" → {"tool": "generate_pricing", "args": {"items": [{"name": "Solution", "quantity": 1, "unitPrice": 50000}]}}`;

        const response = await getProModel().invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🤖 Proposal AI Response:", responseText);

        const toolCall = parseToolCall(responseText, "ProposalAgent");

        if (toolCall) {
            const result = await executeProposalTool(
                toolCall.tool,
                toolCall.args,
                state.workspaceId,
                state.userId
            );

            let friendlyResponse = "";

            if (!result.success) {
                friendlyResponse = `❌ ${result.error}`;
            } else if (toolCall.tool === "create_proposal") {
                friendlyResponse = `📄 **Proposal Created**

**Client:** ${result.clientCompany}
**Opportunity:** ${result.opportunityTitle}
**Proposal ID:** ${result.proposalId}

---

${result.content}`;
            } else if (toolCall.tool === "find_similar_deals") {
                if (result.count === 0) {
                    friendlyResponse = "No similar deals found in your history.";
                } else {
                    friendlyResponse = `📊 **${result.count} Similar Won Deals:**\n\n${result.deals.map((d: any) =>
                        `• **${d.title}** - $${d.value?.toLocaleString() || 0}\n  ${d.company || "Unknown company"}${d.industry ? ` (${d.industry})` : ""}\n  ${d.description || ""}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "generate_pricing") {
                friendlyResponse = `💰 **Pricing Summary**

| Item | Qty | Unit Price | Total |
|------|-----|------------|-------|
${result.items.map((i: any) => `| ${i.name} | ${i.quantity} | $${i.unitPrice?.toLocaleString()} | $${i.total?.toLocaleString()} |`).join("\n")}

**Subtotal:** $${result.subtotal?.toLocaleString()}
${result.discount > 0 ? `**Discount (${result.discount}%):** -$${result.discountAmount?.toLocaleString()}` : ""}
**Total:** $${result.total?.toLocaleString()}

---

${result.formattedPricing}`;
            } else if (toolCall.tool === "list_proposals") {
                if (result.count === 0) {
                    friendlyResponse = "No proposals found.";
                } else {
                    friendlyResponse = `📋 **${result.count} Proposal(s):**\n\n${result.proposals.map((p: any) =>
                        `• **${p.title}** (${p.status})\n  Value: $${p.value?.toLocaleString() || 0}${p.sentAt ? ` | Sent: ${new Date(p.sentAt).toLocaleDateString()}` : ""}`
                    ).join("\n\n")
                        }`;
                }
            } else if (toolCall.tool === "update_proposal") {
                friendlyResponse = `✅ ${result.message}`;
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
            messages: [new AIMessage("I can help create proposals! Try:\n• 'Create proposal for [deal name]'\n• 'Find similar deals for reference'\n• 'Generate pricing table'\n• 'Show my proposals'")],
            finalResponse: "I can help with proposal generation!",
        };

    } catch (error: any) {
        console.error("❌ Proposal Agent error:", error);
        return { error: error.message, finalResponse: "Error generating proposal. Try again." };
    }
}
