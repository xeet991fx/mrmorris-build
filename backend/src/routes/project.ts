import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../validations/project";

const router = express.Router();

// Rate limiter for project operations
const projectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: "Too many requests, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/projects
 * @desc    Create new project
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  projectLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      // Validate input
      const validatedData = createProjectSchema.parse(req.body);

      // Create project with userId from authenticated user
      const project = await Project.create({
        userId: req.user?._id,
        name: validatedData.name,
      });

      res.status(201).json({
        success: true,
        message: "Project created successfully!",
        data: {
          project,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      console.error("Create project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create project. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/projects
 * @desc    List all user's projects
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  projectLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      // Find all projects belonging to the authenticated user
      const projects = await Project.find({ userId: req.user?._id })
        .sort({ createdAt: -1 }) // Sort by newest first
        .lean(); // Use lean for better performance (returns plain JS objects)

      res.status(200).json({
        success: true,
        data: {
          projects,
          count: projects.length,
        },
      });
    } catch (error) {
      console.error("Get projects error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve projects. Please try again.",
      });
    }
  }
);

/**
 * @route   GET /api/projects/:id
 * @desc    Get single project
 * @access  Private
 */
router.get(
  "/:id",
  authenticate,
  projectLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Find project by ID
      const project = await Project.findById(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: "Project not found.",
        });
      }

      // Verify project belongs to authenticated user
      if (project.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to access this project.",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          project,
        },
      });
    } catch (error: any) {
      // Handle invalid MongoDB ObjectId
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid project ID format.",
        });
      }

      console.error("Get project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve project. Please try again.",
      });
    }
  }
);

/**
 * @route   PATCH /api/projects/:id
 * @desc    Update project name/settings
 * @access  Private
 */
router.patch(
  "/:id",
  authenticate,
  projectLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Validate input
      const validatedData = updateProjectSchema.parse(req.body);

      // Find project by ID
      const project = await Project.findById(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: "Project not found.",
        });
      }

      // Verify project belongs to authenticated user
      if (project.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to update this project.",
        });
      }

      // Update project fields
      if (validatedData.name !== undefined) {
        project.name = validatedData.name;
      }

      await project.save();

      res.status(200).json({
        success: true,
        message: "Project updated successfully!",
        data: {
          project,
        },
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: error.errors,
        });
      }

      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid project ID format.",
        });
      }

      console.error("Update project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update project. Please try again.",
      });
    }
  }
);

/**
 * @route   DELETE /api/projects/:id
 * @desc    Delete project
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  projectLimiter,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      // Find project by ID
      const project = await Project.findById(id);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: "Project not found.",
        });
      }

      // Verify project belongs to authenticated user
      if (project.userId.toString() !== (req.user?._id as any).toString()) {
        return res.status(403).json({
          success: false,
          error: "You do not have permission to delete this project.",
        });
      }

      // Hard delete the project
      await Project.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Project deleted successfully!",
      });
    } catch (error: any) {
      if (error.name === "CastError") {
        return res.status(400).json({
          success: false,
          error: "Invalid project ID format.",
        });
      }

      console.error("Delete project error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete project. Please try again.",
      });
    }
  }
);


export default router;
