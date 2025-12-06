import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import { Types } from "mongoose";
import Pipeline from "../models/Pipeline";
import Opportunity from "../models/Opportunity";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createPipelineSchema,
  updatePipelineSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  pipelineQuerySchema,
} from "../validations/pipeline";

const router = express.Router();

// Rate limiter
const pipelineLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/workspaces/:workspaceId/pipelines
 * @desc    Create new pipeline
 * @access  Private
 */
router.post(
  "/:workspaceId/pipelines",
  authenticate,
  pipelineLimiter,
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
      const validatedData = createPipelineSchema.parse(req.body);

      // Auto-assign order to stages if not provided
      const stagesWithOrder = validatedData.stages.map((stage, index) => ({
        ...stage,
        order: stage.order !== undefined ? stage.order : index,
      }));

      // Create pipeline
      const pipeline = await Pipeline.create({
        ...validatedData,
        stages: stagesWithOrder,
        workspaceId,
        userId: req.user?._id,
      });

      res.status(201).json({
        success: true,
        message: "Pipeline created successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Create pipeline error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create pipeline. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/pipelines
 * @desc    Get all pipelines for a workspace
 * @access  Private
 */
router.get(
  "/:workspaceId/pipelines",
  authenticate,
  pipelineLimiter,
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
      const queryParams = pipelineQuerySchema.parse(req.query);
      const page = parseInt(queryParams.page);
      const limit = parseInt(queryParams.limit);
      const skip = (page - 1) * limit;

      // Build filter
      const filter: any = { workspaceId };
      if (queryParams.isActive) {
        filter.isActive = queryParams.isActive === "true";
      }

      // Get pipelines with pagination
      const [pipelines, total] = await Promise.all([
        Pipeline.find(filter)
          .sort({ isDefault: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        Pipeline.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          pipelines,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      console.error("Get pipelines error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch pipelines. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/workspaces/:workspaceId/pipelines/:id
 * @desc    Get single pipeline
 * @access  Private
 */
router.get(
  "/:workspaceId/pipelines/:id",
  authenticate,
  pipelineLimiter,
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

      // Get pipeline
      const pipeline = await Pipeline.findOne({ _id: id, workspaceId });
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      res.status(200).json({
        success: true,
        data: { pipeline },
      });
    } catch (error: any) {
      console.error("Get pipeline error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch pipeline. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/pipelines/:id
 * @desc    Update pipeline
 * @access  Private
 */
router.patch(
  "/:workspaceId/pipelines/:id",
  authenticate,
  pipelineLimiter,
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
      const validatedData = updatePipelineSchema.parse(req.body);

      // Update pipeline
      const pipeline = await Pipeline.findOneAndUpdate(
        { _id: id, workspaceId },
        validatedData,
        { new: true, runValidators: true }
      );

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Pipeline updated successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Update pipeline error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update pipeline. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/pipelines/:id
 * @desc    Delete (archive) pipeline
 * @access  Private
 */
router.delete(
  "/:workspaceId/pipelines/:id",
  authenticate,
  pipelineLimiter,
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

      // Check if pipeline has opportunities
      const opportunityCount = await Opportunity.countDocuments({
        pipelineId: id,
        workspaceId,
      });

      if (opportunityCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete pipeline with ${opportunityCount} opportunities. Please move or delete them first.`,
        });
      }

      // Soft delete (archive)
      const pipeline = await Pipeline.findOneAndUpdate(
        { _id: id, workspaceId },
        { isActive: false },
        { new: true }
      );

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Pipeline archived successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      console.error("Delete pipeline error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete pipeline. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/pipelines/:id/stages
 * @desc    Add stage to pipeline
 * @access  Private
 */
router.post(
  "/:workspaceId/pipelines/:id/stages",
  authenticate,
  pipelineLimiter,
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
      const validatedData = createStageSchema.parse(req.body);

      // Get pipeline
      const pipeline = await Pipeline.findOne({ _id: id, workspaceId });
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      // Check stage limit
      if (pipeline.stages.length >= 20) {
        return res.status(400).json({
          success: false,
          error: "Pipeline cannot have more than 20 stages.",
        });
      }

      // Create new stage with order
      const newStage = {
        _id: new Types.ObjectId(),
        name: validatedData.name,
        color: validatedData.color,
        order: validatedData.order !== undefined ? validatedData.order : pipeline.stages.length,
      };

      // Add stage
      pipeline.stages.push(newStage);
      await pipeline.save();

      res.status(201).json({
        success: true,
        message: "Stage added successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Add stage error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to add stage. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/workspaces/:workspaceId/pipelines/:id/stages/:stageId
 * @desc    Update stage
 * @access  Private
 */
router.patch(
  "/:workspaceId/pipelines/:id/stages/:stageId",
  authenticate,
  pipelineLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id, stageId } = req.params;

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
      const validatedData = updateStageSchema.parse(req.body);

      // Update stage
      const pipeline = await Pipeline.findOneAndUpdate(
        { _id: id, workspaceId, "stages._id": stageId },
        {
          $set: {
            ...(validatedData.name && { "stages.$.name": validatedData.name }),
            ...(validatedData.color && { "stages.$.color": validatedData.color }),
            ...(validatedData.order !== undefined && { "stages.$.order": validatedData.order }),
          },
        },
        { new: true, runValidators: true }
      );

      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline or stage not found.",
        });
      }

      res.status(200).json({
        success: true,
        message: "Stage updated successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Update stage error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update stage. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/workspaces/:workspaceId/pipelines/:id/stages/:stageId
 * @desc    Delete stage
 * @access  Private
 */
router.delete(
  "/:workspaceId/pipelines/:id/stages/:stageId",
  authenticate,
  pipelineLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { workspaceId, id, stageId } = req.params;

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

      // Check if stage has opportunities
      const opportunityCount = await Opportunity.countDocuments({
        pipelineId: id,
        stageId,
        workspaceId,
      });

      if (opportunityCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete stage with ${opportunityCount} opportunities. Please move them first.`,
        });
      }

      // Get pipeline
      const pipeline = await Pipeline.findOne({ _id: id, workspaceId });
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      // Check if it's the last stage
      if (pipeline.stages.length === 1) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete the last stage. Pipeline must have at least one stage.",
        });
      }

      // Remove stage
      pipeline.stages = pipeline.stages.filter(
        (stage) => stage._id.toString() !== stageId
      );
      await pipeline.save();

      res.status(200).json({
        success: true,
        message: "Stage deleted successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      console.error("Delete stage error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete stage. Please try again.",
      });
    }
  }
);

/**
 * @route   POST /api/workspaces/:workspaceId/pipelines/:id/stages/reorder
 * @desc    Reorder stages
 * @access  Private
 */
router.post(
  "/:workspaceId/pipelines/:id/stages/reorder",
  authenticate,
  pipelineLimiter,
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
      const { stageOrder } = reorderStagesSchema.parse(req.body);

      // Get pipeline
      const pipeline = await Pipeline.findOne({ _id: id, workspaceId });
      if (!pipeline) {
        return res.status(404).json({
          success: false,
          error: "Pipeline not found.",
        });
      }

      // Validate all stage IDs exist
      const stageIds = pipeline.stages.map((s) => s._id.toString());
      const allValid = stageOrder.every((id) => stageIds.includes(id));

      if (!allValid || stageOrder.length !== pipeline.stages.length) {
        return res.status(400).json({
          success: false,
          error: "Invalid stage order. All stages must be included.",
        });
      }

      // Reorder stages
      const reorderedStages = stageOrder.map((stageId, index) => {
        const stage = pipeline.stages.find((s) => s._id.toString() === stageId);
        return {
          _id: stage!._id,
          name: stage!.name,
          color: stage!.color,
          order: index,
        };
      });

      pipeline.stages = reorderedStages as any;
      await pipeline.save();

      res.status(200).json({
        success: true,
        message: "Stages reordered successfully!",
        data: { pipeline },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Reorder stages error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reorder stages. Please try again.",
      });
    }
  }
);

export default router;
