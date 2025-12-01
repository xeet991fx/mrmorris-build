import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  generateStreamingResponse,
  generateResponse,
  parseActionFromResponse,
  AgentContext,
  ChatMessage,
} from "../services/gemini";

const router = express.Router();

/**
 * POST /api/agent/chat
 * Send a message to the AI agent and get a streaming response
 */
router.post("/chat", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, context, conversationHistory, streaming = true } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Validate context
    const agentContext: AgentContext = {
      workspaceId: context?.workspaceId || null,
      workspaceName: context?.workspaceName || null,
      currentPage: context?.currentPage || "dashboard",
      selectedItems: {
        contacts: context?.selectedItems?.contacts || [],
        companies: context?.selectedItems?.companies || [],
      },
    };

    // Format conversation history
    const history: ChatMessage[] = conversationHistory || [];

    if (streaming) {
      // Set headers for SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      try {
        let fullResponse = "";

        // Stream the response
        for await (const chunk of generateStreamingResponse(
          message,
          agentContext,
          history
        )) {
          fullResponse += chunk;

          // Send chunk as SSE
          res.write(`data: ${JSON.stringify({ chunk, done: false })}\n\n`);
        }

        // Parse any actions from the response
        const action = parseActionFromResponse(fullResponse);

        // Send final message with action if present
        res.write(
          `data: ${JSON.stringify({
            chunk: "",
            done: true,
            action: action || undefined,
            fullResponse,
          })}\n\n`
        );

        res.end();
      } catch (error: any) {
        res.write(
          `data: ${JSON.stringify({
            error: error.message || "Failed to generate response",
          })}\n\n`
        );
        res.end();
      }
    } else {
      // Non-streaming response
      try {
        const response = await generateResponse(message, agentContext, history);
        const action = parseActionFromResponse(response);

        res.json({
          response,
          action: action || undefined,
        });
      } catch (error: any) {
        res.status(500).json({
          error: error.message || "Failed to generate response",
        });
      }
    }
  } catch (error: any) {
    console.error("Agent chat error:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * POST /api/agent/execute
 * Execute an action suggested by the AI
 */
router.post("/execute", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { action, params, workspaceId } = req.body;

    if (!action || !workspaceId) {
      return res.status(400).json({ error: "Action and workspaceId are required" });
    }

    console.log("🤖 Executing AI action:", action, "with params:", params);

    // Log the action execution
    res.json({
      success: true,
      message: `Action ${action} queued for execution`,
      result: {
        action,
        params,
        note: "Action execution is handled on the frontend using existing API clients",
      },
    });
  } catch (error: any) {
    console.error("Action execution error:", error);
    res.status(500).json({
      error: error.message || "Failed to execute action",
    });
  }
});

/**
 * GET /api/agent/suggestions
 * Get AI-powered suggestions based on context
 */
router.get("/suggestions", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, currentPage, selectedCount } = req.query;

    // Build context-aware suggestions
    const suggestions: string[] = [];

    if (currentPage === "contacts") {
      suggestions.push("Create a new contact");
      suggestions.push("Import contacts from CSV");
      if (selectedCount && parseInt(selectedCount as string) > 0) {
        suggestions.push(`Send email to ${selectedCount} selected contact${parseInt(selectedCount as string) > 1 ? "s" : ""}`);
        suggestions.push(`Export ${selectedCount} selected contact${parseInt(selectedCount as string) > 1 ? "s" : ""}`);
      } else {
        suggestions.push("Analyze contact trends");
        suggestions.push("Find duplicate contacts");
      }
    } else if (currentPage === "companies") {
      suggestions.push("Create a new company");
      suggestions.push("Import companies from CSV");
      if (selectedCount && parseInt(selectedCount as string) > 0) {
        suggestions.push(`Export ${selectedCount} selected ${parseInt(selectedCount as string) > 1 ? "companies" : "company"}`);
        suggestions.push(`Update ${selectedCount} selected ${parseInt(selectedCount as string) > 1 ? "companies" : "company"}`);
      } else {
        suggestions.push("Analyze company data");
        suggestions.push("Show top companies by revenue");
      }
    } else {
      suggestions.push("Show workspace overview");
      suggestions.push("View recent activity");
      suggestions.push("Analyze CRM metrics");
    }

    res.json({ suggestions });
  } catch (error: any) {
    console.error("Suggestions error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate suggestions",
    });
  }
});

export default router;
