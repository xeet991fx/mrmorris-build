/**
 * Agent Builder Routes
 *
 * NOTE: This file is named agentBuilder.ts instead of agent.ts because
 * agent.ts already exists in the routes folder (legacy agent routes).
 * This file contains routes specific to the new Agent Builder feature (Epic 1).
 *
 * Routes:
 * - POST   /api/workspaces/:workspaceId/agents                   Create agent
 * - GET    /api/workspaces/:workspaceId/agents                   List agents
 * - GET    /api/workspaces/:workspaceId/agents/:agentId          Get agent
 * - PUT    /api/workspaces/:workspaceId/agents/:agentId          Update agent
 * - POST   /api/workspaces/:workspaceId/agents/:agentId/duplicate  Duplicate agent (Story 1.8)
 * - PATCH  /api/workspaces/:workspaceId/agents/:agentId/status   Update agent status (Story 1.9)
 * - DELETE /api/workspaces/:workspaceId/agents/:agentId          Delete agent (Story 1.10)
 * - POST   /api/workspaces/:workspaceId/agents/:agentId/test     Test agent in dry-run mode (Story 2.1)
 * - POST   /api/workspaces/:workspaceId/agents/:agentId/validate Validate agent instructions (Story 2.4)
 * - GET    /api/workspaces/:workspaceId/test-targets/contacts    Search contacts for test target selection (Story 2.2)
 * - GET    /api/workspaces/:workspaceId/test-targets/deals       Search deals for test target selection (Story 2.2)
 */
import express from 'express';
import { authenticate } from '../middleware/auth';
import { validateWorkspaceAccess } from '../middleware/workspace';
import { createAgent, listAgents, getAgent, updateAgent, duplicateAgent, updateAgentStatus, deleteAgent, testAgent, validateAgent } from '../controllers/agentController';
import { searchContacts, searchDeals } from '../controllers/testTargetController';
import { createAgentSchema, updateAgentSchema, duplicateAgentSchema, updateAgentStatusSchema, testAgentSchema } from '../validations/agentValidation';
import { Request, Response, NextFunction } from 'express';

const router = express.Router();

/**
 * Zod validation middleware
 */
const validate = (schema: any) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.errors?.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message
        })) || []
      });
    }
  };
};

/**
 * @route POST /api/workspaces/:workspaceId/agents
 * @desc Create a new agent in the Agent Builder
 * @access Private (requires authentication and workspace access)
 */
router.post(
  '/workspaces/:workspaceId/agents',
  authenticate,
  validateWorkspaceAccess,
  validate(createAgentSchema),
  createAgent
);

/**
 * @route GET /api/workspaces/:workspaceId/agents
 * @desc List all agents in a workspace
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/agents',
  authenticate,
  validateWorkspaceAccess,
  listAgents
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId
 * @desc Get a single agent by ID from Agent Builder
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId',
  authenticate,
  validateWorkspaceAccess,
  getAgent
);

/**
 * @route PUT /api/workspaces/:workspaceId/agents/:agentId
 * @desc Update an existing agent (Story 1.2: triggers, name, goal)
 * @access Private (requires authentication and workspace access)
 */
router.put(
  '/workspaces/:workspaceId/agents/:agentId',
  authenticate,
  validateWorkspaceAccess,
  validate(updateAgentSchema),
  updateAgent
);

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/duplicate
 * @desc Duplicate an existing agent with new name (Story 1.8)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/duplicate',
  authenticate,
  validateWorkspaceAccess,
  validate(duplicateAgentSchema),
  duplicateAgent
);

/**
 * @route PATCH /api/workspaces/:workspaceId/agents/:agentId/status
 * @desc Update agent status (Draft, Live, Paused) (Story 1.9)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.patch(
  '/workspaces/:workspaceId/agents/:agentId/status',
  authenticate,
  validateWorkspaceAccess,
  validate(updateAgentStatusSchema),
  updateAgentStatus
);

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId
 * @desc Delete an agent from the workspace
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.delete(
  '/workspaces/:workspaceId/agents/:agentId',
  authenticate,
  validateWorkspaceAccess,
  deleteAgent
);

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/test
 * @desc Run agent in Test Mode (dry-run simulation) (Story 2.1, 2.2)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/test',
  authenticate,
  validateWorkspaceAccess,
  validate(testAgentSchema),
  testAgent
);

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/validate
 * @desc Validate agent instructions for common errors (Story 2.4)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/validate',
  authenticate,
  validateWorkspaceAccess,
  validateAgent
);

/**
 * @route GET /api/workspaces/:workspaceId/test-targets/contacts
 * @desc Search contacts for test target selection (Story 2.2)
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/test-targets/contacts',
  authenticate,
  validateWorkspaceAccess,
  searchContacts
);

/**
 * @route GET /api/workspaces/:workspaceId/test-targets/deals
 * @desc Search deals (opportunities) for test target selection (Story 2.2)
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/test-targets/deals',
  authenticate,
  validateWorkspaceAccess,
  searchDeals
);

export default router;

