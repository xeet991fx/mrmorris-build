/**
 * General Agent - Web Search & General Questions
 * 
 * Handles general questions and web searches using Tavily API.
 * This agent is invoked when user asks questions outside CRM functionality.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";

// Lazy-loaded models (initialized when first used, after credentials are set)
let _generalModel: ChatVertexAI | null = null;
let _flashModel: ChatVertexAI | null = null;

const getGeneralModel = () => {
    if (!_generalModel) {
        _generalModel = new ChatVertexAI({
            model: "gemini-2.5-pro",
            temperature: 0.7,
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
            safetySettings: [
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ],
        });
    }
    return _generalModel;
};

const getFlashModel = () => {
    if (!_flashModel) {
        _flashModel = new ChatVertexAI({
            model: "gemini-2.5-flash",
            temperature: 0,
            authOptions: {
                keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
            },
        });
    }
    return _flashModel;
};

/**
 * Use fast pattern matching to determine if a query needs web search
 * Returns true if real-time/factual info is needed
 */
async function needsWebSearch(query: string): Promise<boolean> {
    const lower = query.toLowerCase();

    // Fast pattern matching - queries that DON'T need web search
    const noSearchPatterns = [
        /what (can|do) you (do|help|offer)/i,
        /who (are|is) you/i,
        /how (does|do|can) (this|it|you)/i,
        /^(hi|hey|hello|thanks|thank you)/i,
        /explain|define|describe|tell me about/i,
        /how to (write|code|program)/i,
        /capabilities|features|functions/i,
    ];

    const obviouslyNoSearch = noSearchPatterns.some(pattern => pattern.test(query));
    if (obviouslyNoSearch) {
        console.log(`🤔 Web search needed? No (pattern match)`);
        return false;
    }

    // Fast pattern matching - queries that DO need web search
    const searchPatterns = [
        /\b(news|latest|recent|current|today|now|price|stock|weather)\b/i,
        /who is (the )?(ceo|president|founder)/i,
        /\b(2024|2025|2026)\b/, // Recent year mentions
        /what (happened|is happening)/i,
    ];

    const obviouslyNeedsSearch = searchPatterns.some(pattern => pattern.test(query));
    if (obviouslyNeedsSearch) {
        console.log(`🤔 Web search needed? Yes (pattern match)`);
        return true;
    }

    // Fallback: Use AI for ambiguous cases (fast Flash model)
    try {
        const response = await getFlashModel().invoke([
            new SystemMessage(`Does this query need web search? Reply ONLY "yes" or "no".

YES: Current events, real-time data, recent facts
NO: General knowledge, AI capabilities, greetings, coding help

Query: "${query}"`),
            new HumanMessage(query),
        ]);

        const answer = (response.content as string).toLowerCase().trim();
        const needsSearch = answer.includes("yes");
        console.log(`🤔 Web search needed? ${needsSearch ? "Yes" : "No"} (AI decision)`);
        return needsSearch;
    } catch (error) {
        console.error("Error deciding web search:", error);
        return false; // Default to no search on error
    }
}

/**
 * Search the web using Tavily API
 */
async function searchWeb(query: string): Promise<{ success: boolean; results: any[]; error?: string }> {
    const apiKey = process.env.TAVILY_API_KEY;

    if (!apiKey) {
        console.warn("⚠️ TAVILY_API_KEY not configured - using AI response only");
        return { success: false, results: [], error: "Web search not configured" };
    }

    try {
        const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                api_key: apiKey,
                query: query,
                search_depth: "basic",
                include_answer: true,
                include_raw_content: false,
                max_results: 5,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Tavily API error:", errorText);
            return { success: false, results: [], error: "Web search failed" };
        }

        const data = await response.json();

        return {
            success: true,
            results: (data as any).results || [],
        };
    } catch (error: any) {
        console.error("Tavily search error:", error);
        return { success: false, results: [], error: error.message };
    }
}

export async function generalAgentNode(
    state: AgentStateType
): Promise<Partial<AgentStateType>> {
    console.log("🌐 General Agent processing...");

    try {
        const lastMessage = state.messages[state.messages.length - 1];
        const userRequest = lastMessage.content as string;

        // Use AI to decide if web search is needed
        let searchResult: { success: boolean; results: any[]; error?: string } = { success: false, results: [], error: "Skipped" };

        const shouldSearch = await needsWebSearch(userRequest);
        if (shouldSearch) {
            console.log("🔍 Query needs web search, searching...");
            searchResult = await searchWeb(userRequest);
        } else {
            console.log("💬 AI decided: Gemini can answer directly, skipping web search");
        }

        let context = "";
        if (searchResult.success && searchResult.results && searchResult.results.length > 0) {
            context = `\n\nWeb Search Results:\n${searchResult.results.map((r: any, i: number) =>
                `${i + 1}. ${r.title}\n   ${r.content || r.snippet || ""}\n   Source: ${r.url}`
            ).join("\n\n")}`;
            console.log("✅ Web search returned", searchResult.results.length, "results");
        }

        const systemPrompt = `You are a helpful AI assistant integrated into a CRM platform (MrMorris).
While your primary focus is CRM tasks (contacts, deals, emails, workflows), you can also help with general questions.

${context ? `Use the following web search results to answer the user's question:${context}` : ""}

Guidelines:
- Be helpful and conversational
- If relevant, gently remind users about your CRM capabilities
- Provide concise, accurate answers
- If you used web search results, cite the sources briefly
- For complex topics, provide a summary with key points

User Question: "${userRequest}"

Provide a helpful, friendly response.`;

        // Use Flash for simple queries, Pro for complex ones with web search
        const useFlashModel = !searchResult.success && userRequest.split(' ').length <= 15;
        const model = useFlashModel ? getFlashModel() : getGeneralModel();

        if (useFlashModel) {
            console.log("⚡ Using Flash model for fast response");
        }

        const response = await model.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userRequest),
        ]);

        const responseText = response.content as string;
        console.log("🌐 General Agent response generated");

        // Add a subtle CRM hint at the end for non-CRM queries
        const crmHint = "\n\n---\n💡 *I can also help you with CRM tasks like managing contacts, creating deals, scheduling tasks, and more!*";

        const finalResponse = responseText + (searchResult.success ? "" : crmHint);

        return {
            messages: [new AIMessage(finalResponse)],
            finalResponse: finalResponse,
            toolResults: searchResult.success ? { web_search: searchResult.results } : undefined,
        };

    } catch (error: any) {
        console.error("❌ General Agent error:", error);
        return {
            error: error.message,
            finalResponse: "I encountered an issue processing your request. For CRM-related tasks, try asking about contacts, deals, tasks, or workflows!",
        };
    }
}
