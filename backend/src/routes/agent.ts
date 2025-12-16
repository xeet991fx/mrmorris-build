import express, { Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { AgentService } from "../services/agent/AgentService";
import { ModelType } from "../services/agent/DeepAgentService";
import Project from "../models/Project";

const router = express.Router();

/**
 * POST /api/agent/chat
 * Main streaming chat endpoint with SSE
 */
router.post("/chat", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, context, conversationHistory } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!context || !context.workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const workspaceId = context.workspaceId;
    const userId = (req.user?._id as any).toString();
    const autonomousMode = context.autonomousMode !== false; // Default to true
    const modelName = context.selectedModel || context.model || "gemini-2.5-flash";

    // Validate model type
    const validModels: ModelType[] = ["gemini-2.5-flash", "gemini-2.5-pro"];
    const model: ModelType = validModels.includes(modelName as ModelType)
      ? (modelName as ModelType)
      : "gemini-2.5-flash";

    // Validate workspace access
    const workspace = await Project.findById(workspaceId);

    if (!workspace || workspace.userId.toString() !== userId) {
      return res.status(403).json({ error: "Access denied to workspace" });
    }

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Disable buffering in nginx

    // Create agent service with selected model
    const agentService = new AgentService(
      workspaceId,
      userId,
      autonomousMode,
      model
    );

    try {
      // Stream agent response with events
      await agentService.chat(
        message,
        conversationHistory || [],
        (chunk) => {
          // Send both the chunk and the event for rich frontend display
          const payload: any = {
            done: chunk.done,
          };

          if (chunk.chunk) {
            payload.chunk = chunk.chunk;
          }

          if (chunk.error) {
            payload.error = chunk.error;
          }

          if (chunk.event) {
            payload.event = chunk.event;
          }

          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      );

      // Send final done signal
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (agentError: any) {
      console.error("Agent execution error:", agentError);
      res.write(
        `data: ${JSON.stringify({
          error: agentError.message,
          done: true,
          event: {
            type: "error",
            data: { content: agentError.message },
          },
        })}\n\n`
      );
      res.end();
    }
  } catch (error: any) {
    console.error("Agent chat route error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || "Internal server error",
      });
    } else {
      res.write(
        `data: ${JSON.stringify({
          error: error.message || "Internal server error",
          done: true,
        })}\n\n`
      );
      res.end();
    }
  }
});

/**
 * POST /api/agent/chat-simple
 * Simple non-streaming endpoint for testing
 */
router.post(
  "/chat-simple",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { message, context, conversationHistory } = req.body;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      if (!context || !context.workspaceId) {
        return res.status(400).json({ error: "Workspace ID is required" });
      }

      const workspaceId = context.workspaceId;
      const userId = (req.user?._id as any).toString();
      const modelName = context.selectedModel || context.model || "gemini-2.5-flash";

      // Validate model type
      const validModels: ModelType[] = ["gemini-2.5-flash", "gemini-2.5-pro"];
      const model: ModelType = validModels.includes(modelName as ModelType)
        ? (modelName as ModelType)
        : "gemini-2.5-flash";

      // Validate workspace access
      const workspace = await Project.findById(workspaceId);

      if (!workspace || workspace.userId.toString() !== userId) {
        return res.status(403).json({ error: "Access denied to workspace" });
      }

      const agentService = new AgentService(workspaceId, userId, true, model);

      const response = await agentService.chatSimple(
        message,
        conversationHistory || []
      );

      res.json({
        response,
        model,
      });
    } catch (error: any) {
      console.error("Agent chat-simple route error:", error);
      res.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
);

export default router;
