import express, { Response } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { authenticate, AuthRequest } from "../middleware/auth";
import EmailTemplate from "../models/EmailTemplate";
import Project from "../models/Project";
import { templateGeneratorService, GenerateTemplateOptions, generateUnlayerTemplate } from "../services/TemplateGeneratorService";
import emailService from "../services/email";

const router = express.Router();

// ============================================
// MULTER CONFIGURATION
// ============================================

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { workspaceId } = req.params;
        const uploadDir = path.join(__dirname, "../../uploads/email-images", workspaceId);

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_IMAGE_SIZE || "5242880"), // 5MB default
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = (process.env.ALLOWED_IMAGE_TYPES || "image/jpeg,image/png,image/gif").split(",");
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."));
        }
    },
});


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

        if (!name || !subject) {
            return res.status(400).json({
                success: false,
                error: "Name and subject are required",
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
        if (body !== undefined) template.body = body;
        if (category) template.category = category;
        if (description !== undefined) template.description = description;
        if (thumbnailColor) template.thumbnailColor = thumbnailColor;

        // NEW: Email Builder fields
        const { builderJson, htmlContent, thumbnailUrl } = req.body;
        if (builderJson !== undefined) template.builderJson = builderJson;
        if (htmlContent !== undefined) template.htmlContent = htmlContent;
        if (thumbnailUrl !== undefined) template.thumbnailUrl = thumbnailUrl;

        // Increment version if builder content changed
        if (builderJson !== undefined || htmlContent !== undefined) {
            template.version = (template.version || 1) + 1;
        }

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
            builderJson: original.builderJson, // NEW: Copy builder JSON
            htmlContent: original.htmlContent, // NEW: Copy HTML content
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

// ============================================
// AI TEMPLATE GENERATION
// ============================================

/**
 * POST /api/workspaces/:workspaceId/email-templates/generate
 * Generate a template using AI (Gemini 2.5 Pro)
 */
router.post("/:workspaceId/email-templates/generate", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const {
            templateType,
            purpose,
            tone,
            length,
            additionalDetails,
            sampleImage,
            industry,
            targetAudience,
            saveTemplate, // If true, save to database
        } = req.body;

        // Validate required fields
        if (!templateType || !purpose || !tone || !length) {
            return res.status(400).json({
                success: false,
                error: "templateType, purpose, tone, and length are required",
            });
        }

        // Generate template using AI
        const options: GenerateTemplateOptions = {
            templateType,
            purpose,
            tone,
            length,
            additionalDetails,
            sampleImage,
            industry,
            targetAudience,
        };

        console.log("🤖 Generating template with AI:", { templateType, purpose, tone, length });
        const generatedTemplate = await templateGeneratorService.generateTemplate(options);

        // Optionally save to database
        let savedTemplate = null;
        if (saveTemplate) {
            savedTemplate = await EmailTemplate.create({
                workspaceId,
                createdBy: req.user?._id,
                name: generatedTemplate.name,
                subject: generatedTemplate.subject || "",
                body: generatedTemplate.body,
                category: purpose === "welcome" ? "welcome" :
                    purpose === "follow-up" ? "follow-up" :
                        purpose === "sales-pitch" ? "promotion" : "custom",
                description: `AI-generated ${templateType} template for ${purpose}`,
                variables: generatedTemplate.variables,
            });
        }

        res.json({
            success: true,
            data: {
                generated: generatedTemplate,
                saved: savedTemplate,
            },
            message: "Template generated successfully",
        });
    } catch (error: any) {
        console.error("AI generation error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate template with AI",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/generate-unlayer
 * Generate an Unlayer email template design using AI
 */
router.post("/:workspaceId/email-templates/generate-unlayer", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const { prompt } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required",
            });
        }

        console.log("🤖 Generating Unlayer template with AI:", { prompt: prompt.substring(0, 100) + "..." });
        const generatedTemplate = await generateUnlayerTemplate(prompt.trim());

        res.json({
            success: true,
            data: generatedTemplate,
            message: "Unlayer template generated successfully",
        });
    } catch (error: any) {
        console.error("Unlayer AI generation error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate Unlayer template with AI",
        });
    }
});

// ============================================
// EMAIL BUILDER ROUTES
// ============================================

/**
 * POST /api/workspaces/:workspaceId/email-templates/upload-image
 * Upload image for email builder
 */
router.post(
    "/:workspaceId/email-templates/upload-image",
    authenticate,
    upload.single("file"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();

            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: "No file uploaded",
                });
            }

            // Optimize image with sharp
            const optimizedPath = req.file.path.replace(path.extname(req.file.path), "-optimized" + path.extname(req.file.path));

            await sharp(req.file.path)
                .resize(1200, null, { withoutEnlargement: true }) // Max width 1200px
                .jpeg({ quality: 85 })
                .png({ compressionLevel: 9 })
                .toFile(optimizedPath);

            // Delete original file
            fs.unlinkSync(req.file.path);

            // Return public URL
            const publicUrl = `/uploads/email-images/${workspaceId}/${path.basename(optimizedPath)}`;

            res.json({
                success: true,
                data: {
                    url: `${req.protocol}://${req.get("host")}${publicUrl}`,
                },
            });
        } catch (error: any) {
            console.error("Image upload error:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to upload image",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/email-templates/:id/send-test
 * Send test email
 */
router.post("/:workspaceId/email-templates/:id/send-test", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { email, html, subject, sampleData } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!email || !html) {
            return res.status(400).json({
                success: false,
                error: "Email address and HTML content are required",
            });
        }

        // Replace variables with sample data
        let processedHtml = html;
        if (sampleData) {
            for (const [key, value] of Object.entries(sampleData)) {
                const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
                processedHtml = processedHtml.replace(regex, String(value));
            }
        }

        // Send test email using existing email service
        await emailService.sendWorkflowEmail(
            email,
            subject || "Test Email",
            processedHtml,
            sampleData || {}
        );

        res.json({
            success: true,
            message: `Test email sent to ${email}`,
        });
    } catch (error: any) {
        console.error("Send test email error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to send test email",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/:id/validate
 * Validate email template (check links and images)
 */
router.post("/:workspaceId/email-templates/:id/validate", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, id } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { html } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        if (!html) {
            return res.status(400).json({
                success: false,
                error: "HTML content is required",
            });
        }

        const errors: any[] = [];

        // 1. Extract and validate all links
        const linkRegex = /<a[^>]+href=["']([^"']+)["']/g;
        let linkMatch;
        while ((linkMatch = linkRegex.exec(html)) !== null) {
            const link = linkMatch[1];

            if (!link || link === "#" || link === "") {
                errors.push({
                    type: "broken-link",
                    message: `Empty or placeholder link found: ${link}`,
                    severity: "warning",
                });
            } else {
                // Check if URL is valid
                try {
                    new URL(link);
                } catch (e) {
                    // Check if it's a relative URL or mailto
                    if (!link.startsWith("/") && !link.startsWith("mailto:") && !link.startsWith("tel:")) {
                        errors.push({
                            type: "invalid-link",
                            message: `Invalid URL: ${link}`,
                            severity: "error",
                        });
                    }
                }
            }
        }

        // 2. Extract and validate all images
        const imgRegex = /<img[^>]+src=["']([^"']+)["']/g;
        let imgMatch;
        while ((imgMatch = imgRegex.exec(html)) !== null) {
            const src = imgMatch[1];

            if (!src || src === "") {
                errors.push({
                    type: "missing-image",
                    message: "Image tag with empty src attribute",
                    severity: "error",
                });
            }
        }

        res.json({
            success: true,
            data: {
                errors,
                isValid: errors.length === 0,
            },
        });
    } catch (error: any) {
        console.error("Validate template error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to validate template",
        });
    }
});

export default router;

