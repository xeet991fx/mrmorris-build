/**
 * Agent API Routes
 * 
 * Provides the chat endpoint for the LangGraph multi-agent CRM system.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import { agentChatLimiter, agentStatusLimiter } from "../middleware/rateLimiter";
import Project from "../models/Project";
import { invokeAgent } from "../agents";

const router = Router();

/**
 * Validate workspace access
 */
async function validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
    res: Response
): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);

    if (!workspace) {
        res.status(404).json({
            success: false,
            error: "Workspace not found",
        });
        return false;
    }

    if (workspace.userId.toString() !== userId) {
        res.status(403).json({
            success: false,
            error: "You do not have access to this workspace",
        });
        return false;
    }

    return true;
}

/**
 * POST /api/workspaces/:workspaceId/agent/chat
 * 
 * Main chat endpoint for the AI agent system.
 * Accepts natural language requests and returns structured responses.
 */
router.post(
    "/:workspaceId/agent/chat",
    authenticate,
    agentChatLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            const { message } = req.body;

            // Validate inputs
            if (!message || typeof message !== "string") {
                return res.status(400).json({
                    success: false,
                    error: "Message is required",
                });
            }

            if (message.length > 2000) {
                return res.status(400).json({
                    success: false,
                    error: "Message too long. Maximum 2000 characters.",
                });
            }

            // Validate workspace access
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) {
                return;
            }

            console.log(`🤖 Agent chat request from user ${userId}`);

            // Create session ID from workspace + user for conversation memory
            const sessionId = `${workspaceId}-${userId}`;

            // Invoke the agent system with session
            const result = await invokeAgent(message, workspaceId, userId, sessionId);

            // Return structured response
            res.json({
                success: true,
                data: {
                    response: result.response,
                    needsInput: result.needsInput,
                    toolResults: result.toolResults,
                },
                ...(result.error && { warning: result.error }),
            });

        } catch (error: any) {
            console.error("Agent chat error:", error);

            // Determine appropriate status code and error details
            let statusCode = 500;
            let errorMessage = "Agent processing failed";
            let errorCode = "AGENT_ERROR";
            let details: any = {};

            if (error.message?.includes('timeout')) {
                statusCode = 504;
                errorCode = "TIMEOUT";
                errorMessage = "Request timeout - the agent took too long to respond";
                details.suggestion = "Try a simpler request or break it into smaller tasks";
            } else if (error.message?.includes('rate limit')) {
                statusCode = 429;
                errorCode = "RATE_LIMIT";
                errorMessage = "Too many requests - please slow down";
            } else if (error.message?.includes('authentication')) {
                statusCode = 401;
                errorCode = "AUTH_ERROR";
                errorMessage = "Authentication failed";
            } else {
                errorMessage = error.message || "Agent processing failed";
                details.errorType = error.name || "Error";
            }

            res.status(statusCode).json({
                success: false,
                error: errorMessage,
                code: errorCode,
                details,
                timestamp: new Date().toISOString(),
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/agent/status
 * 
 * Returns the status of the agent system.
 */
router.get(
    "/:workspaceId/agent/status",
    authenticate,
    agentStatusLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) {
                return;
            }

            res.json({
                success: true,
                data: {
                    status: "active",
                    model: "gemini-2.5-pro (Vertex AI)",
                    availableAgents: [
                        { name: "contact", description: "Contacts: create, search, update" },
                        { name: "email", description: "Emails: draft, templates" },
                        { name: "deal", description: "Deals: create, move stages, summary" },
                        { name: "workflow", description: "Workflows: create automations, enroll" },
                        { name: "task", description: "Tasks: create, complete, list overdue" },
                        { name: "company", description: "Companies: create, search, get contacts" },
                        { name: "campaign", description: "Campaigns: create, send, stats" },
                        { name: "pipeline", description: "Pipelines: create, stages, analytics" },
                        { name: "ticket", description: "Tickets: create, update, close" },
                        { name: "sequence", description: "Sequences: create, add steps, enroll" },
                        { name: "leadscore", description: "Lead scoring: hot leads, scores" },
                        { name: "reports", description: "Reports: sales, activity, dashboard" },
                    ],
                    examples: [
                        "Create a contact named John Smith",
                        "Create a task to follow up tomorrow",
                        "Show my hot leads",
                        "Create a welcome workflow",
                        "Show my dashboard",
                    ],
                },
            });
        } catch (error: any) {
            console.error("Agent status error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get agent status",
            });
        }
    }
);

export default router;
