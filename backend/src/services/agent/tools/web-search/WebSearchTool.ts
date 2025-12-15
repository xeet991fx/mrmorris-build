import { z } from "zod";
import { BaseCRMTool } from "../base/BaseTool";
import { TavilyClient } from "tavily";

export class WebSearchTool extends BaseCRMTool {
  private tavilyClient: TavilyClient | null = null;

  constructor(workspaceId: string, userId: string) {
    super(workspaceId, userId);

    if (!process.env.TAVILY_API_KEY) {
      console.warn("TAVILY_API_KEY not configured - web search will be limited");
    } else {
      this.tavilyClient = new TavilyClient({ apiKey: process.env.TAVILY_API_KEY });
      console.log("✅ Tavily web search initialized");
    }
  }

  get name() {
    return "web_search";
  }

  get description() {
    return `Search the web for information about companies, industries, competitors, or business practices. Use this to research the user's business domain, find integration options, or gather industry best practices. Returns up to 5 relevant search results.`;
  }

  get schema() {
    return z.object({
      query: z
        .string()
        .describe(
          "Search query about business, industry, integrations, or best practices"
        ),
      focus: z
        .enum(["company", "industry", "integrations", "best-practices"])
        .optional()
        .describe("Focus area for the search"),
    });
  }

  async execute(input: z.infer<typeof this.schema>) {
    try {
      if (!process.env.TAVILY_API_KEY || !this.tavilyClient) {
        return {
          success: false,
          error: "Web search not configured",
          message:
            "TAVILY_API_KEY environment variable is not set. Please configure it to enable web search capabilities.",
        };
      }

      console.log(`🔍 Searching web for: "${input.query}"`);

      // Execute Tavily search
      const response = await this.tavilyClient.search({
        query: input.query,
        search_depth: "basic",
        max_results: 5,
        include_answer: true,
      });

      // Format the results
      const formattedResults = response.results?.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content?.substring(0, 300) + "...",
      })) || [];

      console.log(`✅ Found ${formattedResults.length} results`);

      return {
        success: true,
        query: input.query,
        focus: input.focus,
        answer: response.answer || "No summarized answer available.",
        results: formattedResults,
        resultCount: formattedResults.length,
      };
    } catch (error: any) {
      console.error("Tavily search error:", error.message);
      return {
        success: false,
        error: error.message,
        message: "Web search failed. Please try again later.",
      };
    }
  }
}
