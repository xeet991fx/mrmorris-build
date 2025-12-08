import express, { Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import EmailTemplate from "../models/EmailTemplate";
import Project from "../models/Project";

const router = express.Router();

/**
 * Email Template Routes
 * 
 * CRUD operations for email templates used in workflow automation.
 * Routes follow workspace pattern: /api/workspaces/:workspaceId/email-templates
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

async function validateWorkspaceAccess(
    workspaceId: string,
    userId: string,
    res: Response
): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
        res.status(404).json({
            success: false,
            error: "Workspace not found.",
        });
        return false;
    }

    if (workspace.userId.toString() !== userId) {
        res.status(403).json({
            success: false,
            error: "You do not have permission to access this workspace.",
        });
        return false;
    }

    return true;
}

// ============================================
// GET TEMPLATES
// ============================================

/**
 * GET /api/workspaces/:workspaceId/email-templates
 * Get all templates for workspace
 */
router.get("/:workspaceId/email-templates", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { category } = req.query;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const query: any = { workspaceId };
        if (category) {
            query.category = category;
        }

        const templates = await EmailTemplate.find(query)
            .sort({ usageCount: -1, updatedAt: -1 })
            .select("-__v");

        res.json({
            success: true,
            data: templates,
        });
    } catch (error: any) {
        console.error("Get templates error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch templates",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/email-templates/defaults
 * Get or create default system templates
 */
router.get("/:workspaceId/email-templates/defaults", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        // Check if default templates exist for this workspace
        const existingDefaults = await EmailTemplate.find({
            workspaceId,
            isDefault: true,
        });

        if (existingDefaults.length === 0) {
            // Create default templates
            const defaultTemplates = [
                {
                    name: "Welcome Email",
                    subject: "Welcome to {{company}}!",
                    body: `<p>Hi {{firstName}},</p>
<p>Welcome to {{company}}! We're thrilled to have you join us.</p>
<p>If you have any questions, feel free to reach out. We're here to help!</p>
<p>Best regards,<br>The {{company}} Team</p>`,
                    category: "welcome",
                    description: "A friendly welcome email for new contacts",
                    thumbnailColor: "#10b981",
                },
                {
                    name: "Follow-Up",
                    subject: "Following up - {{company}}",
                    body: `<p>Hi {{firstName}},</p>
<p>I wanted to follow up on our previous conversation and see if you had any questions.</p>
<p>Please let me know if there's anything I can help you with.</p>
<p>Best regards</p>`,
                    category: "follow-up",
                    description: "A simple follow-up email",
                    thumbnailColor: "#3b82f6",
                },
                {
                    name: "Thank You",
                    subject: "Thank you, {{firstName}}!",
                    body: `<p>Hi {{firstName}},</p>
<p>Thank you for your time today. It was great speaking with you!</p>
<p>Looking forward to our next conversation.</p>
<p>Best regards</p>`,
                    category: "follow-up",
                    description: "A thank you email after a meeting or call",
                    thumbnailColor: "#8b5cf6",
                },
            ];

            for (const template of defaultTemplates) {
                await EmailTemplate.create({
                    ...template,
                    workspaceId,
                    createdBy: req.user?._id,
                    isDefault: true,
                });
            }
        }

        const templates = await EmailTemplate.find({
            workspaceId,
            isDefault: true,
        }).sort({ category: 1, name: 1 });

        res.json({
            success: true,
            data: templates,
        });
    } catch (error: any) {
        console.error("Get default templates error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch default templates",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/email-templates/:id
 * Get single template by ID
 */
router.get("/:workspaceId/email-templates/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const template = await EmailTemplate.findOne({
            _id: id,
            workspaceId,
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: "Template not found",
            });
        }

        res.json({
            success: true,
            data: template,
        });
    } catch (error: any) {
        console.error("Get template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to fetch template",
        });
    }
});

// ============================================
// CREATE TEMPLATE
// ============================================

/**
 * POST /api/workspaces/:workspaceId/email-templates
 * Create new email template
 */
router.post("/:workspaceId/email-templates", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { name, subject, body, category, description, thumbnailColor } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!name || !subject || !body) {
            return res.status(400).json({
                success: false,
                error: "Name, subject, and body are required",
            });
        }

        const template = await EmailTemplate.create({
            workspaceId,
            createdBy: req.user?._id,
            name,
            subject,
            body,
            category: category || "custom",
            description,
            thumbnailColor,
        });

        res.status(201).json({
            success: true,
            data: template,
            message: "Template created successfully",
        });
    } catch (error: any) {
        console.error("Create template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to create template",
        });
    }
});

// ============================================
// UPDATE TEMPLATE
// ============================================

/**
 * PUT /api/workspaces/:workspaceId/email-templates/:id
 * Update existing template
 */
router.put("/:workspaceId/email-templates/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { name, subject, body, category, description, thumbnailColor } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const template = await EmailTemplate.findOne({
            _id: id,
            workspaceId,
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: "Template not found",
            });
        }

        // Don't allow editing default templates
        if (template.isDefault) {
            return res.status(403).json({
                success: false,
                error: "Cannot edit default templates",
            });
        }

        // Update fields
        if (name) template.name = name;
        if (subject) template.subject = subject;
        if (body) template.body = body;
        if (category) template.category = category;
        if (description !== undefined) template.description = description;
        if (thumbnailColor) template.thumbnailColor = thumbnailColor;

        await template.save();

        res.json({
            success: true,
            data: template,
            message: "Template updated successfully",
        });
    } catch (error: any) {
        console.error("Update template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to update template",
        });
    }
});

// ============================================
// DELETE TEMPLATE
// ============================================

/**
 * DELETE /api/workspaces/:workspaceId/email-templates/:id
 * Delete a template
 */
router.delete("/:workspaceId/email-templates/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const template = await EmailTemplate.findOne({
            _id: id,
            workspaceId,
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: "Template not found",
            });
        }

        // Don't allow deleting default templates
        if (template.isDefault) {
            return res.status(403).json({
                success: false,
                error: "Cannot delete default templates",
            });
        }

        await EmailTemplate.deleteOne({ _id: id });

        res.json({
            success: true,
            message: "Template deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to delete template",
        });
    }
});

// ============================================
// DUPLICATE TEMPLATE
// ============================================

/**
 * POST /api/workspaces/:workspaceId/email-templates/:id/duplicate
 * Duplicate an existing template
 */
router.post("/:workspaceId/email-templates/:id/duplicate", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const original = await EmailTemplate.findOne({
            _id: id,
            workspaceId,
        });

        if (!original) {
            return res.status(404).json({
                success: false,
                error: "Template not found",
            });
        }

        const duplicate = await EmailTemplate.create({
            workspaceId,
            createdBy: req.user?._id,
            name: `${original.name} (Copy)`,
            subject: original.subject,
            body: original.body,
            category: original.category,
            description: original.description,
            thumbnailColor: original.thumbnailColor,
            isDefault: false,
        });

        res.status(201).json({
            success: true,
            data: duplicate,
            message: "Template duplicated successfully",
        });
    } catch (error: any) {
        console.error("Duplicate template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to duplicate template",
        });
    }
});

// ============================================
// TRACK USAGE
// ============================================

/**
 * POST /api/workspaces/:workspaceId/email-templates/:id/use
 * Increment usage count when template is used
 */
router.post("/:workspaceId/email-templates/:id/use", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;

        await EmailTemplate.updateOne(
            { _id: id, workspaceId },
            { $inc: { usageCount: 1 }, $set: { lastUsedAt: new Date() } }
        );

        res.json({ success: true });
    } catch (error: any) {
        console.error("Track usage error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to track usage",
        });
    }
});

export default router;
