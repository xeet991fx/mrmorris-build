import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agent, { RESTRICTIONS_DEFAULTS, MEMORY_DEFAULTS, APPROVAL_DEFAULTS } from '../models/Agent';
import { CreateAgentInput, UpdateAgentInput, DuplicateAgentInput } from '../validations/agentValidation';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import Project from '../models/Project';
import TestModeService from '../services/TestModeService';

/**
 * @route POST /api/workspaces/:workspaceId/agents
 * @desc Create a new agent in draft status
 * @access Private (requires authentication and workspace access)
 */
export const createAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const { name, goal } = req.body as CreateAgentInput;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Create agent with workspace isolation
    const agent = await Agent.create({
      workspace: workspaceId,
      name: name.trim(),
      goal,
      createdBy: userId,
      status: 'Draft' // Always create as Draft
    });

    res.status(201).json({
      success: true,
      agent: {
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Error creating agent:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map((err: any) => err.message)
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create agent'
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents
 * @desc List all agents in a workspace with filtering, sorting, search, and pagination
 * @access Private (requires authentication and workspace access)
 *
 * Story 1.11: Enhanced list endpoint with query parameters:
 * - status: Filter by 'Draft' | 'Live' | 'Paused'
 * - sortBy: 'name' | 'status' | 'createdAt' | 'lastExecutedAt' (default: createdAt)
 * - sortOrder: 'asc' | 'desc' (default: desc)
 * - search: Case-insensitive search in name and goal
 * - limit: Pagination limit (default: 50)
 * - offset: Pagination offset (default: 0)
 */
export const listAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const {
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      limit = 50,
      offset = 0
    } = req.query;

    // Build filter query with workspace isolation (AC8)
    const filter: Record<string, any> = { workspace: workspaceId };

    // Status filter (AC4)
    if (status && ['Draft', 'Live', 'Paused'].includes(status as string)) {
      filter.status = status;
    }

    // Search filter (AC5) - case-insensitive search in name and goal
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { goal: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Build sort object (AC3)
    const validSortFields = ['name', 'status', 'createdAt', 'lastExecutedAt'];
    const sortField = validSortFields.includes(sortBy as string)
      ? sortBy as string
      : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = { [sortField]: sortDirection };

    // Get total count for pagination (respects filters)
    const total = await Agent.countDocuments(filter);

    // Get status counts for filter UI (AC4) - always gets total counts for workspace
    const statusCounts = await Agent.aggregate([
      { $match: { workspace: new mongoose.Types.ObjectId(workspaceId as string) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusCountsMap = {
      all: 0,
      draft: 0,
      live: 0,
      paused: 0
    };

    statusCounts.forEach(({ _id, count }) => {
      statusCountsMap.all += count;
      if (_id === 'Draft') statusCountsMap.draft = count;
      if (_id === 'Live') statusCountsMap.live = count;
      if (_id === 'Paused') statusCountsMap.paused = count;
    });

    // Query with pagination
    const agents = await Agent.find(filter)
      .sort(sortOptions)
      .skip(Number(offset))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      agents: agents.map(agent => ({
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        // Story 1.11: Include lastExecutedAt (AC1)
        lastExecutedAt: agent.lastExecutedAt || null,
        // Story 1.5: Include memory in list response
        memory: agent.memory || MEMORY_DEFAULTS,
        // Story 1.6: Include approvalConfig in list response
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      })),
      // Story 1.11: Include meta with pagination and status counts
      meta: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        statusCounts: statusCountsMap
      }
    });
  } catch (error: any) {
    console.error('Error listing agents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list agents'
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId
 * @desc Get a single agent by ID
 * @access Private (requires authentication and workspace access)
 */
export const getAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;

    // Query with workspace filter for security
    const agent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        // Future fields (empty/null for now)
        triggers: agent.triggers || [],
        instructions: agent.instructions || null,
        parsedActions: agent.parsedActions || [],
        // Story 1.4: Restrictions
        restrictions: agent.restrictions || RESTRICTIONS_DEFAULTS,
        // Story 1.5: Memory
        memory: agent.memory || MEMORY_DEFAULTS,
        // Story 1.6: Approval configuration
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      }
    });
  } catch (error: any) {
    console.error('Error fetching agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch agent'
    });
  }
};

/**
 * @route PUT /api/workspaces/:workspaceId/agents/:agentId
 * @desc Update an existing agent
 * @access Private (requires authentication, workspace access, and Owner/Admin role)
 */
export const updateAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const updateData = req.body as UpdateAgentInput & { expectedUpdatedAt?: string };
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 1.7: RBAC Check - Must be Owner or Admin to edit agents
    // First check if user is workspace creator (has owner permissions without TeamMember record)
    const workspace = await Project.findById(workspaceId);
    const isWorkspaceCreator = workspace && workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      // If not workspace creator, check TeamMember record
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to edit agents"
        });
        return;
      }
    }

    // Find agent with workspace filter for security
    const agent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Story 1.7: Optimistic locking check
    if (updateData.expectedUpdatedAt) {
      const expectedDate = new Date(updateData.expectedUpdatedAt);
      const agentUpdatedAt = new Date(agent.updatedAt);

      // Story 1.7 Fix: Tighter timestamp comparison (100ms tolerance for network/serialization variance)
      if (Math.abs(agentUpdatedAt.getTime() - expectedDate.getTime()) > 100) {
        // Fetch user who made the change for conflict message
        let updatedByName = 'Unknown user';
        if (agent.updatedBy) {
          const lastUpdater = await User.findById(agent.updatedBy);
          if (lastUpdater) {
            updatedByName = lastUpdater.name || lastUpdater.email || 'Unknown user';
          }
        }

        res.status(409).json({
          success: false,
          error: 'Agent was modified by another user. Please reload to see latest version.',
          conflict: {
            updatedBy: updatedByName,
            updatedAt: agent.updatedAt
          }
        });
        return;
      }
    }

    // Update fields if provided
    if (updateData.name !== undefined) {
      agent.name = updateData.name.trim();
    }
    if (updateData.goal !== undefined) {
      agent.goal = updateData.goal;
    }

    // CRITICAL FIX: Sanitize existing triggers to ensure config field exists
    // This handles legacy data that may be missing the required config field
    if (agent.triggers && agent.triggers.length > 0) {
      agent.triggers = agent.triggers.map(trigger => ({
        ...trigger,
        config: trigger.config ?? {}  // Default to empty object if missing
      })) as any;
    }

    if (updateData.triggers !== undefined) {
      // Ensure all triggers have a config field (fixes Mongoose validation for legacy data)
      agent.triggers = updateData.triggers.map(trigger => ({
        ...trigger,
        config: trigger.config ?? {}  // Default to empty object if missing
      })) as any;
    }
    // Story 1.3: Instructions field update
    if (updateData.instructions !== undefined) {
      agent.instructions = updateData.instructions;
    }
    // Story 1.4: Restrictions field update - merge with defaults
    if (updateData.restrictions !== undefined) {
      agent.restrictions = {
        ...RESTRICTIONS_DEFAULTS,
        ...agent.restrictions,
        ...updateData.restrictions
      };
    }
    // Story 1.5: Memory field update - merge with defaults
    if (updateData.memory !== undefined) {
      agent.memory = {
        ...MEMORY_DEFAULTS,
        ...agent.memory,
        ...updateData.memory
      } as any;
    }
    // Story 1.6: ApprovalConfig field update - merge with defaults
    interface ApprovalConfigInput {
      enabled?: boolean;
      requireForAllActions?: boolean;
      requiredForActions?: string[];
      approvers?: string[];
    }
    const approvalConfigUpdate = (updateData as { approvalConfig?: ApprovalConfigInput }).approvalConfig;
    if (approvalConfigUpdate !== undefined) {
      // Validate approvers are real users (Story 1.6 AC4)
      if (approvalConfigUpdate.approvers && approvalConfigUpdate.approvers.length > 0) {
        const validUsers = await User.find({
          _id: { $in: approvalConfigUpdate.approvers }
        }).select('_id');
        const validUserIds = validUsers.map(u => u._id.toString());
        const invalidApprovers = approvalConfigUpdate.approvers.filter(
          (id) => !validUserIds.includes(id)
        );
        if (invalidApprovers.length > 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid approvers: Some user IDs do not exist'
          });
          return;
        }
      }
      agent.approvalConfig = {
        ...APPROVAL_DEFAULTS,
        ...agent.approvalConfig,
        ...approvalConfigUpdate
      } as any;
    }

    // Story 1.7: Track who made the update
    agent.updatedBy = userId;

    await agent.save();

    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        updatedBy: agent.updatedBy,  // Story 1.7: Include updatedBy in response
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        triggers: agent.triggers || [],
        instructions: agent.instructions || null,
        parsedActions: agent.parsedActions || [],
        // Story 1.4: Restrictions
        restrictions: agent.restrictions || RESTRICTIONS_DEFAULTS,
        // Story 1.5: Memory
        memory: agent.memory || MEMORY_DEFAULTS,
        // Story 1.6: Approval configuration
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      }
    });
  } catch (error: any) {
    console.error('Error updating agent:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map((err: any) => err.message)
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update agent'
    });
  }
};

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/duplicate
 * @desc Duplicate an existing agent with new name
 * @access Private (requires authentication, workspace access, and Owner/Admin role)
 */
export const duplicateAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const { name } = req.body as DuplicateAgentInput;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 1.8: RBAC Check - Must be Owner or Admin to duplicate agents
    // First check if workspace exists
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
      return;
    }

    // Check if user is workspace creator (has owner permissions without TeamMember record)
    const isWorkspaceCreator = workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      // If not workspace creator, check TeamMember record
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to duplicate agents"
        });
        return;
      }
    }

    // Find original agent with workspace filter for security
    const originalAgent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!originalAgent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Sanitize triggers to ensure config field exists (handles legacy data)
    const sanitizedTriggers = (originalAgent.triggers || []).map(trigger => ({
      ...trigger,
      config: trigger.config ?? {}  // Default to empty object if missing
    }));

    // Create duplicated agent with copied configuration
    const duplicatedAgent = await Agent.create({
      workspace: workspaceId,
      name: name.trim(),
      goal: originalAgent.goal,
      status: 'Draft',  // Always Draft regardless of original status
      createdBy: userId,
      // Copy configuration fields (sanitized)
      triggers: sanitizedTriggers,
      instructions: originalAgent.instructions || null,
      restrictions: originalAgent.restrictions || RESTRICTIONS_DEFAULTS,
      // Copy memory CONFIG but not actual data values (clean slate)
      memory: {
        enabled: originalAgent.memory?.enabled ?? false,
        variables: originalAgent.memory?.variables || [],
        retentionDays: originalAgent.memory?.retentionDays ?? 30
      },
      approvalConfig: originalAgent.approvalConfig || APPROVAL_DEFAULTS
      // NOT copied: execution history (doesn't exist on Agent model)
      // NOT copied: memory data values (would be in separate collection)
    });

    res.status(201).json({
      success: true,
      agent: {
        _id: duplicatedAgent._id,
        workspace: duplicatedAgent.workspace,
        name: duplicatedAgent.name,
        goal: duplicatedAgent.goal,
        status: duplicatedAgent.status,
        createdBy: duplicatedAgent.createdBy,
        createdAt: duplicatedAgent.createdAt,
        updatedAt: duplicatedAgent.updatedAt,
        triggers: duplicatedAgent.triggers || [],
        instructions: duplicatedAgent.instructions || null,
        restrictions: duplicatedAgent.restrictions || RESTRICTIONS_DEFAULTS,
        memory: duplicatedAgent.memory || MEMORY_DEFAULTS,
        approvalConfig: duplicatedAgent.approvalConfig || APPROVAL_DEFAULTS
      }
    });
  } catch (error: any) {
    console.error('Error duplicating agent:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: Object.values(error.errors).map((err: any) => err.message)
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to duplicate agent'
    });
  }
};

/**
 * @route PATCH /api/workspaces/:workspaceId/agents/:agentId/status
 * @desc Update agent status (Draft, Live, Paused)
 * @access Private (requires authentication, workspace access, and Owner/Admin role)
 */
export const updateAgentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const { status } = req.body;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 1.9: RBAC Check - Must be Owner or Admin to change agent status
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
      return;
    }

    const isWorkspaceCreator = workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to change agent status"
        });
        return;
      }
    }

    // Find agent with workspace filter for security
    const agent = await Agent.findOne({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Validate status transition
    const currentStatus = agent.status;
    const validationErrors: { field: string; message: string }[] = [];

    // Story 1.9: Block Draft → Paused transition (must go Live first)
    if (status === 'Paused' && currentStatus === 'Draft') {
      res.status(400).json({
        success: false,
        error: 'Cannot pause a Draft agent. Publish to Live first.'
      });
      return;
    }

    // Validation for transitioning TO Live status
    if (status === 'Live' && currentStatus !== 'Live') {
      // Check required fields
      if (!agent.name || agent.name.trim() === '') {
        validationErrors.push({ field: 'name', message: 'Agent name is required to go Live' });
      }
      if (!agent.goal || agent.goal.trim() === '') {
        validationErrors.push({ field: 'goal', message: 'Agent goal is required to go Live' });
      }
      if (!agent.triggers || agent.triggers.length === 0) {
        validationErrors.push({ field: 'triggers', message: 'At least one trigger is required to go Live' });
      }
      if (!agent.instructions || agent.instructions.trim() === '') {
        validationErrors.push({ field: 'instructions', message: 'Instructions are required to go Live' });
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Cannot activate agent: Missing required fields',
          validationErrors
        });
        return;
      }
    }

    // Update agent status
    agent.status = status;
    agent.updatedBy = userId;
    await agent.save();

    res.status(200).json({
      success: true,
      agent: {
        _id: agent._id,
        workspace: agent.workspace,
        name: agent.name,
        goal: agent.goal,
        status: agent.status,
        createdBy: agent.createdBy,
        updatedBy: agent.updatedBy,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        triggers: agent.triggers || [],
        instructions: agent.instructions || null,
        restrictions: agent.restrictions || RESTRICTIONS_DEFAULTS,
        memory: agent.memory || MEMORY_DEFAULTS,
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      }
    });
  } catch (error: any) {
    console.error('Error updating agent status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update agent status'
    });
  }
};

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId
 * @desc Delete an agent from the workspace
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
export const deleteAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 1.10: RBAC Check - Must be Owner or Admin to delete agents
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
      return;
    }

    const isWorkspaceCreator = workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to delete agents"
        });
        return;
      }
    }

    // Find and delete agent with workspace filter for security
    const agent = await Agent.findOneAndDelete({
      _id: agentId,
      workspace: workspaceId
    });

    if (!agent) {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // TODO (Future Epic 3): Cancel scheduled BullMQ jobs for this agent
    // TODO (Future Epic 3): Mark execution logs with agentDeleted: true

    res.status(200).json({
      success: true,
      message: 'Agent deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete agent'
    });
  }
};

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/test
 * @desc Run agent in Test Mode (dry-run simulation) with optional target selection
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.1: Enable Test Mode
 * - AC2: Dry run execution without real actions
 * - AC3: Email action simulation with preview
 * - AC4: CRM update simulation with preview
 * - AC5: Error display at specific step
 *
 * Story 2.2: Select Test Target
 * - AC1: Test button initiates with selected target
 * - AC3: Variable resolution with real/simulated data
 * - AC7: Dry-run with real data, no execution
 */
export const testAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;
    // Story 2.2: Extract testTarget from request body
    const { testTarget } = req.body || {};

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 2.1: RBAC Check - Must be Owner or Admin to test agents (same as edit permissions)
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({
        success: false,
        error: 'Workspace not found'
      });
      return;
    }

    const isWorkspaceCreator = workspace.userId.toString() === userId.toString();

    if (!isWorkspaceCreator) {
      const teamMember = await TeamMember.findOne({
        workspaceId: workspaceId,
        userId: userId,
        status: 'active'
      });

      if (!teamMember || !['owner', 'admin'].includes(teamMember.role)) {
        res.status(403).json({
          success: false,
          error: "You don't have permission to test agents"
        });
        return;
      }
    }

    // Story 2.2: Execute test mode simulation with optional test target
    const result = await TestModeService.simulateExecution(agentId, workspaceId, testTarget);

    // Return 404 if agent not found
    if (!result.success && result.error === 'Agent not found') {
      res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
      return;
    }

    // Return test results
    res.status(200).json({
      success: result.success,
      steps: result.steps,
      totalEstimatedCredits: result.totalEstimatedCredits,
      totalEstimatedDuration: result.totalEstimatedDuration,
      warnings: result.warnings,
      ...(result.error && { error: result.error }),
      ...(result.failedAtStep && { failedAtStep: result.failedAtStep })
    });
  } catch (error: any) {
    console.error('Error testing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute test'
    });
  }
};

