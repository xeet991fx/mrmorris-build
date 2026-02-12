import express, { Response } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { authenticate, AuthRequest } from "../middleware/auth";
import EmailTemplate from "../models/EmailTemplate";
import Project from "../models/Project";
import { templateGeneratorService, GenerateTemplateOptions, generateUnlayerTemplate, modifyUnlayerTemplate } from "../services/TemplateGeneratorService";
import { intelligentTemplateAI, aiConcurrencyLimiter } from "../services/IntelligentTemplateAI";
import emailService from "../services/email";
import { clearWorkspaceCache } from "../services/AgentCopilotService"; // Story 4.6 Issue #3 Fix

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
        const { category, page = "1", limit = "50" } = req.query;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const query: any = { workspaceId };
        if (category) {
            query.category = category;
        }

        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        const [templates, total] = await Promise.all([
            EmailTemplate.find(query)
                .sort({ usageCount: -1, updatedAt: -1 })
                .select("-__v")
                .skip(skip)
                .limit(parseInt(limit as string)),
            EmailTemplate.countDocuments(query),
        ]);

        res.json({
            success: true,
            data: {
                templates,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / parseInt(limit as string)),
                },
            },
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
            // Create default templates — includes core CRM + GTM outreach templates
            const defaultTemplates = [
                // ── Core CRM Templates ──
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

                // ── GTM Cold Outreach Templates ──
                {
                    name: "Cold Outreach — Spreadsheet Hell",
                    subject: "Still tracking deals in Google Sheets?",
                    body: `<p>Hey {{firstName}},</p>
<p>Quick question: how are you tracking your sales pipeline right now?</p>
<p>Most early-stage founders I talk to say some version of:</p>
<ul>
<li>"Google Sheets... it's a mess"</li>
<li>"Notion, but nobody updates it"</li>
<li>"Honestly, just my email inbox"</li>
</ul>
<p>Here's the problem: spreadsheets don't send follow-ups, they don't remind you to reach out, and they definitely don't update themselves after sales calls.</p>
<p><strong>We built an AI-native CRM specifically for startup sales teams.</strong></p>
<p>After every call, our AI:</p>
<ul>
<li>Auto-updates the deal (stage, next steps, notes)</li>
<li>Creates follow-up tasks</li>
<li>Drafts follow-up emails (you approve before sending)</li>
<li>Schedules meetings</li>
<li>Answers questions via chat: "Show me deals closing this month"</li>
</ul>
<p><strong>No more manual data entry. No more lost deals because someone forgot to follow up.</strong></p>
<p>I'm looking for <strong>5 early-stage startups</strong> to pilot this for 30 days.</p>
<p><strong>What you get:</strong></p>
<ul>
<li>Free setup (literally 48 hours to go live)</li>
<li>AI that eliminates 80% of CRM busywork</li>
<li>Weekly calls where you help shape the product</li>
<li>Founder pricing if you convert: $99/month flat (not per user) for 6 months</li>
</ul>
<p><strong>What I need:</strong></p>
<ul>
<li>You're doing 20+ sales calls/month</li>
<li>You use Gmail + Google Calendar (we integrate automatically)</li>
<li>15 mins/week for feedback calls</li>
</ul>
<p>The deal: 30 days free. If it doesn't transform your sales process, we part ways. If it does, you lock in founder pricing forever.</p>
<p>Interested? Reply "yes" and I'll send the pilot details.</p>
<p>Best,<br>{{senderName}}</p>
<p><em>P.S. — We're not trying to be Salesforce. We're built for founders who want a CRM that actually works for them, not against them.</em></p>`,
                    category: "outreach",
                    description: "Cold outreach targeting founders using spreadsheets for pipeline management",
                    thumbnailColor: "#f59e0b",
                },
                {
                    name: "Cold Outreach — Lost Deal Hook",
                    subject: "That deal you just lost",
                    body: `<p>{{firstName}},</p>
<p>Real talk: have you ever lost a deal because someone on your team forgot to follow up?</p>
<p>Or because you couldn't remember what was discussed on the call 2 weeks ago?</p>
<p>Or because your pipeline was so disorganized you didn't realize the deal was slipping?</p>
<p><strong>This happens to every early-stage startup using spreadsheets to manage sales.</strong></p>
<p>We built an AI-native CRM that fixes this:</p>
<ul>
<li>✅ <strong>Auto-updates after every call</strong> — transcribes, extracts next steps, updates deal stage</li>
<li>✅ <strong>Never miss follow-ups</strong> — AI creates tasks, drafts emails, schedules meetings</li>
<li>✅ <strong>Chat-based interface</strong> — ask "show me stalled deals" → get instant answers</li>
<li>✅ <strong>Built for speed</strong> — set up in 48 hours, not 1 month</li>
</ul>
<p>I'm running a <strong>30-day pilot with 5 startup teams</strong> to prove this works.</p>
<p>You get:</p>
<ul>
<li>Free setup with Gmail, Calendar, Google Meet</li>
<li>AI that eliminates spreadsheet chaos</li>
<li>Weekly calls to shape the product</li>
<li>Founder pricing: $99/month flat (first 6 months)</li>
</ul>
<p>I need:</p>
<ul>
<li>5-20 person team</li>
<li>20+ sales calls/month</li>
<li>Willingness to try something new</li>
</ul>
<p>If you're tired of losing deals to disorganization, reply "interested" and I'll send the pilot brief.</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Cold outreach using emotional hook about lost deals from poor follow-up",
                    thumbnailColor: "#ef4444",
                },
                {
                    name: "Cold Outreach — Follow-Up (No Response)",
                    subject: "Re: Still tracking deals in Google Sheets?",
                    body: `<p>Hey {{firstName}},</p>
<p>Didn't hear back — totally get it, you're busy building {{company}}.</p>
<p>One quick thing: if you're still managing deals in spreadsheets, I think you'd find our AI CRM genuinely useful. It auto-updates from calls and sends follow-ups — which is ironic, because that's exactly what I'm doing right now.</p>
<p>If the timing's wrong, no worries. Reply "later" and I'll check back in 3 months.</p>
<p>If the timing IS right, reply "yes" and I'll send you the pilot details (30 days free, 48-hour setup).</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Follow-up email for prospects who didn't respond to cold outreach",
                    thumbnailColor: "#f97316",
                },
                {
                    name: "Cold Outreach — Breakup Email",
                    subject: "Should I close your file?",
                    body: `<p>{{firstName}},</p>
<p>I've reached out a couple times about our AI-native CRM for startups. Since I haven't heard back, I'm guessing the timing isn't right.</p>
<p>No worries at all — I'll close your file for now.</p>
<p>If things change and you want to explore this later, just reply to this email. The pilot offer still stands.</p>
<p>Good luck with {{company}}. Rooting for you.</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Final follow-up — polite breakup email if no response after multiple touches",
                    thumbnailColor: "#6b7280",
                },
                {
                    name: "Cold Outreach — Pilot Offer",
                    subject: "30-day free AI CRM pilot for {{company}}",
                    body: `<p>Hey {{firstName}},</p>
<p>Thanks for your interest in Clianta! Here's the pilot offer:</p>
<p><strong>30-Day AI-Native CRM Pilot</strong></p>
<p><strong>What you get:</strong></p>
<ul>
<li>Full CRM setup — contacts, deals, pipeline stages, custom fields</li>
<li>AI that auto-updates deals from call transcripts</li>
<li>Auto-created follow-up tasks and email drafts</li>
<li>Chat interface — ask questions, get instant pipeline insights</li>
<li>Gmail, Google Calendar, and Meet integration</li>
<li>I personally set up your workspace (live in 48 hours)</li>
<li>Weekly 15-minute feedback calls</li>
</ul>
<p><strong>What I need from you:</strong></p>
<ul>
<li>Your entire sales team uses Clianta during the pilot</li>
<li>20+ sales calls/month as a team</li>
<li>Brutally honest feedback</li>
</ul>
<p><strong>Success criteria by day 30:</strong></p>
<ul>
<li>80% less time on CRM admin</li>
<li>Zero missed follow-ups</li>
<li>Your team actually wants to keep using it</li>
</ul>
<p><strong>After day 30:</strong></p>
<ul>
<li>If you love it → Founder pricing: $99/month flat (not per user) for 6 months</li>
<li>If it's close → We extend and iterate</li>
<li>If it's not a fit → We part ways, no hard feelings</li>
</ul>
<p>Ready to get started? Reply and we'll schedule a 30-minute kickoff call.</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Detailed pilot offer to send after a prospect expresses interest",
                    thumbnailColor: "#10b981",
                },
                {
                    name: "Cold Outreach — LinkedIn Short DM",
                    subject: "Quick question about {{company}}'s sales pipeline",
                    body: `<p>Hey {{firstName}},</p>
<p>Saw you're building {{company}}. Quick question: how does your team track your sales pipeline?</p>
<p>Most founders at your stage say "Google Sheets" or "Notion" — which works until it doesn't.</p>
<p>We built an AI-native CRM that auto-updates from calls, sends follow-ups, and runs your entire sales process on autopilot.</p>
<p>Looking for 5 startups to pilot this for 30 days. Free setup, founder pricing ($99/month flat) if you love it.</p>
<p>If you're doing 20+ sales calls/month and want to see what this looks like, happy to show you a quick demo.</p>
<p>—{{senderName}}</p>`,
                    category: "outreach",
                    description: "Short LinkedIn-style DM for cold outreach to founders",
                    thumbnailColor: "#0077b5",
                },
                {
                    name: "Post-Call — Thank You + Next Steps",
                    subject: "Great chatting, {{firstName}} — next steps",
                    body: `<p>Hey {{firstName}},</p>
<p>Thanks for taking the time to chat today — really enjoyed learning about what you're building at {{company}}.</p>
<p>Quick recap of what we discussed:</p>
<ul>
<li>Your current pipeline setup and the challenges your team is facing</li>
<li>How Clianta's AI auto-updates deals from calls, creates follow-ups, and eliminates CRM admin</li>
<li>The 30-day pilot program (free setup, founder pricing)</li>
</ul>
<p><strong>Next steps:</strong></p>
<ol>
<li>I'll send you the pilot agreement (takes 2 minutes to review)</li>
<li>We'll schedule a 30-minute kickoff call</li>
<li>I'll have your workspace set up within 48 hours</li>
</ol>
<p>If you have any questions in the meantime, just reply to this email.</p>
<p>Talk soon,<br>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Post-qualification-call email with recap and next steps",
                    thumbnailColor: "#8b5cf6",
                },
                {
                    name: "Cold Outreach — Meeting Request",
                    subject: "15 mins to fix {{company}}'s sales pipeline?",
                    body: `<p>Hey {{firstName}},</p>
<p>I know you're busy building {{company}}, so I'll keep this short.</p>
<p>We built an AI-native CRM that:</p>
<ul>
<li>Auto-updates deals from call transcripts (no manual logging)</li>
<li>Creates follow-up tasks and drafts emails automatically</li>
<li>Lets you chat with your pipeline: "Show me stalled deals" → instant answer</li>
</ul>
<p>I'm looking for 5 early-stage startups to pilot this for 30 days (free).</p>
<p>Do you have 15 minutes this week for a quick call? I'll show you the product and we can see if it's a fit for your team.</p>
<p>No pitch, no pressure — if it's not useful, I'll tell you.</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Short cold email requesting a 15-minute qualification call",
                    thumbnailColor: "#3b82f6",
                },
                {
                    name: "Cold Outreach — Post-Funding Congratulations",
                    subject: "Congrats on the raise, {{firstName}}! 🎉",
                    body: `<p>Hey {{firstName}},</p>
<p>Congrats on {{company}}'s recent funding round — that's awesome! 🎉</p>
<p>I'm reaching out because this is usually the moment when the spreadsheet-as-CRM approach starts breaking. You're hiring, scaling outreach, and suddenly "the Google Sheet" can't keep up.</p>
<p>We built an AI-native CRM for exactly this moment:</p>
<ul>
<li>AI auto-updates deals from every sales call</li>
<li>Follow-ups never get forgotten (AI creates tasks + drafts emails)</li>
<li>Chat-based: "Show me deals closing this month" → instant answer</li>
<li>Set up in 48 hours, not 48 days</li>
</ul>
<p>I'm running a 30-day pilot with 5 startup teams. Free setup, I do everything. Founder pricing ($99/month flat) if you love it.</p>
<p>Worth a 15-minute chat?</p>
<p>{{senderName}}</p>`,
                    category: "outreach",
                    description: "Cold outreach triggered by a company's recent funding announcement",
                    thumbnailColor: "#eab308",
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

        // Story 4.6 Issue #3 Fix: Invalidate workspace cache when template created
        clearWorkspaceCache();

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

        // Story 4.6 Issue #3 Fix: Invalidate workspace cache when template updated
        clearWorkspaceCache();

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

        // Story 4.6 Issue #3 Fix: Invalidate workspace cache when template deleted
        clearWorkspaceCache();

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

/**
 * POST /api/workspaces/:workspaceId/email-templates/modify-unlayer
 * Modify an existing Unlayer email template design using AI
 */
router.post("/:workspaceId/email-templates/modify-unlayer", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const { instruction, currentDesign, currentSubject } = req.body;

        if (!instruction || !instruction.trim()) {
            return res.status(400).json({
                success: false,
                error: "Modification instruction is required",
            });
        }

        if (!currentDesign) {
            return res.status(400).json({
                success: false,
                error: "Current template design is required",
            });
        }

        console.log("🤖 Modifying Unlayer template with AI:", { instruction: instruction.substring(0, 100) + "..." });
        const modifiedTemplate = await modifyUnlayerTemplate({
            currentDesign,
            currentSubject: currentSubject || "Untitled Email",
            instruction: instruction.trim(),
        });

        res.json({
            success: true,
            data: modifiedTemplate,
            message: "Template modified successfully",
        });
    } catch (error: any) {
        console.error("Unlayer AI modification error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to modify template with AI",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/email-templates/ai/status
 * Get AI service status and concurrency info
 */
router.get("/:workspaceId/email-templates/ai/status", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const stats = aiConcurrencyLimiter.getStats();
        res.json({
            success: true,
            data: {
                ...stats,
                available: stats.maxConcurrent - stats.running,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/modify
 * Intelligent AI modification with context awareness and conversation history
 */
router.post("/:workspaceId/email-templates/ai/modify", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const {
            instruction,
            currentDesign,
            currentSubject,
            sessionId,
            templateContext,
        } = req.body;

        if (!instruction || !instruction.trim()) {
            return res.status(400).json({
                success: false,
                error: "Instruction is required",
            });
        }

        if (!currentDesign) {
            return res.status(400).json({
                success: false,
                error: "Current template design is required",
            });
        }

        console.log("🧠 Intelligent AI modification:", {
            instruction: instruction.substring(0, 100) + "...",
            sessionId: sessionId || "new session",
            concurrency: aiConcurrencyLimiter.getStats(),
        });

        const result = await intelligentTemplateAI.modifyTemplate({
            sessionId,
            instruction: instruction.trim(),
            currentDesign,
            currentSubject: currentSubject || "Untitled Email",
            templateContext,
            userId, // Pass userId for per-user rate limiting
        });

        res.json({
            success: true,
            data: result,
            message: result.aiMessage,
        });
    } catch (error: any) {
        console.error("Intelligent AI modification error:", error);

        // Check if it's a rate limit error
        if (error.message.includes("Too many concurrent requests")) {
            return res.status(429).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: error.message || "Failed to process AI request",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/modify-stream
 * Streaming AI modification with real-time status updates
 */
router.post("/:workspaceId/email-templates/ai/modify-stream", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const {
            instruction,
            currentDesign,
            currentSubject,
            sessionId,
            templateContext,
        } = req.body;

        if (!instruction || !instruction.trim()) {
            return res.status(400).json({
                success: false,
                error: "Instruction is required",
            });
        }

        if (!currentDesign) {
            return res.status(400).json({
                success: false,
                error: "Current template design is required",
            });
        }

        console.log("🧠 Streaming AI modification:", {
            instruction: instruction.substring(0, 100) + "...",
            sessionId: sessionId || "new session",
        });

        // Set up SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        // Stream responses
        const stream = intelligentTemplateAI.modifyTemplateStream({
            sessionId,
            instruction: instruction.trim(),
            currentDesign,
            currentSubject: currentSubject || "Untitled Email",
            templateContext,
        });

        for await (const event of stream) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        res.write("data: [DONE]\n\n");
        res.end();
    } catch (error: any) {
        console.error("Streaming AI modification error:", error);
        res.write(`data: ${JSON.stringify({ type: "error", data: { message: error.message } })}\n\n`);
        res.end();
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/generate
 * Intelligent AI template generation
 */
router.post("/:workspaceId/email-templates/ai/generate", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const { prompt, templateContext } = req.body;

        if (!prompt || !prompt.trim()) {
            return res.status(400).json({
                success: false,
                error: "Prompt is required",
            });
        }

        console.log("🧠 Intelligent AI generation:", { prompt: prompt.substring(0, 100) + "..." });

        const result = await intelligentTemplateAI.generateTemplate(prompt.trim(), templateContext);

        res.json({
            success: true,
            data: result,
            message: result.aiMessage,
        });
    } catch (error: any) {
        console.error("Intelligent AI generation error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to generate template",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/analyze
 * Analyze template and get smart suggestions
 */
router.post("/:workspaceId/email-templates/ai/analyze", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const { currentDesign, templateContext } = req.body;

        if (!currentDesign) {
            return res.status(400).json({
                success: false,
                error: "Template design is required",
            });
        }

        console.log("🔍 Analyzing template for suggestions");

        const suggestions = await intelligentTemplateAI.analyzeDesign(currentDesign, {
            templateId: templateContext?.templateId || "unknown",
            templateName: templateContext?.templateName || "Email Template",
            templateSubject: templateContext?.templateSubject || "Untitled",
            templateCategory: templateContext?.templateCategory || "custom",
        });

        res.json({
            success: true,
            data: { suggestions },
        });
    } catch (error: any) {
        console.error("AI analyze error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to analyze template",
        });
    }
});

/**
 * GET /api/workspaces/:workspaceId/email-templates/ai/session/:sessionId
 * Get conversation history for a session
 */
router.get("/:workspaceId/email-templates/ai/session/:sessionId", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, sessionId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const history = intelligentTemplateAI.getConversationHistory(sessionId);

        res.json({
            success: true,
            data: { history },
        });
    } catch (error: any) {
        console.error("Get session error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to get session",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/session/:sessionId/undo
 * Undo to a previous state in the conversation
 */
router.post("/:workspaceId/email-templates/ai/session/:sessionId/undo", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, sessionId } = req.params;
        const userId = (req.user?._id as any)?.toString();
        const { messageIndex } = req.body;

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const design = intelligentTemplateAI.undoToMessage(sessionId, messageIndex ?? -1);

        if (!design) {
            return res.status(404).json({
                success: false,
                error: "Session not found",
            });
        }

        res.json({
            success: true,
            data: { design },
            message: "Reverted to previous state",
        });
    } catch (error: any) {
        console.error("Undo error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to undo",
        });
    }
});

/**
 * POST /api/workspaces/:workspaceId/email-templates/ai/session/:sessionId/reset
 * Reset to original design
 */
router.post("/:workspaceId/email-templates/ai/session/:sessionId/reset", authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const { workspaceId, sessionId } = req.params;
        const userId = (req.user?._id as any)?.toString();

        if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

        const design = intelligentTemplateAI.resetToOriginal(sessionId);

        if (!design) {
            return res.status(404).json({
                success: false,
                error: "Session not found",
            });
        }

        res.json({
            success: true,
            data: { design },
            message: "Reset to original design",
        });
    } catch (error: any) {
        console.error("Reset error:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Failed to reset",
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

