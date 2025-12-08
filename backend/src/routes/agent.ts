import express, { Request, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  generateStreamingResponse,
  generateResponse,
  parseActionFromResponse,
  AgentContext as GeminiContext,
  ChatMessage,
} from "../services/gemini";
import {
  agentOrchestrator,
  IntentAgent,
  PlannerAgent,
  WorkflowBuilderAgent,
  OnboardingAgent,
  LearningAgent,
  EnrichmentAgent,
  EmailAgent,
  PipelineAgent,
  IntegrationAgent,
  WorkflowRunnerAgent,
  InsightsAgent,
  memoryStore,
  eventBus,
  AgentContext,
} from "../services/agents";
import AgentConfig from "../models/AgentConfig";

const router = express.Router();

// ============================================
// AGENT SYSTEM INITIALIZATION
// ============================================

let agentsInitialized = false;

async function initializeAgentSystem() {
  if (agentsInitialized) return;

  try {
    // Register all agents with the orchestrator
    agentOrchestrator.registerAgent(new IntentAgent());
    agentOrchestrator.registerAgent(new PlannerAgent());
    agentOrchestrator.registerAgent(new WorkflowBuilderAgent());
    agentOrchestrator.registerAgent(new OnboardingAgent());
    agentOrchestrator.registerAgent(new LearningAgent());
    agentOrchestrator.registerAgent(new EnrichmentAgent());
    agentOrchestrator.registerAgent(new EmailAgent());
    agentOrchestrator.registerAgent(new PipelineAgent());
    agentOrchestrator.registerAgent(new IntegrationAgent());
    agentOrchestrator.registerAgent(new WorkflowRunnerAgent());
    agentOrchestrator.registerAgent(new InsightsAgent());

    await agentOrchestrator.start();
    agentsInitialized = true;
    console.log("[Agent System] ✅ All 11 agents initialized and ready");
  } catch (error) {
    console.error("[Agent System] Failed to initialize:", error);
  }
}

// Initialize on first request
router.use(async (req, res, next) => {
  await initializeAgentSystem();
  next();
});

// ============================================
// LEGACY CHAT ENDPOINT (ENHANCED)
// ============================================

/**
 * POST /api/agent/chat
 * Send a message to the AI agent and get a streaming response
 * Now enhanced with multi-agent intent detection
 */
router.post("/chat", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { message, context, conversationHistory, streaming = true, useMultiAgent = false } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Validate context for Gemini
    const geminiContext: GeminiContext = {
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

    // Check if this should use the multi-agent system
    if (useMultiAgent && context?.workspaceId) {
      return handleMultiAgentChat(req, res, message, context);
    }

    // Legacy streaming response (default)
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
          geminiContext,
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
        const response = await generateResponse(message, geminiContext, history);
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
 * Handle multi-agent chat processing
 */
async function handleMultiAgentChat(
  req: AuthRequest,
  res: Response,
  message: string,
  context: any
) {
  try {
    const agentContext: AgentContext = {
      workspaceId: context.workspaceId,
      userId: req.user?._id?.toString() || "",
      sessionId: `session-${Date.now()}`,
      currentPage: context.currentPage,
      selectedItems: context.selectedItems,
    };

    // Process through agent orchestrator
    const result = await agentOrchestrator.processUserMessage(message, agentContext);

    res.json({
      success: result.success,
      response: result.data?.response || result.error,
      data: result.data,
      action: result.data?.action,
      requiresConfirmation: result.requiresConfirmation,
      confirmationMessage: result.confirmationMessage,
      agentUsed: result.data?.intent?.intent || "intent",
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Multi-agent processing failed",
    });
  }
}

// ============================================
// LEGACY EXECUTE ENDPOINT (ENHANCED)
// ============================================

/**
 * POST /api/agent/execute
 * Execute an action suggested by the AI
 * Now can route to appropriate agent
 */
router.post("/execute", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { action, params, workspaceId, useAgent } = req.body;

    if (!action || !workspaceId) {
      return res.status(400).json({ error: "Action and workspaceId are required" });
    }

    console.log("🤖 Executing AI action:", action, "with params:", params);

    // Route to agent if requested
    if (useAgent) {
      const agentContext: AgentContext = {
        workspaceId,
        userId: req.user?._id?.toString() || "",
        sessionId: `exec-${Date.now()}`,
      };

      // Map action to agent type
      const agentType = mapActionToAgent(action);
      if (agentType) {
        const result = await agentOrchestrator.executeTask(
          agentType as any,
          `${agentType}:task`,
          { action, ...params },
          agentContext
        );
        return res.json(result);
      }
    }

    // Legacy response - frontend handles execution
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
 * Map frontend action types to agent types
 */
function mapActionToAgent(action: string): string | null {
  const mapping: Record<string, string> = {
    // Contact actions -> no agent (frontend handles)
    // Company actions -> no agent (frontend handles)
    // Email actions
    send_email: "email",
    send_bulk_email: "email",
    // Enrichment actions
    enrich_contact: "enrichment",
    enrich_company: "enrichment",
    bulk_enrich: "enrichment",
    // Pipeline actions
    create_pipeline: "pipeline",
    update_pipeline: "pipeline",
    delete_pipeline: "pipeline",
    create_opportunity: "pipeline",
    move_opportunity: "pipeline",
    // Workflow actions
    create_workflow: "workflow_builder",
    execute_workflow: "workflow_runner",
  };
  return mapping[action] || null;
}

// ============================================
// LEGACY SUGGESTIONS ENDPOINT
// ============================================

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
        suggestions.push(`Enrich ${selectedCount} selected contact${parseInt(selectedCount as string) > 1 ? "s" : ""} with Apollo`);
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
    } else if (currentPage === "pipelines") {
      suggestions.push("Create a new pipeline");
      suggestions.push("Create a new deal");
      suggestions.push("View pipeline analytics");
    } else if (currentPage === "workflows") {
      suggestions.push("Create a workflow automation");
      suggestions.push("Set up lead nurturing sequence");
      suggestions.push("View workflow performance");
    } else {
      suggestions.push("Show workspace overview");
      suggestions.push("View recent activity");
      suggestions.push("Analyze CRM metrics");
      suggestions.push("Get AI insights");
    }

    res.json({ suggestions });
  } catch (error: any) {
    console.error("Suggestions error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate suggestions",
    });
  }
});

// ============================================
// NEW MULTI-AGENT ENDPOINTS
// ============================================

/**
 * GET /api/agent/status
 * Get agent system status
 */
router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const status = agentOrchestrator.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent/config
 * Get agent configurations for workspace
 */
router.get("/config", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const configs = await AgentConfig.find({ workspaceId });

    if (configs.length === 0) {
      const defaultAgents = agentOrchestrator.getRegisteredAgents();
      return res.json({
        agents: defaultAgents.map(type => ({
          type,
          enabled: true,
          settings: {},
        })),
      });
    }

    res.json({ agents: configs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/agent/config/:agentType
 * Update agent configuration
 */
router.put("/config/:agentType", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { agentType } = req.params;
    const { workspaceId, enabled, settings } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const config = await (AgentConfig as any).getOrCreateConfig(workspaceId, agentType);

    if (enabled !== undefined) config.enabled = enabled;
    if (settings) config.settings = { ...config.settings, ...settings };

    await config.save();

    agentOrchestrator.setAgentEnabled(agentType as any, config.enabled);

    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/confirm
 * Confirm a pending action
 */
router.post("/confirm", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { actionId, approved, workspaceId } = req.body;

    if (!actionId) {
      return res.status(400).json({ error: "Action ID is required" });
    }

    const plan = memoryStore.getPlan(workspaceId, actionId);

    if (!plan) {
      return res.status(404).json({ error: "Pending action not found" });
    }

    if (approved) {
      memoryStore.updatePlanStatus(workspaceId, actionId, "executing");
    } else {
      memoryStore.updatePlanStatus(workspaceId, actionId, "failed");
    }

    res.json({
      success: true,
      approved,
      message: approved ? "Action confirmed and executing" : "Action cancelled",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent/insights
 * Get AI insights for workspace
 */
router.get("/insights", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, type = "daily_report" } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const result = await agentOrchestrator.executeTask(
      "insights",
      "insights:task",
      { action: type },
      {
        workspaceId: workspaceId as string,
        userId: req.user?._id?.toString() || "",
        sessionId: `insights-${Date.now()}`,
      }
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/agent/onboarding
 * Handle onboarding flow
 */
router.post("/onboarding", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, action = "start", answer } = req.body;

    if (!workspaceId) {
      return res.status(400).json({ error: "Workspace ID is required" });
    }

    const result = await agentOrchestrator.executeTask(
      "onboarding",
      "onboarding:task",
      { action, message: answer },
      {
        workspaceId,
        userId: req.user?._id?.toString() || "",
        sessionId: `onboard-${Date.now()}`,
      }
    );

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/agent/history
 * Get recent agent events
 */
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { workspaceId, type, limit } = req.query;

    const events = eventBus.getRecentEvents({
      type: type as any,
      workspaceId: workspaceId as string,
      limit: parseInt(limit as string) || 50,
    });

    res.json({ events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

