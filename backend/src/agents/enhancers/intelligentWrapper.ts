/**
 * Universal Intelligent Agent Wrapper
 * 
 * Makes ANY agent smart by:
 * 1. Pre-extracting fields from natural language
 * 2. Handling agent failures gracefully
 * 3. Auto-fallback to Dynamic Agent
 * 
 * Usage: Wrap any agent node with this to make it intelligent
 */

import { AgentStateType } from "../state";
import { getProModel } from "../modelFactory";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { dynamicAgentNode } from "../workers/dynamicAgent";

/**
 * Enhance any agent with intelligent field extraction and fallback
 */
export function withIntelligentExtraction(
    agentNode: (state: AgentStateType) => Promise<Partial<AgentStateType>>,
    agentName: string
): (state: AgentStateType) => Promise<Partial<AgentStateType>> {

    return async (state: AgentStateType) => {
        console.log(`🧠 Intelligent Wrapper: Enhancing ${agentName}...`);

        try {
            const userRequest = state.messages[state.messages.length - 1].content as string;

            // PHASE 1: Pre-extract structured data from natural language
            const extractedData = await extractFieldsFromRequest(userRequest, agentName);
            console.log(`📝 Extracted fields for ${agentName}:`, extractedData);

            // PHASE 2: Enhance state with extracted data
            const enhancedState = {
                ...state,
                extractedFields: extractedData, // Add to state for agent to use
            };

            // PHASE 3: Try the specific agent
            const result = await agentNode(enhancedState);

            // PHASE 4: Check if agent failed or asked questions
            if (needsDynamicFallback(result)) {
                console.log(`⚠️  ${agentName} needs help, falling back to Dynamic Agent...`);
                return await dynamicAgentNode(state);
            }

            console.log(`✅ ${agentName} succeeded with intelligent extraction`);
            return result;

        } catch (error: any) {
            console.error(`❌ ${agentName} failed:`, error.message);
            console.log(`🔄 Auto-fallback to Dynamic Agent...`);

            // Auto-fallback to Dynamic Agent on ANY error
            return await dynamicAgentNode(state);
        }
    };
}

/**
 * Extract structured fields from any natural language request using AI
 */
async function extractFieldsFromRequest(
    request: string,
    agentType: string
): Promise<Record<string, any>> {

    const extractionPrompt = `Extract ALL mentioned fields from this request for a ${agentType} operation.

REQUEST: "${request}"

Extract ANY mentioned details:
- Names, titles, descriptions, content
- Numbers (prices, amounts, percentages, probabilities, counts)
- Dates, times, durations (relative like "tomorrow", "next week")
- Status, priority, category, type, stage
- Email, phone, address, website
- Tags, notes, links, sources
- Win rate, probability, confidence
- Contact names, company names
- ANY other specific details mentioned

Important:
- For priorities: extract as "low", "medium", or "high"
- For win rates/probabilities: extract as number 0-100
- For dates: convert relative dates to actual dates
- For names: extract full names
- Include ALL details, even if you're not sure they're relevant

Respond with ONLY a JSON object with extracted fields:`;

    try {
        const response = await getProModel().invoke([
            new SystemMessage(extractionPrompt),
            new HumanMessage(request),
        ]);

        const responseText = response.content as string;
        const jsonMatch = responseText.match(/\{[\s\S]*?\}/);

        if (jsonMatch) {
            const extracted = JSON.parse(jsonMatch[0]);

            // Normalize common fields
            return normalizeExtractedFields(extracted);
        }
    } catch (error) {
        console.warn("⚠️  Field extraction failed, continuing without pre-extraction");
    }

    return {};
}

/**
 * Normalize extracted fields to match common database schemas
 */
function normalizeExtractedFields(fields: Record<string, any>): Record<string, any> {
    const normalized: Record<string, any> = { ...fields };

    // Normalize priority
    if (normalized.priority) {
        const p = normalized.priority.toLowerCase();
        if (p.includes('high') || p.includes('urgent')) normalized.priority = 'high';
        else if (p.includes('medium') || p.includes('normal') || p.includes('mid')) normalized.priority = 'medium';
        else if (p.includes('low')) normalized.priority = 'low';
    }

    // Normalize probability/win rate
    if (normalized.winRate || normalized['win rate']) {
        normalized.probability = parseInt(normalized.winRate || normalized['win rate']);
    }
    if (normalized.probability && typeof normalized.probability === 'string') {
        normalized.probability = parseInt(normalized.probability);
    }

    // Convert relative dates
    if (normalized.dueDate || normalized['due date']) {
        const dateStr = normalized.dueDate || normalized['due date'];
        if (typeof dateStr === 'string') {
            normalized.dueDate = parseRelativeDate(dateStr);
        }
    }

    return normalized;
}

/**
 * Parse relative dates like "tomorrow", "next week"
 */
function parseRelativeDate(dateStr: string): Date | undefined {
    const lower = dateStr.toLowerCase();
    const now = new Date();

    if (lower.includes('tomorrow')) {
        now.setDate(now.getDate() + 1);
        return now;
    }
    if (lower.includes('next week')) {
        now.setDate(now.getDate() + 7);
        return now;
    }
    if (lower.includes('next month')) {
        now.setMonth(now.getMonth() + 1);
        return now;
    }

    // Try to parse as regular date
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return undefined;
}

/**
 * Detect if agent needs dynamic fallback
 */
function needsDynamicFallback(result: Partial<AgentStateType>): boolean {
    const response = result.finalResponse || "";

    // Agent is asking questions instead of acting
    if (response.includes("What is") ||
        response.includes("what is") ||
        response.includes("Please provide") ||
        response.includes("please provide") ||
        response.includes("I need") ||
        response.includes("Could you provide") ||
        response.toLowerCase().includes("need more information")) {
        return true;
    }

    // Check for question marks (agent asking questions)
    const questionCount = (response.match(/\?/g) || []).length;
    if (questionCount > 0 && !response.includes("✅")) {
        return true;
    }

    // Agent returned an error
    if (result.error && !result.finalResponse?.includes("✅")) {
        return true;
    }

    // Agent gave generic "I can help" without action
    if ((response.includes("I can help") || response.includes("I can do that")) &&
        !response.includes("✅") &&
        !response.includes("Created") &&
        !response.includes("Updated")) {
        return true;
    }

    return false;
}
