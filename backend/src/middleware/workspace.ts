import { Request, Response, NextFunction } from "express";
import Project from "../models/Project";
import { AuthRequest } from "./auth";

/**
 * Middleware to validate that the user has access to the specified workspace
 */
export const validateWorkspaceAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = req.user;

    if (!user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({
        success: false,
        error: "Workspace ID is required",
      });
      return;
    }

    // Check if workspace exists and user has access
    const workspace = await Project.findOne({
      _id: workspaceId,
      userId: user._id,
    });

    if (!workspace) {
      res.status(404).json({
        success: false,
        error: "Workspace not found or access denied",
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to validate workspace access",
    });
  }
};

/**
 * Alias for compatibility
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: "Authentication required",
    });
    return;
  }
  next();
};
