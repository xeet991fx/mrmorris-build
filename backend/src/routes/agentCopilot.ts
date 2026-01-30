import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import AgentCopilotService from '../services/AgentCopilotService';
import Project from '../models/Project';
import Agent from '../models/Agent';

const router = express.Router();
const copilotService = new AgentCopilotService();

/**
 * Agent Copilot Routes
 *
 * Real-time AI chat interface for agent building with Server-Sent Events streaming.
 * Routes follow workspace pattern: /api/workspaces/:workspaceId/agents/:agentId/copilot
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

async function validateWorkspaceAndAgent(
  workspaceId: string,
  agentId: string,
  userId: string,
  res: Response
): Promise<boolean> {
  // Validate workspace access
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({
      success: false,
      error: 'Workspace not found',
    });
    return false;
  }

  if (workspace.userId.toString() !== userId) {
    res.status(403).json({
      success: false,
      error: 'Access denied - insufficient permissions',
    });
    return false;
  }

  // Validate agent exists and belongs to workspace
  const agent = await Agent.findOne({
    _id: agentId,
    workspace: workspaceId,
  });

  if (!agent) {
    res.status(404).json({
      success: false,
      error: 'Agent not found',
    });
    return false;
  }

  return true;
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /api/workspaces/:workspaceId/agents/:agentId/copilot/chat
 *
 * Send message and receive streaming response via Server-Sent Events
 *
 * @auth Required
 * @body { message: string }
 * @response text/event-stream (SSE)
 */
router.post(
  '/:workspaceId/agents/:agentId/copilot/chat',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, agentId } = req.params;
      const { message } = req.body;
      const userId = req.user!._id.toString();

      // Validate input
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Message is required.',
        });
      }

      if (message.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Message too long. Maximum 2000 characters.',
        });
      }

      // Validate workspace and agent access
      const isValid = await validateWorkspaceAndAgent(workspaceId, agentId, userId, res);
      if (!isValid) return;

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Get or create conversation
      const conversation = await copilotService.getOrCreateConversation(
        workspaceId,
        agentId,
        userId
      );

      // Stream response
      await copilotService.sendMessage(conversation._id.toString(), message, res);

    } catch (error: any) {
      console.error('Copilot chat error:', error);

      // If headers not sent yet, send JSON error
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Failed to process message.',
        });
      }

      // If streaming, send error via SSE
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
);

/**
 * GET /api/workspaces/:workspaceId/agents/:agentId/copilot/history
 *
 * Get conversation history (last 10 messages)
 *
 * @auth Required
 * @response { success: true, data: { messages: [...] } }
 */
router.get(
  '/:workspaceId/agents/:agentId/copilot/history',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, agentId } = req.params;
      const userId = req.user!._id.toString();

      // Validate workspace and agent access
      const isValid = await validateWorkspaceAndAgent(workspaceId, agentId, userId, res);
      if (!isValid) return;

      // Get or create conversation (will return existing or create new)
      const conversation = await copilotService.getOrCreateConversation(
        workspaceId,
        agentId,
        userId
      );

      // Get history
      const messages = await copilotService.getConversationHistory(conversation._id.toString());

      return res.json({
        success: true,
        data: {
          messages,
        },
      });

    } catch (error: any) {
      console.error('Get history error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to load conversation history.',
      });
    }
  }
);

/**
 * DELETE /api/workspaces/:workspaceId/agents/:agentId/copilot/clear
 *
 * Clear conversation history
 *
 * @auth Required
 * @response { success: true, message: 'Conversation cleared' }
 */
router.delete(
  '/:workspaceId/agents/:agentId/copilot/clear',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, agentId } = req.params;
      const userId = req.user!._id.toString();

      // Validate workspace and agent access
      const isValid = await validateWorkspaceAndAgent(workspaceId, agentId, userId, res);
      if (!isValid) return;

      // Get conversation
      const conversation = await copilotService.getOrCreateConversation(
        workspaceId,
        agentId,
        userId
      );

      // Clear conversation
      await copilotService.clearConversation(conversation._id.toString());

      return res.json({
        success: true,
        message: 'Conversation cleared',
      });

    } catch (error: any) {
      console.error('Clear conversation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to clear conversation.',
      });
    }
  }
);

export default router;
