/**
 * ⚠️ LEGACY CODE - ARCHIVED 2026-02-04
 * This route is no longer active. See LEGACY_AGENT_BUILDER.md for details.
 * Route registration disabled in server.ts
 *
 * To restore: Uncomment route registration in server.ts and remove this notice
 */

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

/**
 * POST /api/workspaces/:workspaceId/copilot/generate-workflow
 *
 * Generate complete agent workflow from description
 * Story 4.2, Task 3.1
 *
 * @auth Required
 * @body { description: string, agentId?: string }
 * @response text/event-stream (SSE)
 */
router.post(
  '/:workspaceId/copilot/generate-workflow',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { description, agentId } = req.body;
      const userId = req.user!._id.toString();

      // Validate input
      if (!description || description.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Description is required.',
        });
      }

      if (description.length > 2000) {
        return res.status(400).json({
          success: false,
          error: 'Description too long. Maximum 2000 characters.',
        });
      }

      // Validate workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
        });
      }

      if (workspace.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Generate workflow
      await copilotService.generateWorkflow(workspaceId, description, res, agentId);

    } catch (error: any) {
      console.error('Generate workflow error:', error);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate workflow.',
        });
      }

      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/copilot/validate-instructions
 *
 * Validate generated instructions for missing resources
 * Story 4.2, Task 3.2
 *
 * @auth Required
 * @body { instructions: string }
 * @response { success: true, data: { isValid, warnings, suggestions } }
 */
router.post(
  '/:workspaceId/copilot/validate-instructions',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { instructions } = req.body;
      const userId = req.user!._id.toString();

      // Validate input
      if (!instructions || instructions.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Instructions are required.',
        });
      }

      // Validate workspace access
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found',
        });
      }

      if (workspace.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      // Validate instructions
      const validation = await copilotService.validateGeneratedInstructions(workspaceId, instructions);

      return res.json({
        success: true,
        data: validation,
      });

    } catch (error: any) {
      console.error('Validate instructions error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate instructions.',
      });
    }
  }
);

/**
 * POST /api/workspaces/:workspaceId/agents/:agentId/copilot/review
 *
 * Review agent instructions and suggest improvements
 * Story 4.4, Task 5: API route integration
 *
 * @auth Required
 * @body { instructions: string }
 * @response { success: true, data: { good, suggestions, optimizations, validationWarnings } }
 */
router.post(
  '/:workspaceId/agents/:agentId/copilot/review',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, agentId } = req.params;
      const { instructions } = req.body;
      const userId = req.user!._id.toString();

      // Validate input (Task 5.2)
      if (!instructions || instructions.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Instructions are required.',
        });
      }

      if (instructions.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Instructions too long. Maximum 10,000 characters.',
        });
      }

      // Validate workspace and agent access
      const isValid = await validateWorkspaceAndAgent(workspaceId, agentId, userId, res);
      if (!isValid) return;

      // Call AgentCopilotService.reviewInstructions() (Task 5.3)
      const result = await copilotService.reviewInstructions(workspaceId, agentId, instructions);

      // Return structured JSON response (Task 5.4, 5.5)
      return res.json({
        success: true,
        data: result,
      });

    } catch (error: any) {
      console.error('Review instructions error:', error);

      // Handle errors (Task 5.6)
      if (error.message === 'Agent not found') {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (error.message === 'Insufficient credits') {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits. Please purchase more credits to continue.',
        });
      }

      if (error.message.includes('timeout')) {
        return res.status(500).json({
          success: false,
          error: 'Review timeout. Please try with shorter instructions.',
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Failed to review instructions.',
      });
    }
  }
);

/**
 * Story 4.5: Analyze Failed Execution
 * POST /api/workspaces/:workspaceId/executions/:executionId/analyze
 * Analyze failed execution and provide actionable fixes
 */
router.post(
  '/:workspaceId/executions/:executionId/analyze',
  authenticate,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, executionId } = req.params;
      const userId = req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized - user not authenticated'
        });
      }

      // Task 6.2: Validate execution exists and belongs to workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: 'Workspace not found'
        });
      }

      if (workspace.userId.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - insufficient permissions'
        });
      }

      // Task 6.4: Call AgentCopilotService.analyzeFailedExecution()
      const analysis = await copilotService.analyzeFailedExecution(workspaceId, executionId);

      // Task 6.5: Return structured JSON response
      res.json({
        success: true,
        analysis
      });

    } catch (error: any) {
      console.error('[Error] Analyze failed execution route:', error);

      // Task 6.6: Handle errors
      if (error.message === 'Execution not found') {
        return res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
      }

      if (error.message === 'Can only analyze failed executions') {
        return res.status(400).json({
          success: false,
          error: 'Can only analyze failed executions'
        });
      }

      if (error.message === 'Insufficient credits') {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits for failure analysis'
        });
      }

      // 500 server error
      res.status(500).json({
        success: false,
        error: 'Failed to analyze execution failure'
      });
    }
  }
);

export default router;
