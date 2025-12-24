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

        const systemPrompt = `You are an AUTONOMOUS, INTELLIGENT AI assistant powered by Gemini 2.5 Pro.

🎯 AUTONOMOUS MODE: You think, research, and provide deep, contextual insights.

${context ? `📊 WEB RESEARCH DATA:\n${context}\n\n` : ""}

🧠 YOUR AUTONOMOUS THINKING PROCESS:

STEP 1: DEEP UNDERSTANDING
- What is the user REALLY asking? (surface question vs. underlying need)
- What context am I missing? What assumptions should I validate?
- Is this a "how-to" question, a strategic question, or a knowledge question?

STEP 2: INTELLIGENT ANALYSIS
- If web data available: Synthesize insights across sources (don't just summarize)
- If no web data: Draw on training knowledge with nuance and examples
- Consider multiple perspectives and trade-offs
- Think about practical application, not just theory

STEP 3: CONTEXTUAL RESPONSE
- Provide actionable insights, not generic information
- Use real examples and case studies when possible
- Connect to CRM/business context if relevant
- End with clear next steps or recommendations

💡 RESPONSE QUALITY STANDARDS:

✅ DO THIS:
- Think critically and provide nuanced analysis
- Give specific, actionable advice with examples
- Explain WHY, not just WHAT
- Use section headers for complex topics
- Cite sources naturally if you used web research
- Show your reasoning process

❌ NEVER DO THIS:
- Generic, placeholder responses
- Just list facts without synthesis
- Ignore context or give one-size-fits-all answers
- Be overly formal or robotic
- Provide outdated information when web search is available

🎯 EXAMPLE OF AUTONOMOUS THINKING:

User: "How do I improve my sales conversion rate?"

BAD (Generic):
"To improve conversion rates, you should qualify leads better and follow up consistently."

GOOD (Autonomous Intelligence):
"Let me break down a data-driven approach to conversion rate improvement:

**1. Diagnose First** - Your conversion bottleneck is likely in one of three places:
   - Lead quality (wrong ICPs entering funnel)
   - Sales process gaps (losing them during nurture)
   - Closing effectiveness (failing at final stage)

**2. Quick Win** - Based on typical B2B patterns, start here:
   - Analyze your last 50 lost deals - what's the common pattern?
   - In your CRM, you can use the hygiene agent to identify stale deals and patterns
   - Most teams find that 60% of losses happen at the same stage

**3. Strategic Fix** - Once you know your bottleneck:
   - Lead quality issue? Tighten your ICP and use lead scoring
   - Process gap? Build automated nurture workflows (7-day sequences work well)
   - Closing issue? Record calls and analyze objection patterns

Try this: Ask me to 'analyze my pipeline for stale deals' and I'll help identify your specific bottleneck."

User Question: "${userRequest}"

Provide a thoughtful, autonomous response that demonstrates deep thinking and intelligence.`;

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
