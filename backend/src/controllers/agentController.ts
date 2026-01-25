import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Agent, { RESTRICTIONS_DEFAULTS, MEMORY_DEFAULTS, APPROVAL_DEFAULTS } from '../models/Agent';
import { CreateAgentInput, UpdateAgentInput, DuplicateAgentInput } from '../validations/agentValidation';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import Project from '../models/Project';
import TestModeService from '../services/TestModeService';
import InstructionValidationService from '../services/InstructionValidationService';
import ExecutionComparisonService from '../services/ExecutionComparisonService';
import AgentExecution from '../models/AgentExecution';
import AgentExecutionService from '../services/AgentExecutionService';

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

    // Story 3.3: Update schedule if triggers changed on a Live agent
    if (updateData.triggers !== undefined && agent.status === 'Live') {
      try {
        const { registerAgentSchedule, removeAgentSchedule } = await import('../jobs/agentScheduledJob');

        const scheduledTrigger = agent.triggers?.find(
          (t: any) => t.type === 'scheduled' && t.enabled !== false
        );

        if (scheduledTrigger?.config?.cron) {
          // Register/update schedule with new cron expression
          await registerAgentSchedule(
            agentId,
            workspaceId,
            scheduledTrigger.config.cron
          );
        } else {
          // No scheduled trigger anymore, remove any existing schedule
          await removeAgentSchedule(agentId);
        }
      } catch (scheduleError) {
        console.error('Failed to update agent schedule:', scheduleError);
        // Don't fail the request, just log
      }
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

    // Story 3.3: Handle schedule registration based on status change
    try {
      const { registerAgentSchedule, removeAgentSchedule } = await import('../jobs/agentScheduledJob');

      if (status === 'Live') {
        // Register schedule if scheduled trigger exists
        const scheduledTrigger = agent.triggers?.find(
          (t: any) => t.type === 'scheduled' && t.enabled !== false
        );
        if (scheduledTrigger?.config?.cron) {
          await registerAgentSchedule(
            agentId,
            workspaceId,
            scheduledTrigger.config.cron
          );
        }
      } else if (status === 'Paused' || status === 'Draft') {
        // Remove schedule when agent is paused or set to draft
        await removeAgentSchedule(agentId);

        // Story 3.12: Cancel all waiting execution resume jobs when agent is paused
        if (status === 'Paused') {
          try {
            const { Queue } = await import('bullmq');
            const { QUEUE_NAMES, defaultQueueOptions } = await import('../events/queue/queue.config');

            // Find all waiting executions for this agent
            const waitingExecutions = await AgentExecution.find({
              agent: new mongoose.Types.ObjectId(agentId),
              workspace: new mongoose.Types.ObjectId(workspaceId),
              status: 'waiting',
              resumeJobId: { $exists: true, $ne: null }
            }).select('_id executionId resumeJobId');

            if (waitingExecutions.length > 0) {
              const queue = new Queue(QUEUE_NAMES.AGENT_EXECUTION_RESUME, defaultQueueOptions);

              for (const execution of waitingExecutions) {
                if (execution.resumeJobId) {
                  try {
                    const job = await queue.getJob(execution.resumeJobId);
                    if (job) {
                      await job.remove();
                      console.log(`✅ Cancelled resume job for paused agent: ${execution.resumeJobId}`);
                    }
                  } catch (jobErr) {
                    console.warn(`Failed to cancel resume job ${execution.resumeJobId}:`, jobErr);
                  }
                }

                // Update execution status to cancelled
                await AgentExecution.findByIdAndUpdate(execution._id, {
                  status: 'cancelled',
                  completedAt: new Date(),
                  resumeJobId: null,
                  resumeAt: null,
                  $push: {
                    steps: {
                      stepNumber: 0,
                      action: 'agent_paused',
                      stepStatus: 'completed',
                      result: {
                        description: 'Execution cancelled: Agent paused manually',
                        success: false,
                        error: 'Agent paused by user'
                      },
                      executedAt: new Date(),
                      completedAt: new Date(),
                      durationMs: 0,
                      creditsUsed: 0
                    }
                  }
                });
              }

              console.log(`📛 Cancelled ${waitingExecutions.length} waiting executions for paused agent ${agentId}`);
            }
          } catch (cancelErr) {
            console.error('Failed to cancel waiting executions on agent pause:', cancelErr);
            // Don't fail the request, just log the error
          }
        }
      }
    } catch (scheduleError) {
      console.error('Failed to update agent schedule:', scheduleError);
      // Don't fail the request, just log the error
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

    // Story 3.3: Remove any scheduled jobs for this agent
    try {
      const { removeAgentSchedule } = await import('../jobs/agentScheduledJob');
      await removeAgentSchedule(agentId);
    } catch (scheduleError) {
      console.error('Failed to remove agent schedule on delete:', scheduleError);
      // Don't fail the request, agent is already deleted
    }

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

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/validate
 * @desc Validate agent instructions for common errors
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.4: Validate Instructions
 * - AC1: Manual validation trigger
 * - AC2: Missing template warning
 * - AC3: Undefined variable error
 * - AC4: Syntax error detection
 * - AC5: Integration availability check
 * - AC6: Rate limit estimation warning
 * - AC7: Success validation
 */
export const validateAgent = async (req: Request, res: Response): Promise<void> => {
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

    // RBAC Check - Must be Owner or Admin to validate agents
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
          error: "You don't have permission to validate agents"
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

    // Run validation
    const result = await InstructionValidationService.validateInstructions({
      workspaceId,
      agentId,
      instructions: agent.instructions || '',
      parsedActions: agent.parsedActions || [],
      triggerType: agent.triggers?.[0]?.type,
      restrictions: agent.restrictions
    });

    res.status(200).json({
      success: true,
      validation: result
    });
  } catch (error: any) {
    console.error('Error validating agent:', error);
    res.status(500).json({
      success: false,
      error: 'Validation failed'
    });
  }
};

// =============================================================================
// Story 2.6: Active Test Runs Registry (for cancellation support)
// =============================================================================

const activeTestRuns = new Map<string, AbortController>();

/**
 * Generate a unique test run ID
 */
function generateTestRunId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/test/stream
 * @desc Run agent in Test Mode with SSE streaming (Story 2.6)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.6: Progressive Streaming
 * - AC2: Results stream as each step completes
 * - AC3: Progress messages and cancel option for long tests
 * - AC7: Partial results on timeout
 */
export const testAgentStream = async (req: Request, res: Response): Promise<void> => {
  const { workspaceId, agentId } = req.params;
  const { targetIds, targetType } = req.query;
  const userId = (req as any).user?._id;

  if (!userId) {
    res.status(401).json({ success: false, error: 'User not authenticated' });
    return;
  }

  // RBAC Check
  const workspace = await Project.findById(workspaceId);
  if (!workspace) {
    res.status(404).json({ success: false, error: 'Workspace not found' });
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
      res.status(403).json({ success: false, error: "You don't have permission to test agents" });
      return;
    }
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Create abort controller for this test run
  const abortController = new AbortController();
  const testRunId = generateTestRunId();

  // Store for cancel endpoint
  activeTestRuns.set(testRunId, abortController);

  // Send test run ID
  res.write(`event: started\ndata: ${JSON.stringify({ testRunId })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    abortController.abort();
    activeTestRuns.delete(testRunId);
  });

  try {
    // Build test target from query params
    const testTarget = targetType && targetIds ? {
      type: targetType as string,
      id: typeof targetIds === 'string' ? targetIds.split(',')[0] : undefined,
    } : undefined;

    // Execute test with abort signal
    const result = await TestModeService.simulateExecution(
      agentId,
      workspaceId,
      testTarget,
      { signal: abortController.signal }
    );

    // Stream each step result
    for (let i = 0; i < result.steps.length; i++) {
      const step = result.steps[i];
      res.write(`event: step\ndata: ${JSON.stringify(step)}\n\n`);

      // Send progress update
      res.write(`event: progress\ndata: ${JSON.stringify({
        current: i + 1,
        total: result.steps.length,
        executionTimeMs: result.executionTimeMs
      })}\n\n`);
    }

    // Send final complete event
    res.write(`event: complete\ndata: ${JSON.stringify({
      success: result.success,
      timedOut: result.timedOut,
      totalEstimatedCredits: result.totalEstimatedCredits,
      totalEstimatedDuration: result.totalEstimatedDuration,
      executionTimeMs: result.executionTimeMs,
      warnings: result.warnings,
      estimates: result.estimates,
      error: result.error
    })}\n\n`);

  } catch (error: any) {
    console.error('Error in streaming test:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
  } finally {
    activeTestRuns.delete(testRunId);
    res.end();
  }
};

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId/test/:testRunId
 * @desc Cancel an in-progress test run (Story 2.6)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 2.6 AC3: Cancel option for long-running tests
 */
export const cancelAgentTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, testRunId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // RBAC Check
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
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
        res.status(403).json({ success: false, error: "You don't have permission to cancel tests" });
        return;
      }
    }

    // Find and abort the test run
    const controller = activeTestRuns.get(testRunId);

    if (controller) {
      controller.abort();
      activeTestRuns.delete(testRunId);
      res.json({ success: true, cancelled: true, testRunId });
    } else {
      res.status(404).json({
        success: false,
        error: 'Test run not found or already completed',
        testRunId
      });
    }
  } catch (error: any) {
    console.error('Error cancelling test:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel test'
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId/compare-to-test
 * @desc Compare live execution to its linked test run (Story 2.7)
 * @access Private (requires authentication, workspace access)
 *
 * Story 2.7: Compare Test vs Live Results
 * - AC1: Side-by-side comparison view
 * - AC2: Email prediction accuracy
 * - AC3: Contact count accuracy
 * - AC4: Conditional logic consistency
 * - AC5: Mismatch detection and warning
 * - AC7: Stale data warning
 */
export const compareExecutionToTest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId, executionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // RBAC check
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Find execution with workspace isolation
    const execution = await AgentExecution.findOne({
      executionId,
      agent: agentId,
      workspace: workspaceId,
    });

    if (!execution) {
      res.status(404).json({ success: false, error: 'Execution not found' });
      return;
    }

    if (!execution.linkedTestRunId) {
      res.status(400).json({
        success: false,
        error: 'No linked test run found for this execution',
      });
      return;
    }

    const comparison = await ExecutionComparisonService.compareTestToLive(
      execution.linkedTestRunId,
      executionId
    );

    // Store comparison result in execution record
    await ExecutionComparisonService.storeComparisonResult(executionId, comparison);

    res.json({ success: true, comparison });
  } catch (error: any) {
    console.error('Error comparing execution to test:', error);
    res.status(500).json({ success: false, error: 'Failed to compare execution' });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/accuracy
 * @desc Get agent test prediction accuracy metric (Story 2.7)
 * @access Private (requires authentication, workspace access)
 *
 * Story 2.7: Accuracy Metric Tracking
 * - AC6: Accuracy metric tracking (NFR36: 95% target)
 * - AC8: System alert for degraded accuracy (below 90%)
 */
export const getAgentAccuracy = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({ success: false, error: 'User not authenticated' });
      return;
    }

    // RBAC check
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const accuracy = await ExecutionComparisonService.calculateAgentAccuracy(
      agentId,
      workspaceId
    );

    res.json({
      success: true,
      accuracy,
    });
  } catch (error: any) {
    console.error('Error getting agent accuracy:', error);
    res.status(500).json({ success: false, error: 'Failed to get accuracy' });
  }
};

// =============================================================================
// Story 3.1: Live Agent Execution
// =============================================================================

/**
 * Active execution registry for cancellation support
 */
const activeExecutions = new Map<string, AbortController>();

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/execute
 * @desc Execute an agent live (Story 3.1)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 *
 * Story 3.1: Parse and Execute Instructions
 * - AC1: Instruction Parsing with Structured Output
 * - AC2: Variable Resolution
 * - AC4: Parsing Error Handling
 * - AC5: Execution Performance
 *
 * Request body:
 * {
 *   trigger: { type: 'manual' | 'scheduled' | 'event', eventDetails?: object },
 *   target?: { type: 'contact' | 'deal', id: string },
 *   testRunId?: string  // Optional: link to test run for comparison
 * }
 */
export const executeAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;
    const { trigger, target, testRunId } = req.body || {};

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Validate trigger
    if (!trigger || !trigger.type) {
      res.status(400).json({
        success: false,
        error: 'Trigger is required with type: manual, scheduled, or event'
      });
      return;
    }

    // RBAC Check - Must be Owner or Admin to execute agents
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
          error: "You don't have permission to execute agents"
        });
        return;
      }
    }

    // Check agent exists and is Live
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

    if (agent.status !== 'Live') {
      res.status(400).json({
        success: false,
        error: `Cannot execute agent in ${agent.status} status. Agent must be Live.`
      });
      return;
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();

    // Execute the agent
    const result = await AgentExecutionService.executeAgent(
      agentId,
      workspaceId,
      trigger,
      target,
      {
        testRunId,
        signal: abortController.signal,
      }
    );

    // Store controller if execution is ongoing (for async case in future)
    if (result.status === 'running') {
      activeExecutions.set(result.executionId, abortController);
    }

    res.status(result.success ? 200 : 400).json({
      success: result.success,
      executionId: result.executionId,
      status: result.status,
      steps: result.steps,
      summary: result.summary,
      ...(result.error && { error: result.error }),
      ...(result.failedAtStep && { failedAtStep: result.failedAtStep })
    });

  } catch (error: any) {
    console.error('Error executing agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute agent'
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions
 * @desc List executions for an agent (Story 3.1)
 * @access Private (requires authentication and workspace access)
 */
export const listAgentExecutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const { status, limit = '20', skip = '0' } = req.query;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const executions = await AgentExecutionService.listExecutions(
      agentId,
      workspaceId,
      {
        status: status as any,
        limit: parseInt(limit as string),
        skip: parseInt(skip as string),
      }
    );

    res.json({
      success: true,
      executions,
      count: executions.length
    });

  } catch (error: any) {
    console.error('Error listing executions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list executions'
    });
  }
};

/**
 * @route GET /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId
 * @desc Get a specific execution by ID (Story 3.1)
 * @access Private (requires authentication and workspace access)
 */
export const getAgentExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, executionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    const execution = await AgentExecutionService.getExecution(executionId, workspaceId);

    if (!execution) {
      res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
      return;
    }

    res.json({
      success: true,
      execution
    });

  } catch (error: any) {
    console.error('Error getting execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get execution'
    });
  }
};

/**
 * @route DELETE /api/workspaces/:workspaceId/agents/:agentId/executions/:executionId
 * @desc Cancel an in-progress execution (Story 3.1)
 * @access Private (requires authentication, workspace access, Owner/Admin role)
 */
export const cancelAgentExecution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, executionId } = req.params;
    const userId = (req as any).user?._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // RBAC Check
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
          error: "You don't have permission to cancel executions"
        });
        return;
      }
    }

    // Try to cancel via in-memory controller first
    const controller = activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      activeExecutions.delete(executionId);
    }

    // Also update database status
    const cancelled = await AgentExecutionService.cancelExecution(executionId, workspaceId);

    if (cancelled) {
      res.json({
        success: true,
        message: 'Execution cancelled',
        executionId
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Execution not found or already completed'
      });
    }

  } catch (error: any) {
    console.error('Error cancelling execution:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel execution'
    });
  }
};

// =============================================================================
// Story 3.2: Manual Trigger Execution
// =============================================================================

/**
 * @route POST /api/workspaces/:workspaceId/agents/:agentId/trigger
 * @desc Manually trigger agent execution (Story 3.2)
 * @access Private (requires authentication, workspace access, Owner/Admin/Member role)
 *
 * Story 3.2: Manual Trigger Execution
 * - AC1: Immediate execution on "Run Now"
 * - AC2: Trigger configuration applied
 * - AC5: Duplicate execution prevention
 * - AC6: RBAC for manual trigger (Members allowed, Viewers denied)
 *
 * Key differences from /execute:
 * - Accepts Live OR Draft agents (not just Live)
 * - RBAC: Members can trigger (not just Owner/Admin)
 * - Prevents duplicate executions (409 Conflict if already running)
 * - Returns execution ID immediately (async execution)
 */
export const triggerAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, agentId } = req.params;
    const userId = (req as any).user?._id;
    const { target, testRunId } = req.body || {};

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Story 3.2 AC6: RBAC Check - Members can trigger, Viewers cannot
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

      // Story 3.2 difference: Allow 'member' role (not just owner/admin)
      // Only deny 'viewer' role
      if (!teamMember || teamMember.role === 'viewer') {
        res.status(403).json({
          success: false,
          error: "You don't have permission to trigger agents. Viewer role cannot execute agents."
        });
        return;
      }
    }

    // Check agent exists
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

    // Story 3.2 AC1: Accept both Live AND Draft status (differs from /execute)
    if (agent.status !== 'Live' && agent.status !== 'Draft') {
      res.status(400).json({
        success: false,
        error: `Cannot trigger agent in ${agent.status} status. Agent must be Live or Draft.`
      });
      return;
    }

    // Story 3.2 AC5: Duplicate execution prevention - check for running execution
    const runningExecution = await AgentExecution.findOne({
      agent: new mongoose.Types.ObjectId(agentId),
      workspace: new mongoose.Types.ObjectId(workspaceId),
      status: { $in: ['pending', 'running'] }
    }).select('executionId startedAt status');

    if (runningExecution) {
      res.status(409).json({
        success: false,
        error: 'Agent is already running. Wait for current execution to complete.',
        currentExecutionId: runningExecution.executionId,
        startedAt: runningExecution.startedAt,
        status: runningExecution.status
      });
      return;
    }

    // Story 3.2 AC2: Apply manual trigger configuration if present
    const manualTrigger = agent.triggers?.find(t => t.type === 'manual');
    const triggerConfig = manualTrigger?.config || {};

    // Execute the agent with manual trigger type
    const result = await AgentExecutionService.executeAgent(
      agentId,
      workspaceId,
      {
        type: 'manual',
        eventDetails: triggerConfig
      },
      target,
      {
        testRunId,
      }
    );

    // Story 3.2 AC1: Return execution ID immediately
    res.status(202).json({
      success: true,
      message: 'Agent execution started',
      executionId: result.executionId,
      status: result.status,
      startedAt: new Date(),
      // Include summary if execution completed quickly (synchronous case)
      ...(result.status === 'completed' || result.status === 'failed' ? {
        result: {
          success: result.success,
          summary: result.summary,
          error: result.error
        }
      } : {})
    });

  } catch (error: any) {
    console.error('Error triggering agent:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger agent'
    });
  }
};

/**
 * Story 3.12: Complete Handoff Endpoint
 * @route PUT /api/workspaces/:workspaceId/agents/executions/:executionId/complete-handoff
 * @desc Mark a human handoff as complete, canceling the scheduled timeout resume
 * @access Private (requires authentication and workspace access)
 */
export const completeHandoff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId, executionId } = req.params;
    const userId = (req as any).user?._id;
    const { notes, outcomeType } = req.body || {};

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Find the execution
    const execution = await AgentExecution.findOne({
      executionId: executionId,
      workspace: new mongoose.Types.ObjectId(workspaceId)
    });

    if (!execution) {
      res.status(404).json({
        success: false,
        error: 'Execution not found'
      });
      return;
    }

    // Verify execution is in waiting state
    if (execution.status !== 'waiting') {
      res.status(400).json({
        success: false,
        error: `Cannot complete handoff: Execution is in '${execution.status}' state, not 'waiting'`
      });
      return;
    }

    // Cancel the scheduled resume job if it exists
    let jobCancelled = false;
    if (execution.resumeJobId) {
      try {
        // Import BullMQ Queue dynamically to avoid circular dependency
        const { Queue } = await import('bullmq');
        const { QUEUE_NAMES, defaultQueueOptions } = await import('../events/queue/queue.config');
        const queue = new Queue(QUEUE_NAMES.AGENT_EXECUTION_RESUME, defaultQueueOptions);

        const job = await queue.getJob(execution.resumeJobId);
        if (job) {
          await job.remove();
          jobCancelled = true;
          console.log(`✅ Cancelled handoff resume job: ${execution.resumeJobId}`);
        }
      } catch (cancelErr) {
        console.warn('Failed to cancel handoff resume job:', cancelErr);
        // Continue anyway - completing handoff is more important than canceling job
      }
    }

    // Get user info for logging
    const user = await User.findById(userId).select('name email');
    const completedBy = user?.name || user?.email || userId.toString();

    // Add completion step to execution
    const completionStep = {
      stepNumber: execution.steps.length + 1,
      stepIndex: execution.steps.length,
      action: 'handoff_completed',
      stepStatus: 'completed' as const,
      result: {
        description: `Handoff completed by ${completedBy}`,
        success: true,
        data: {
          completedBy,
          notes: notes || undefined,
          outcomeType: outcomeType || 'resolved',
          jobCancelled,
        },
      },
      executedAt: new Date(),
      completedAt: new Date(),
      durationMs: 0,
      creditsUsed: 0,
    };

    // Update execution status
    const completedAt = new Date();
    await AgentExecution.findByIdAndUpdate(execution._id, {
      status: 'completed',
      completedAt,
      resumeJobId: null,
      resumeAt: null,
      $push: { steps: completionStep },
      $inc: { 'summary.successfulSteps': 1, 'summary.totalSteps': 1 },
    });

    // Emit Socket.io notification for real-time UI update
    try {
      const { emitExecutionCompleted } = await import('../socket/agentExecutionSocket');
      emitExecutionCompleted(workspaceId, execution.agent.toString(), {
        executionId: execution.executionId,
        success: true,
        processedCount: execution.steps.length + 1,
        summary: {
          totalSteps: execution.totalSteps,
          successfulSteps: execution.summary.successfulSteps + 1,
          failedSteps: execution.summary.failedSteps,
          duration: execution.summary.totalDurationMs,
        },
        completedAt,
        handoffCompletedBy: completedBy,
      });
    } catch (socketErr) {
      console.warn('Failed to emit handoff completion notification:', socketErr);
    }

    res.status(200).json({
      success: true,
      message: 'Handoff completed successfully',
      execution: {
        executionId: execution.executionId,
        status: 'completed',
        completedAt,
        completedBy,
      },
      jobCancelled,
    });

  } catch (error: any) {
    console.error('Error completing handoff:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete handoff'
    });
  }
};