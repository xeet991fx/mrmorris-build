import express, { Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { AgentService } from "../services/agent/AgentService";
import { ModelType } from "../services/agent/ModelFactory";
import Project from "../models/Project";

const router = express.Router();

// Map frontend model names to backend ModelType
function mapModelName(frontendModel: string): ModelType {
  if (frontendModel.startsWith('gemini')) return 'gemini';
  if (frontendModel.startsWith('gpt-4')) return 'gpt-4';
  if (frontendModel.startsWith('gpt-3.5')) return 'gpt-3.5';
  if (frontendModel.startsWith('claude')) return 'claude';
  return 'gemini'; // default
}

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
    const modelName = context.selectedModel || context.model || "gemini";
    const model: ModelType = mapModelName(modelName);

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
      // Stream agent response
      await agentService.chat(
        message,
        conversationHistory || [],
        (chunk) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
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

// Simple non-streaming endpoint for testing
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
      const model: ModelType = context.model || "gemini";

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
