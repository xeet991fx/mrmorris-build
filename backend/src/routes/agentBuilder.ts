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
 * - GET    /api/workspaces/:workspaceId/agents/:agentId/test/stream  Test agent with SSE streaming (Story 2.6)
 * - DELETE /api/workspaces/:workspaceId/agents/:agentId/test/:testRunId  Cancel test run (Story 2.6)
 * - POST   /api/workspaces/:workspaceId/agents/:agentId/validate Validate agent instructions (Story 2.4)
 * - GET    /api/workspaces/:workspaceId/test-targets/contacts    Search contacts for test target selection (Story 2.2)
 * - GET    /api/workspaces/:workspaceId/test-targets/deals       Search deals for test target selection (Story 2.2)
 * - GET    /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test  Compare test vs live (Story 2.7)
 * - GET    /api/workspaces/:workspaceId/agents/:agentId/accuracy  Get agent accuracy metrics (Story 2.7)
 * - POST   /api/workspaces/:workspaceId/agents/:agentId/execute   Execute agent live (Story 3.1)
 * - GET    /api/workspaces/:workspaceId/agents/:agentId/executions  List agent executions (Story 3.1)
 * - GET    /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId  Get execution (Story 3.1)
 * - DELETE /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId  Cancel execution (Story 3.1)
 */
import express from 'express';
import { authenticate } from '../middleware/auth';
import { validateWorkspaceAccess } from '../middleware/workspace';
import {
  createAgent,
  listAgents,
  getAgent,
  updateAgent,
  duplicateAgent,
  updateAgentStatus,
  deleteAgent,
  testAgent,
  validateAgent,
  testAgentStream,
  cancelAgentTest,
  compareExecutionToTest,
  getAgentAccuracy,
  executeAgent,
  listAgentExecutions,
  getAgentExecution,
  retryAgentExecution,
  cancelAgentExecution,
  triggerAgent,
  completeHandoff,
  exportAgentExecutions,
  exportAgentConfig
} from '../controllers/agentController';
import { searchContacts, searchDeals } from '../controllers/testTargetController';
import { getAgentDashboard, getAllAgentsDashboard } from '../controllers/dashboardController';
import { createAgentSchema, updateAgentSchema, duplicateAgentSchema, updateAgentStatusSchema, testAgentSchema, executeAgentSchema, triggerAgentSchema } from '../validations/agentValidation';
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

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/test/stream
 * @desc Run agent in Test Mode with SSE streaming (Story 2.6)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.6: Progressive Streaming
 * - AC2: Results stream as each step completes
 * - AC3: Progress messages and cancel option for long tests
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/test/stream',
  authenticate,
  validateWorkspaceAccess,
  testAgentStream
);

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId/test/:testRunId
 * @desc Cancel an in-progress test run (Story 2.6)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.6 AC3: Cancel option for long-running tests
 */
router.delete(
  '/workspaces/:workspaceId/agents/:agentId/test/:testRunId',
  authenticate,
  validateWorkspaceAccess,
  cancelAgentTest
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test
 * @desc Compare live execution to its linked test run (Story 2.7)
 * @access Private (requires authentication and workspace access)
 *
 * Story 2.7: Compare Test vs Live Results
 * - AC1: Side-by-side comparison view
 * - AC2: Email prediction accuracy
 * - AC3: Contact count accuracy
 * - AC4: Conditional logic consistency
 * - AC5: Mismatch detection and warning
 * - AC7: Stale data warning
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test',
  authenticate,
  validateWorkspaceAccess,
  compareExecutionToTest
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/accuracy
 * @desc Get agent test prediction accuracy metric (Story 2.7)
 * @access Private (requires authentication and workspace access)
 *
 * Story 2.7: Accuracy Metric Tracking
 * - AC6: Accuracy metric tracking (NFR36: 95% target)
 * - AC8: System alert for degraded accuracy (below 90%)
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/accuracy',
  authenticate,
  validateWorkspaceAccess,
  getAgentAccuracy
);

// =============================================================================
// Story 3.1: Live Agent Execution Routes
// =============================================================================

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/execute
 * @desc Execute an agent live (Story 3.1)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/execute',
  authenticate,
  validateWorkspaceAccess,
  validate(executeAgentSchema),
  executeAgent
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/dashboard-all
 * @desc Get dashboard metrics for all agents in workspace (Story 3.15 AC5)
 * @access Private (requires authentication and workspace access)
 *
 * Query params:
 * - dateRange: '7d' | '30d' | '90d' | 'all' (default: '30d')
 * - sortBy: 'name' | 'executions' | 'successRate' | 'lastRun' (default: 'name')
 * - sortOrder: 'asc' | 'desc' (default: 'asc')
 *
 * NOTE: This route MUST come before /:agentId routes to avoid collision
 */
router.get(
  '/workspaces/:workspaceId/agents/dashboard-all',
  authenticate,
  validateWorkspaceAccess,
  getAllAgentsDashboard
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/dashboard
 * @desc Get dashboard metrics for an agent (Story 3.15 AC1-3)
 * @access Private (requires authentication and workspace access)
 *
 * Query params:
 * - dateRange: '7d' | '30d' | '90d' | 'all' (default: '30d')
 *
 * NOTE: This route MUST come before /executions/:executionId to avoid route collision
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/dashboard',
  authenticate,
  validateWorkspaceAccess,
  getAgentDashboard
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/export-config
 * @desc Export agent configuration as JSON (Story 3.15 AC7)
 * @access Private (requires authentication and workspace access)
 *
 * NOTE: This route MUST come before other routes to avoid collision
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/export-config',
  authenticate,
  validateWorkspaceAccess,
  exportAgentConfig
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/export
 * @desc Export executions as JSON or CSV (Story 3.14 AC10)
 * @access Private (requires authentication and workspace access)
 *
 * NOTE: This route MUST come before /executions/:executionId to avoid route collision
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/executions/export',
  authenticate,
  validateWorkspaceAccess,
  exportAgentExecutions
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions
 * @desc List all executions for an agent (Story 3.1)
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/executions',
  authenticate,
  validateWorkspaceAccess,
  listAgentExecutions
);

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId
 * @desc Get a specific execution by ID (Story 3.1)
 * @access Private (requires authentication and workspace access)
 */
router.get(
  '/workspaces/:workspaceId/agents/:agentId/executions/:executionId',
  authenticate,
  validateWorkspaceAccess,
  getAgentExecution
);

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/retry
 * @desc Retry a failed execution with same trigger context (Story 3.14 AC9)
 * @access Private (requires authentication and workspace access)
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/executions/:executionId/retry',
  authenticate,
  validateWorkspaceAccess,
  retryAgentExecution
);

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId
 * @desc Cancel an in-progress execution (Story 3.1)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
router.delete(
  '/workspaces/:workspaceId/agents/:agentId/executions/:executionId',
  authenticate,
  validateWorkspaceAccess,
  cancelAgentExecution
);

// =============================================================================
// Story 3.2: Manual Trigger Execution Routes
// =============================================================================

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/trigger
 * @desc Manually trigger agent execution (Story 3.2)
 * @access Private (requires authentication, workspace access, Owner/Admin/Member role)
 *
 * Story 3.2: Manual Trigger Execution
 * - AC1: Immediate execution on "Run Now" button click
 * - AC2: Trigger configuration applied
 * - AC5: Duplicate execution prevention (409 Conflict if already running)
 * - AC6: RBAC - Members can trigger, Viewers cannot
 *
 * Key differences from /execute:
 * - Accepts Live OR Draft agents
 * - Members can trigger (not just Owner/Admin)
 * - Returns 409 if agent is already running
 * - Returns 202 Accepted with execution ID
 */
router.post(
  '/workspaces/:workspaceId/agents/:agentId/trigger',
  authenticate,
  validateWorkspaceAccess,
  validate(triggerAgentSchema),
  triggerAgent
);

// =============================================================================
// Story 3.12: Complete Handoff Route
// =============================================================================

/**
 * @route PUT /api/workspaces/:workspaceId/agents/executions/:executionId/complete-handoff
 * @desc Complete a human handoff, canceling the scheduled timeout resume (Story 3.12)
 * @access Private (requires authentication, workspace access)
 *
 * Story 3.12: Wait Action and Human Handoff
 * - AC7: Sales rep can click "Take Over" to mark handoff complete
 * - Cancels any scheduled handoff timeout resume job
 * - Updates execution status to 'completed'
 * - Logs completion in execution steps
 */
router.put(
  '/workspaces/:workspaceId/agents/executions/:executionId/complete-handoff',
  authenticate,
  validateWorkspaceAccess,
  completeHandoff
);

export default router;

