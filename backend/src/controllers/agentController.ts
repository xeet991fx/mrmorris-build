import { Request, Response } from 'express';
import Agent, { RESTRICTIONS_DEFAULTS, MEMORY_DEFAULTS, APPROVAL_DEFAULTS } from '../models/Agent';
import { CreateAgentInput, UpdateAgentInput } from '../validations/agentValidation';
import User from '../models/User';
import TeamMember from '../models/TeamMember';
import Project from '../models/Project';

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
 * @desc List all agents in a workspace
 * @access Private (requires authentication and workspace access)
 */
export const listAgents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.params;

    // Query with workspace filter for security
    const agents = await Agent.find({
      workspace: workspaceId
    }).sort({ createdAt: -1 }); // Most recent first

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
        // Story 1.5: Include memory in list response
        memory: agent.memory || MEMORY_DEFAULTS,
        // Story 1.6: Include approvalConfig in list response
        approvalConfig: agent.approvalConfig || APPROVAL_DEFAULTS
      }))
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

