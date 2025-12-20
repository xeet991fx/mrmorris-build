/**
 * General Agent - Web Search & General Questions
 * 
 * Handles general questions and web searches using Tavily API.
 * This agent is invoked when user asks questions outside CRM functionality.
 */

import { ChatVertexAI } from "@langchain/google-vertexai";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentStateType } from "../state";

const generalModel = new ChatVertexAI({
    model: "gemini-2.5-pro",
    temperature: 0.7,
    authOptions: {
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
    },
    safetySettings: [
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    ],
});

// Fast model for quick decisions
const flashModel = new ChatVertexAI({
    model: "gemini-2.5-flash",
    temperature: 0,
    authOptions: {
        keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || "./vertex-key.json",
    },
});

/**
 * Use AI to determine if a query needs web search
 * Returns true if real-time/factual info is needed
 */
async function needsWebSearch(query: string): Promise<boolean> {
    try {
        const response = await flashModel.invoke([
            new SystemMessage(`Analyze this user query and decide if it needs a WEB SEARCH to answer properly.

Reply with ONLY "yes" or "no".

NEEDS WEB SEARCH (yes):
- Current events, news, recent happenings
- Real-time data (stock prices, weather, sports scores)
- Specific facts that might have changed (who is the CEO of X, current prices)
- Looking up specific products, codes, or items (game codes, product codes)
- Recent technology updates or releases

DOES NOT NEED WEB SEARCH (no):
- Questions about the AI assistant itself ("what can you do", "who are you")
- General knowledge that doesn't change (history, science concepts, math)
- Greetings and conversational messages ("hello", "thanks", "help")
- Creative requests (write a poem, tell a joke)
- Simple explanations or definitions
- Programming/coding help (how to write code)

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

        const response = await generalModel.invoke([
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
