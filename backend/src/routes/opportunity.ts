import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Opportunity from "../models/Opportunity";
import Pipeline from "../models/Pipeline";
import Project from "../models/Project";
import Activity from "../models/Activity";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createOpportunitySchema,
  updateOpportunitySchema,
  moveOpportunitySchema,
  opportunityQuerySchema,
} from "../validations/opportunity";
import { workflowService } from "../services/WorkflowService";
import { AgentEventListenerService } from "../services/AgentEventListenerService";
import { eventPublisher } from "../events/publisher/EventPublisher";
import { DEAL_EVENTS } from "../events/types/deal.events";
import { escapeRegex } from "../utils/sanitize";

const router = express.Router();

// Rate limiter
const opportunityLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/workspaces/:workspaceId/opportunities
 * @desc    Create new opportunity
 * @access  Private
 */
router.post(
  "/:workspaceId/opportunities",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      const validatedData = createOpportunitySchema.parse(req.body);

      // Transform empty strings to undefined for ObjectId fields
      const cleanedData = {
        ...validatedData,
        contactId: validatedData.contactId || undefined,
        companyId: validatedData.companyId || undefined,
        assignedTo: validatedData.assignedTo || undefined,
        associatedContacts: validatedData.associatedContacts?.filter(Boolean) || undefined,
        expectedCloseDate: validatedData.expectedCloseDate || undefined,
        description: validatedData.description || undefined,
        source: validatedData.source || undefined,
        lostReason: validatedData.lostReason || undefined,
      };

      // Validate pipeline and stage exist
      const pipeline = await Pipeline.findOne({
        _id: cleanedData.pipelineId,
        workspaceId,
        isActive: true,
      });

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      const stage = pipeline.stages.find(
        (s) => s._id.toString() === cleanedData.stageId
      );

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: "Stage not found in pipeline.",
        });
      }

      // Create initial stage history entry
      const stageHistory = [
        {
          stageId: stage._id,
          stageName: stage.name,
          enteredAt: new Date(),
        },
      ];

      // Create opportunity
      const opportunityDoc = await Opportunity.create({
        ...cleanedData,
        workspaceId,
        userId: req.user?._id,
        stageHistory,
      });

      // Populate references
      const opportunity: any = await Opportunity.findById(opportunityDoc._id)
        .populate("assignedTo", "name email")
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name industry")
        .populate("associatedContacts", "firstName lastName email")
        .lean();

      // Convert Map to plain object
      if (opportunity.customFields && opportunity.customFields instanceof Map) {
        opportunity.customFields = Object.fromEntries(
          opportunity.customFields
        );
      }

      // Publish deal.created event (non-blocking)
      eventPublisher.publish(
        DEAL_EVENTS.CREATED,
        {
          dealId: (opportunityDoc._id as any).toString(),
          title: opportunityDoc.title,
          value: opportunityDoc.value,
          pipelineId: opportunityDoc.pipelineId.toString(),
          stageId: stage._id.toString(),
          stageName: stage.name,
          contactId: opportunityDoc.contactId?.toString(),
          companyId: opportunityDoc.companyId?.toString(),
          assignedTo: opportunityDoc.assignedTo?.toString(),
          expectedCloseDate: opportunityDoc.expectedCloseDate,
          source: opportunityDoc.source,
        },
        {
          workspaceId,
          userId: (req.user?._id as any)?.toString(),
          source: 'api',
        }
      ).catch(err => console.error('Event publish error:', err));

      // Log deal creation to company if linked
      if (opportunityDoc.companyId) {
        try {
          await Activity.create({
            workspaceId,
            userId: req.user?._id,
            entityType: 'company',
            entityId: opportunityDoc.companyId,
            opportunityId: opportunityDoc._id,
            type: 'note',
            title: `New deal "${opportunityDoc.title}" created`,
            description: opportunityDoc.value
              ? `Deal worth $${opportunityDoc.value.toLocaleString()} was added`
              : 'New deal was added',
            isAutoLogged: true,
            automated: true,
            metadata: {
              dealId: (opportunityDoc._id as any).toString(),
              dealTitle: opportunityDoc.title,
              dealValue: opportunityDoc.value,
              stageName: stage.name,
            },
          });
        } catch (activityError) {
          console.error("Failed to log deal creation activity:", activityError);
        }
      }

      res.status(201).json({
        success: true,
        message: "Opportunity created successfully!",
        data: { opportunity },
      });

      // Trigger workflow enrollment for deal creation (async, don't wait) - kept for backward compatibility
      workflowService.checkAndEnroll("deal:created", opportunityDoc, workspaceId)
        .catch((err) => console.error("Workflow enrollment error:", err));
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Create opportunity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create opportunity. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/opportunities
 * @desc    Get all opportunities for a workspace
 * @access  Private
 */
router.get(
  "/:workspaceId/opportunities",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Parse query parameters
      const queryParams = opportunityQuerySchema.parse(req.query);
      const page = parseInt(queryParams.page);
      const limit = parseInt(queryParams.limit);
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { workspaceId };

      if (queryParams.pipelineId) {
        filter.pipelineId = queryParams.pipelineId;
      }

      if (queryParams.stageId) {
        filter.stageId = queryParams.stageId;
      }

      if (queryParams.status) {
        filter.status = queryParams.status;
      }

      if (queryParams.assignedTo) {
        filter.assignedTo = queryParams.assignedTo;
      }

      if (queryParams.contactId) {
        filter.contactId = queryParams.contactId;
      }

      if (queryParams.companyId) {
        filter.companyId = queryParams.companyId;
      }

      if (queryParams.priority) {
        filter.priority = queryParams.priority;
      }

      if (queryParams.tags) {
        const tags = queryParams.tags.split(",").map((t) => t.trim());
        filter.tags = { $in: tags };
      }

      // Search functionality - using escaped regex to prevent ReDoS attacks
      if (queryParams.search) {
        const safeSearch = escapeRegex(queryParams.search);
        filter.$or = [
          { title: { $regex: safeSearch, $options: "i" } },
          { description: { $regex: safeSearch, $options: "i" } },
        ];
      }

      // Get opportunities with pagination
      const [opportunityDocs, total] = await Promise.all([
        Opportunity.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("assignedTo", "name email")
          .populate("contactId", "firstName lastName email")
          .populate("companyId", "name industry")
          .populate("associatedContacts", "firstName lastName email"),
        Opportunity.countDocuments(filter),
      ]);

      // Convert Map to plain object
      const opportunities = opportunityDocs.map((doc) => {
        const obj: any = doc.toObject();
        if (obj.customFields && obj.customFields instanceof Map) {
          obj.customFields = Object.fromEntries(obj.customFields);
        }
        return obj;
      });

      res.status(200).json({
        success: true,
        data: {
          opportunities,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: error.errors,
        });
      }

      console.error("Get opportunities error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch opportunities. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/opportunities/by-pipeline/:pipelineId
 * @desc    Get opportunities grouped by stages (for kanban view)
 * @access  Private
 */
router.get(
  "/:workspaceId/opportunities/by-pipeline/:pipelineId",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, pipelineId } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Get pipeline
      const pipeline = await Pipeline.findOne({
        _id: pipelineId,
        workspaceId,
        isActive: true,
      });

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      // Get all opportunities for this pipeline
      const opportunityDocs = await Opportunity.find({
        workspaceId,
        pipelineId,
      })
        .sort({ createdAt: -1 })
        .populate("assignedTo", "name email")
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name industry")
        .populate("associatedContacts", "firstName lastName email");

      // Convert Map to plain object
      const opportunities = opportunityDocs.map((doc) => {
        const obj: any = doc.toObject();
        if (obj.customFields && obj.customFields instanceof Map) {
          obj.customFields = Object.fromEntries(obj.customFields);
        }
        return obj;
      });

      // Group by stages
      const stages = pipeline.stages
        .sort((a, b) => a.order - b.order)
        .map((stage) => ({
          stage: {
            _id: stage._id,
            name: stage.name,
            order: stage.order,
            color: stage.color,
          },
          opportunities: opportunities.filter(
            (opp) => opp.stageId.toString() === stage._id.toString()
          ),
        }));

      res.status(200).json({
        success: true,
        data: {
          pipeline: {
            _id: pipeline._id,
            name: pipeline.name,
            description: pipeline.description,
          },
          stages,
        },
      });
    } catch (error: any) {
      console.error("Get opportunities by pipeline error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch opportunities. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/opportunities/:id
 * @desc    Get single opportunity
 * @access  Private
 */
router.get(
  "/:workspaceId/opportunities/:id",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Find opportunity
      const opportunityDoc = await Opportunity.findOne({
        _id: id,
        workspaceId,
      })
        .populate("assignedTo", "name email")
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name industry")
        .populate("associatedContacts", "firstName lastName email");

      if (!opportunityDoc) {
        return res.status(404).json({
          success: false,
          error: "Opportunity not found.",
        });
      }

      // Convert Map to plain object
      const opportunity: any = opportunityDoc.toObject();
      if (opportunity.customFields && opportunity.customFields instanceof Map) {
        opportunity.customFields = Object.fromEntries(
          opportunity.customFields
        );
      }

      res.status(200).json({
        success: true,
        data: { opportunity },
      });
    } catch (error: any) {
      console.error("Get opportunity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch opportunity. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/:id
 * @desc    Update opportunity
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/:id",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      const validatedData = updateOpportunitySchema.parse(req.body);

      // Clean data: convert empty strings to undefined for optional ObjectId fields
      const cleanedData: Record<string, any> = {
        ...validatedData,
        contactId: validatedData.contactId || undefined,
        companyId: validatedData.companyId || undefined,
        assignedTo: validatedData.assignedTo || undefined,
        associatedContacts: validatedData.associatedContacts?.filter(Boolean) || undefined,
        expectedCloseDate: validatedData.expectedCloseDate || undefined,
        description: validatedData.description || undefined,
        source: validatedData.source || undefined,
        lostReason: validatedData.lostReason || undefined,
      };

      // If updating pipeline/stage, validate they exist and update stage history
      if (cleanedData.pipelineId || cleanedData.stageId) {
        const currentOpportunity = await Opportunity.findById(id).select("pipelineId stageId stageHistory");
        if (!currentOpportunity) {
          return res.status(404).json({
            success: false,
            error: "Opportunity not found.",
          });
        }

        const pipelineId = cleanedData.pipelineId || currentOpportunity.pipelineId;

        const pipeline = await Pipeline.findOne({
          _id: pipelineId,
          workspaceId,
          isActive: true,
        });

        if (!pipeline) {
          return res.status(404).json({
            success: false,
            error: "Pipeline not found.",
          });
        }

        if (cleanedData.stageId) {
          const stage = pipeline.stages.find(
            (s) => s._id.toString() === cleanedData.stageId
          );

          if (!stage) {
            return res.status(404).json({
              success: false,
              error: "Stage not found in pipeline.",
            });
          }

          // Update stage history if stage is changing
          if (currentOpportunity.stageId.toString() !== cleanedData.stageId) {
            // Close out the current stage
            const stageHistory = [...currentOpportunity.stageHistory];
            const currentStageIndex = stageHistory.length - 1;
            if (currentStageIndex >= 0 && !stageHistory[currentStageIndex].exitedAt) {
              stageHistory[currentStageIndex].exitedAt = new Date();
              stageHistory[currentStageIndex].duration =
                new Date().getTime() - new Date(stageHistory[currentStageIndex].enteredAt).getTime();
            }

            // Add new stage entry
            stageHistory.push({
              stageId: stage._id,
              stageName: stage.name,
              enteredAt: new Date(),
            });

            cleanedData.stageHistory = stageHistory;
          }
        }
      }

      // Update opportunity
      const opportunityDoc = await Opportunity.findOneAndUpdate(
        { _id: id, workspaceId },
        cleanedData,
        { new: true, runValidators: true }
      )
        .populate("assignedTo", "name email")
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name industry")
        .populate("associatedContacts", "firstName lastName email");

      if (!opportunityDoc) {
        return res.status(404).json({
          success: false,
          error: "Opportunity not found.",
        });
      }

      // Convert Map to plain object
      const opportunity: any = opportunityDoc.toObject();
      if (opportunity.customFields && opportunity.customFields instanceof Map) {
        opportunity.customFields = Object.fromEntries(
          opportunity.customFields
        );
      }

      res.status(200).json({
        success: true,
        message: "Opportunity updated successfully!",
        data: { opportunity },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Update opportunity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update opportunity. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/:id/move
 * @desc    Move opportunity to different stage/pipeline (for kanban drag-and-drop)
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/:id/move",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      const { stageId, pipelineId } = moveOpportunitySchema.parse(req.body);

      // Get current opportunity
      const opportunity = await Opportunity.findOne({ _id: id, workspaceId });
      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: "Opportunity not found.",
        });
      }

      // Determine target pipeline
      const targetPipelineId = pipelineId || opportunity.pipelineId;

      // Validate pipeline and stage
      const pipeline = await Pipeline.findOne({
        _id: targetPipelineId,
        workspaceId,
        isActive: true,
      });

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      const stage = pipeline.stages.find(
        (s) => s._id.toString() === stageId
      );

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: "Stage not found in pipeline.",
        });
      }

      // Get previous stage name for activity logging
      let previousStageName = "Unknown";
      const currentStageIndex = opportunity.stageHistory.length - 1;
      if (currentStageIndex >= 0) {
        const currentStage = opportunity.stageHistory[currentStageIndex];
        previousStageName = currentStage.stageName;
        if (!currentStage.exitedAt) {
          currentStage.exitedAt = new Date();
          currentStage.duration =
            currentStage.exitedAt.getTime() - currentStage.enteredAt.getTime();
        }
      }

      // Add new stage history entry
      opportunity.stageHistory.push({
        stageId: stage._id,
        stageName: stage.name,
        enteredAt: new Date(),
      });

      // Update opportunity
      opportunity.pipelineId = targetPipelineId as any;
      opportunity.stageId = stage._id;
      opportunity.lastActivityAt = new Date();

      await opportunity.save();

      // Auto-log stage change activity
      try {
        const stageChangeActivity = new Activity({
          workspaceId,
          userId: req.user?._id,
          opportunityId: id,
          type: "stage_change",
          title: `Moved from ${previousStageName} to ${stage.name}`,
          description: `Stage changed from "${previousStageName}" to "${stage.name}"`,
          metadata: {
            fromStage: previousStageName,
            toStage: stage.name,
          },
          isAutoLogged: true,
          aiConfidence: 100,
        });
        await stageChangeActivity.save();

        // Also log to company if deal has a companyId
        if (opportunity.companyId) {
          const companyStageActivity = new Activity({
            workspaceId,
            userId: req.user?._id,
            entityType: 'company',
            entityId: opportunity.companyId,
            opportunityId: id,
            type: "stage_change",
            title: `Deal "${opportunity.title}" moved to "${stage.name}"`,
            description: `Deal stage changed from "${previousStageName}" to "${stage.name}"`,
            metadata: {
              dealId: id,
              dealTitle: opportunity.title,
              fromStage: previousStageName,
              toStage: stage.name,
              dealValue: opportunity.value,
            },
            isAutoLogged: true,
            automated: true,
          });
          await companyStageActivity.save();
        }
      } catch (activityError) {
        console.error("Failed to log stage change activity:", activityError);
        // Don't fail the request if activity logging fails
      }

      // Populate and return
      const updatedOpportunity: any = await Opportunity.findById(id)
        .populate("assignedTo", "name email")
        .populate("contactId", "firstName lastName email")
        .populate("companyId", "name industry")
        .populate("associatedContacts", "firstName lastName email")
        .lean();

      // Convert Map to plain object
      if (
        updatedOpportunity.customFields &&
        updatedOpportunity.customFields instanceof Map
      ) {
        updatedOpportunity.customFields = Object.fromEntries(
          updatedOpportunity.customFields
        );
      }

      // Publish deal.stage_changed event (non-blocking)
      eventPublisher.publish(
        DEAL_EVENTS.STAGE_CHANGED,
        {
          dealId: (opportunity._id as any).toString(),
          contactId: opportunity.contactId?.toString(),
          companyId: opportunity.companyId?.toString(),
          pipelineId: opportunity.pipelineId.toString(),
          oldStageId: opportunity.stageHistory[currentStageIndex]?.stageId?.toString() || '',
          oldStageName: previousStageName,
          newStageId: stage._id.toString(),
          newStageName: stage.name,
          value: opportunity.value,
          movedAt: new Date(),
          movedBy: (req.user?._id as any)?.toString(),
          automated: false,
          stageHistory: opportunity.stageHistory.map(h => ({
            stageId: h.stageId.toString(),
            stageName: h.stageName,
            enteredAt: h.enteredAt,
          })),
        },
        {
          workspaceId,
          userId: (req.user?._id as any)?.toString(),
          source: 'api',
        }
      ).catch(err => console.error('Event publish error:', err));

      res.status(200).json({
        success: true,
        message: "Opportunity moved successfully!",
        data: { opportunity: updatedOpportunity },
      });

      // Trigger workflow enrollment for stage change (async, don't wait) - kept for backward compatibility
      workflowService.checkAndEnroll("deal:stage_changed", opportunity, workspaceId)
        .catch((err) => console.error("Workflow enrollment error:", err));

      // Story 3.4: Trigger event-based agents for deal stage change (async, don't wait)
      AgentEventListenerService.handleDealStageUpdated(
        opportunity.toObject(),
        previousStageName,
        stage.name,
        workspaceId,
        (req.user?._id as any)?.toString()
      ).catch((err) => console.error("Agent event trigger error:", err));
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Move opportunity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to move opportunity. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/opportunities/:id
 * @desc    Delete opportunity
 * @access  Private
 */
router.delete(
  "/:workspaceId/opportunities/:id",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id } = req.params;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Delete opportunity
      const opportunity = await Opportunity.findOneAndDelete({
        _id: id,
        workspaceId,
      });

      if (!opportunity) {
        return res.status(404).json({
          success: false,
          error: "Opportunity not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Opportunity deleted successfully!",
      });
    } catch (error: any) {
      console.error("Delete opportunity error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete opportunity. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/bulk
 * @desc    Bulk update multiple opportunities at once
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/bulk",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { opportunityIds, updates } = req.body;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "opportunityIds must be a non-empty array.",
        });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({
          success: false,
          error: "updates must be an object.",
        });
      }

      // Enforce maximum batch size for performance
      if (opportunityIds.length > 500) {
        return res.status(400).json({
          success: false,
          error: "Maximum 500 opportunities can be updated at once.",
        });
      }

      // Whitelist allowed fields for bulk update
      const allowedFields = [
        'tags',
        'status',
        'priority',
        'assignedTo',
        'source',
        'expectedCloseDate',
        'value',
        'probability',
        'lostReason',
        'description',
      ];

      // Build update object with only allowed fields
      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          updateData[field] = updates[field];
        }
      }

      // Handle custom fields separately (dot notation for nested updates)
      if (updates.customFields && typeof updates.customFields === 'object') {
        for (const [fieldKey, fieldValue] of Object.entries(updates.customFields)) {
          updateData[`customFields.${fieldKey}`] = fieldValue;
        }
      }

      // Ensure there are fields to update
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid fields to update.",
        });
      }

      // Add lastActivityAt timestamp
      updateData.lastActivityAt = new Date();

      // Perform bulk update
      const result = await Opportunity.updateMany(
        {
          _id: { $in: opportunityIds },
          workspaceId,
        },
        { $set: updateData }
      );

      // Get updated opportunities for event publishing
      const updatedOpportunities = await Opportunity.find({
        _id: { $in: opportunityIds },
        workspaceId,
      })
        .select('_id title value pipelineId stageId contactId companyId assignedTo')
        .lean();

      // Publish deal.updated events for workflow triggers (non-blocking)
      for (const opportunity of updatedOpportunities) {
        eventPublisher.publish(
          DEAL_EVENTS.UPDATED,
          {
            dealId: (opportunity._id as any).toString(),
            title: opportunity.title,
            value: opportunity.value,
            pipelineId: opportunity.pipelineId?.toString(),
            stageId: opportunity.stageId?.toString(),
            contactId: opportunity.contactId?.toString(),
            companyId: opportunity.companyId?.toString(),
            assignedTo: opportunity.assignedTo?.toString(),
            updates: updateData,
          },
          {
            workspaceId,
            userId: (req.user?._id as any)?.toString(),
            source: 'api',
          }
        ).catch(err => console.error('Event publish error:', err));
      }

      res.status(200).json({
        success: true,
        message: `Successfully updated ${result.modifiedCount} of ${result.matchedCount} opportunities.`,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          updatedOpportunities: updatedOpportunities.length,
        },
      });
    } catch (error: any) {
      console.error("Bulk update opportunities error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update opportunities. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/bulk/stage
 * @desc    Bulk change stage for multiple opportunities (most common bulk operation)
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/bulk/stage",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { opportunityIds, stageId, pipelineId } = req.body;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "opportunityIds must be a non-empty array.",
        });
      }

      if (!stageId) {
        return res.status(400).json({
          success: false,
          error: "stageId is required.",
        });
      }

      // Enforce maximum batch size
      if (opportunityIds.length > 500) {
        return res.status(400).json({
          success: false,
          error: "Maximum 500 opportunities can be updated at once.",
        });
      }

      // Get opportunities to determine pipeline
      const opportunities = await Opportunity.find({
        _id: { $in: opportunityIds },
        workspaceId,
      }).select('_id pipelineId stageId stageHistory title value contactId companyId');

      if (opportunities.length === 0) {
        return res.status(404).json({
          success: false,
          error: "No opportunities found.",
        });
      }

      // Determine target pipeline (from request or use first opportunity's pipeline)
      const targetPipelineId = pipelineId || opportunities[0].pipelineId;

      // Validate pipeline and stage
      const pipeline = await Pipeline.findOne({
        _id: targetPipelineId,
        workspaceId,
        isActive: true,
      });

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      const stage = pipeline.stages.find(
        (s) => s._id.toString() === stageId
      );

      if (!stage) {
        return res.status(404).json({
          success: false,
          error: "Stage not found in pipeline.",
        });
      }

      // Process each opportunity (update stage history)
      let successCount = 0;
      let failedCount = 0;
      const activities = [];

      for (const opportunity of opportunities) {
        try {
          // Skip if already in this stage
          if (opportunity.stageId.toString() === stageId) {
            successCount++;
            continue;
          }

          // Get previous stage name
          const currentStageIndex = opportunity.stageHistory.length - 1;
          let previousStageName = "Unknown";
          if (currentStageIndex >= 0) {
            const currentStage = opportunity.stageHistory[currentStageIndex];
            previousStageName = currentStage.stageName;
            if (!currentStage.exitedAt) {
              currentStage.exitedAt = new Date();
              currentStage.duration =
                currentStage.exitedAt.getTime() - currentStage.enteredAt.getTime();
            }
          }

          // Add new stage history entry
          opportunity.stageHistory.push({
            stageId: stage._id,
            stageName: stage.name,
            enteredAt: new Date(),
          });

          // Update opportunity
          opportunity.pipelineId = targetPipelineId as any;
          opportunity.stageId = stage._id;
          opportunity.lastActivityAt = new Date();
          await opportunity.save();

          // Prepare activity for logging
          activities.push({
            workspaceId,
            userId: req.user?._id,
            opportunityId: opportunity._id,
            type: "stage_change",
            title: `Bulk moved from ${previousStageName} to ${stage.name}`,
            description: `Stage changed from "${previousStageName}" to "${stage.name}" (bulk operation)`,
            metadata: {
              fromStage: previousStageName,
              toStage: stage.name,
              bulkOperation: true,
            },
            isAutoLogged: true,
            aiConfidence: 100,
          });

          // Also prepare company activity if deal has companyId
          if (opportunity.companyId) {
            activities.push({
              workspaceId,
              userId: req.user?._id,
              entityType: 'company',
              entityId: opportunity.companyId,
              opportunityId: opportunity._id,
              type: "stage_change",
              title: `Deal "${opportunity.title}" moved to "${stage.name}"`,
              description: `Deal stage changed from "${previousStageName}" to "${stage.name}" (bulk operation)`,
              metadata: {
                dealId: opportunity._id.toString(),
                dealTitle: opportunity.title,
                fromStage: previousStageName,
                toStage: stage.name,
                dealValue: opportunity.value,
                bulkOperation: true,
              },
              isAutoLogged: true,
              automated: true,
            });
          }

          // Publish deal.stage_changed event (non-blocking)
          eventPublisher.publish(
            DEAL_EVENTS.STAGE_CHANGED,
            {
              dealId: opportunity._id.toString(),
              contactId: opportunity.contactId?.toString(),
              companyId: opportunity.companyId?.toString(),
              pipelineId: opportunity.pipelineId.toString(),
              oldStageId: opportunity.stageHistory[currentStageIndex]?.stageId?.toString() || '',
              oldStageName: previousStageName,
              newStageId: stage._id.toString(),
              newStageName: stage.name,
              value: opportunity.value,
              movedAt: new Date(),
              movedBy: (req.user?._id as any)?.toString(),
              automated: false,
              bulkOperation: true,
              stageHistory: opportunity.stageHistory.map(h => ({
                stageId: h.stageId.toString(),
                stageName: h.stageName,
                enteredAt: h.enteredAt,
              })),
            },
            {
              workspaceId,
              userId: (req.user?._id as any)?.toString(),
              source: 'api',
            }
          ).catch(err => console.error('Event publish error:', err));

          successCount++;
        } catch (error: any) {
          console.error(`Failed to update opportunity ${opportunity._id}:`, error);
          failedCount++;
        }
      }

      // Batch insert activities
      if (activities.length > 0) {
        try {
          await Activity.insertMany(activities);
        } catch (activityError) {
          console.error("Failed to log bulk stage change activities:", activityError);
        }
      }

      res.status(200).json({
        success: true,
        message: `Successfully moved ${successCount} opportunities to "${stage.name}".`,
        data: {
          totalProcessed: opportunities.length,
          successCount,
          failedCount,
          stageName: stage.name,
          pipelineName: pipeline.name,
        },
      });
    } catch (error: any) {
      console.error("Bulk stage change error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to change opportunity stages. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/bulk/tags
 * @desc    Bulk add or remove tags from multiple opportunities
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/bulk/tags",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { opportunityIds, tagsToAdd, tagsToRemove } = req.body;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "opportunityIds must be a non-empty array.",
        });
      }

      if (opportunityIds.length > 500) {
        return res.status(400).json({
          success: false,
          error: "Maximum 500 opportunities can be updated at once.",
        });
      }

      if (!tagsToAdd && !tagsToRemove) {
        return res.status(400).json({
          success: false,
          error: "Either tagsToAdd or tagsToRemove must be provided.",
        });
      }

      // Validate tags arrays
      if (tagsToAdd && !Array.isArray(tagsToAdd)) {
        return res.status(400).json({
          success: false,
          error: "tagsToAdd must be an array.",
        });
      }

      if (tagsToRemove && !Array.isArray(tagsToRemove)) {
        return res.status(400).json({
          success: false,
          error: "tagsToRemove must be an array.",
        });
      }

      // Build update operations
      const updateOps: any = {};

      if (tagsToAdd && tagsToAdd.length > 0) {
        updateOps.$addToSet = { tags: { $each: tagsToAdd } };
      }

      if (tagsToRemove && tagsToRemove.length > 0) {
        updateOps.$pullAll = { tags: tagsToRemove };
      }

      // Perform bulk tag operation
      const result = await Opportunity.updateMany(
        {
          _id: { $in: opportunityIds },
          workspaceId,
        },
        updateOps
      );

      // Get updated opportunities for event publishing
      const updatedOpportunities = await Opportunity.find({
        _id: { $in: opportunityIds },
        workspaceId,
      }).select('_id title tags').lean();

      // Publish events for updated opportunities (non-blocking)
      for (const opportunity of updatedOpportunities) {
        eventPublisher.publish(
          DEAL_EVENTS.UPDATED,
          {
            dealId: (opportunity._id as any).toString(),
            title: opportunity.title,
            updates: { tags: opportunity.tags },
          },
          {
            workspaceId,
            userId: (req.user?._id as any)?.toString(),
            source: 'api',
          }
        ).catch(err => console.error('Event publish error:', err));
      }

      const message = [];
      if (tagsToAdd && tagsToAdd.length > 0) {
        message.push(`added ${tagsToAdd.length} tag(s)`);
      }
      if (tagsToRemove && tagsToRemove.length > 0) {
        message.push(`removed ${tagsToRemove.length} tag(s)`);
      }

      res.status(200).json({
        success: true,
        message: `Successfully ${message.join(' and ')} for ${result.modifiedCount} opportunity(s).`,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          tagsAdded: tagsToAdd || [],
          tagsRemoved: tagsToRemove || [],
        },
      });
    } catch (error: any) {
      console.error("Bulk tag operation error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update tags. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/opportunities/bulk/custom-fields
 * @desc    Bulk update custom fields for multiple opportunities
 * @access  Private
 */
router.patch(
  "/:workspaceId/opportunities/bulk/custom-fields",
  authenticate,
  opportunityLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId } = req.params;
      const { opportunityIds, customFields } = req.body;

      // Validate workspace
      const workspace = await Project.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          error: "Workspace not found.",
        });
      }

      if (workspace.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this workspace.",
        });
      }

      // Validate input
      if (!opportunityIds || !Array.isArray(opportunityIds) || opportunityIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: "opportunityIds must be a non-empty array.",
        });
      }

      if (opportunityIds.length > 500) {
        return res.status(400).json({
          success: false,
          error: "Maximum 500 opportunities can be updated at once.",
        });
      }

      if (!customFields || typeof customFields !== 'object' || Object.keys(customFields).length === 0) {
        return res.status(400).json({
          success: false,
          error: "customFields must be a non-empty object.",
        });
      }

      // Build update data with dot notation for nested custom fields
      const updateData: Record<string, any> = {};
      for (const [fieldKey, fieldValue] of Object.entries(customFields)) {
        updateData[`customFields.${fieldKey}`] = fieldValue;
      }

      // Perform bulk custom field update
      const result = await Opportunity.updateMany(
        {
          _id: { $in: opportunityIds },
          workspaceId,
        },
        { $set: updateData }
      );

      // Get updated opportunities for event publishing
      const updatedOpportunities = await Opportunity.find({
        _id: { $in: opportunityIds },
        workspaceId,
      }).select('_id title customFields').lean();

      // Publish events for updated opportunities (non-blocking)
      for (const opportunity of updatedOpportunities) {
        eventPublisher.publish(
          DEAL_EVENTS.UPDATED,
          {
            dealId: (opportunity._id as any).toString(),
            title: opportunity.title,
            updates: { customFields: opportunity.customFields },
          },
          {
            workspaceId,
            userId: (req.user?._id as any)?.toString(),
            source: 'api',
          }
        ).catch(err => console.error('Event publish error:', err));
      }

      res.status(200).json({
        success: true,
        message: `Successfully updated custom fields for ${result.modifiedCount} opportunity(s).`,
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
          fieldsUpdated: Object.keys(customFields),
        },
      });
    } catch (error: any) {
      console.error("Bulk custom field update error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update custom fields. Please try again.",
      });
    }
  }
);

export default router;

