/**
 * Apollo Settings Routes
 * 
 * Handles workspace-specific Apollo.io integration settings
 */

import express, { Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import Project from "../models/Project";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/workspaces/:workspaceId/apollo/settings
 * Get Apollo settings for a workspace
 */
router.get("/:workspaceId/apollo/settings", async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;

        const workspace = await Project.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }

        // Return Apollo settings from workspace or defaults
        const apolloSettings = (workspace as any).apolloSettings || {
            apiKey: process.env.APOLLO_API_KEY ? "********" : "",
            autoEnrichNew: false,
            autoEnrichMissing: false,
            autoVerifyEmails: false,
            alertThreshold: 100,
            notificationEmail: "",
        };

        res.json(apolloSettings);
    } catch (error: any) {
        console.error("Get Apollo settings error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/apollo/settings
 * Save Apollo settings for a workspace
 */
router.post("/:workspaceId/apollo/settings", async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const settings = req.body;

        const workspace = await Project.findById(workspaceId);
        if (!workspace) {
            return res.status(404).json({
                success: false,
                message: "Workspace not found",
            });
        }

        // Save settings to workspace (except API key which is env-based)
        await Project.findByIdAndUpdate(workspaceId, {
            $set: {
                apolloSettings: {
                    autoEnrichNew: settings.autoEnrichNew || false,
                    autoEnrichMissing: settings.autoEnrichMissing || false,
                    autoVerifyEmails: settings.autoVerifyEmails || false,
                    alertThreshold: settings.alertThreshold || 100,
                    notificationEmail: settings.notificationEmail || "",
                },
            },
        });

        res.json({
            success: true,
            message: "Apollo settings saved successfully",
        });
    } catch (error: any) {
        console.error("Save Apollo settings error:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
});

export default router;
