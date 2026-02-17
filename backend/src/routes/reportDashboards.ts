/**
 * Report Dashboard CRUD Routes
 * 
 * Manages user-created dashboards containing report widgets.
 * Modeled after Attio CRM's dashboard/report system.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import ReportDashboard, { IReportWidget, ReportType, ChartType } from "../models/ReportDashboard";
import Project from "../models/Project";
import { Types } from "mongoose";

const router = Router();

// ─── Helpers ───────────────────────────────────────────────────

async function validateWorkspaceAccess(workspaceId: string, userId: string, res: Response): Promise<boolean> {
    const project = await Project.findOne({
        _id: workspaceId,
        $or: [{ userId }, { "team.userId": userId }],
    });
    if (!project) {
        res.status(403).json({ error: "Access denied" });
        return false;
    }
    return true;
}

// Default dashboard templates seeded on first visit
const DEFAULT_DASHBOARDS = [
    {
        name: "Sales Overview",
        description: "Pipeline health, revenue trends, and team performance",
        reports: [
            { type: "insight" as ReportType, title: "Total Pipeline Value", chartType: "number" as ChartType, config: { metric: "pipeline_value" }, position: { x: 0, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Win Rate", chartType: "number" as ChartType, config: { metric: "win_rate" }, position: { x: 1, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Open Deals", chartType: "number" as ChartType, config: { metric: "open_deals" }, position: { x: 2, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Revenue Won", chartType: "number" as ChartType, config: { metric: "revenue_won" }, position: { x: 3, y: 0, w: 1, h: 1 } },
            { type: "funnel" as ReportType, title: "Pipeline Funnel", chartType: "funnel" as ChartType, config: {}, position: { x: 0, y: 1, w: 2, h: 2 } },
            { type: "historical" as ReportType, title: "Revenue Trend", chartType: "line" as ChartType, config: { metric: "revenue", period: "6months" }, position: { x: 2, y: 1, w: 2, h: 2 } },
        ],
    },
    {
        name: "Email Performance",
        description: "Email engagement metrics and team activity",
        reports: [
            { type: "insight" as ReportType, title: "Emails Sent", chartType: "number" as ChartType, config: { metric: "emails_sent" }, position: { x: 0, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Open Rate", chartType: "number" as ChartType, config: { metric: "open_rate" }, position: { x: 1, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Click Rate", chartType: "number" as ChartType, config: { metric: "click_rate" }, position: { x: 2, y: 0, w: 1, h: 1 } },
            { type: "insight" as ReportType, title: "Reply Rate", chartType: "number" as ChartType, config: { metric: "reply_rate" }, position: { x: 3, y: 0, w: 1, h: 1 } },
            { type: "email" as ReportType, title: "Email Activity", chartType: "bar" as ChartType, config: { groupBy: "day" }, position: { x: 0, y: 1, w: 2, h: 2 } },
            { type: "top_performers" as ReportType, title: "Top Senders", chartType: "table" as ChartType, config: { metric: "emails" }, position: { x: 2, y: 1, w: 2, h: 2 } },
        ],
    },
    {
        name: "Pipeline Health",
        description: "Deal flow, bottlenecks, and forecasting",
        reports: [
            { type: "funnel" as ReportType, title: "Conversion Funnel", chartType: "funnel" as ChartType, config: {}, position: { x: 0, y: 0, w: 2, h: 2 } },
            { type: "time_in_stage" as ReportType, title: "Time in Stage", chartType: "bar" as ChartType, config: { metric: "avg" }, position: { x: 2, y: 0, w: 2, h: 2 } },
            { type: "forecast" as ReportType, title: "Revenue Forecast", chartType: "bar" as ChartType, config: { period: "quarter" }, position: { x: 0, y: 2, w: 2, h: 2 } },
            { type: "at_risk" as ReportType, title: "At-Risk Deals", chartType: "table" as ChartType, config: { inactiveDays: 14 }, position: { x: 2, y: 2, w: 2, h: 2 } },
        ],
    },
    {
        name: "Advanced Email Intelligence",
        description: "Cross-entity email insights: revenue attribution, lifecycle impact, and engagement health",
        reports: [
            // Row 1: Revenue & Lifecycle
            { type: "email_revenue_attribution" as ReportType, title: "Email → Revenue Attribution", chartType: "bar" as ChartType, config: { period: "30days" }, position: { x: 0, y: 0, w: 4, h: 3 } },
            { type: "email_lifecycle_acceleration" as ReportType, title: "Email → Lifecycle Acceleration", chartType: "bar" as ChartType, config: { period: "90days" }, position: { x: 4, y: 0, w: 4, h: 3 } },

            // Row 2: Campaign & Sequence Analysis
            { type: "campaign_comparison" as ReportType, title: "Campaign A/B Comparison", chartType: "bar" as ChartType, config: {}, position: { x: 0, y: 3, w: 6, h: 3 } },
            { type: "sequence_step_funnel" as ReportType, title: "Sequence Drop-Off Funnel", chartType: "bar" as ChartType, config: {}, position: { x: 6, y: 3, w: 6, h: 3 } },

            // Row 3: Health & Decay
            { type: "deliverability_health" as ReportType, title: "Deliverability Health Score", chartType: "bar" as ChartType, config: { period: "30days" }, position: { x: 0, y: 6, w: 4, h: 3 } },
            { type: "engagement_decay" as ReportType, title: "At-Risk Contacts (Declining Engagement)", chartType: "table" as ChartType, config: { period: "60days" }, position: { x: 4, y: 6, w: 8, h: 4 } },
        ],
    },
];

// ─── CRUD Routes ───────────────────────────────────────────────

/**
 * GET /api/workspaces/:workspaceId/report-dashboards
 * List all dashboards. Seeds defaults on first visit.
 */
router.get(
    "/:workspaceId/report-dashboards",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            let dashboards = await ReportDashboard.find({ workspaceId })
                .sort({ isFavorite: -1, createdAt: -1 })
                .lean();

            // Seed defaults on first visit
            if (dashboards.length === 0) {
                const seeded = await ReportDashboard.insertMany(
                    DEFAULT_DASHBOARDS.map((d) => ({
                        workspaceId,
                        name: d.name,
                        description: d.description,
                        reports: d.reports,
                        isDefault: true,
                        createdBy: userId,
                    }))
                );
                dashboards = seeded.map((s) => s.toObject());
            }

            res.json({ dashboards });
        } catch (error) {
            console.error("Error listing report dashboards:", error);
            res.status(500).json({ error: "Failed to list dashboards" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/migrate-advanced
 * Migration endpoint: Adds "Advanced Email Intelligence" dashboard if it doesn't exist
 */
router.post(
    "/:workspaceId/report-dashboards/migrate-advanced",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            // Check if "Advanced Email Intelligence" dashboard already exists
            const existingDashboard = await ReportDashboard.findOne({
                workspaceId,
                name: "Advanced Email Intelligence",
            });

            if (existingDashboard) {
                return res.json({
                    message: "Advanced Email Intelligence dashboard already exists",
                    dashboard: existingDashboard
                });
            }

            // Create the new dashboard
            const advancedDashboard = {
                name: "Advanced Email Intelligence",
                description: "Cross-entity email insights: revenue attribution, lifecycle impact, and engagement health",
                reports: [
                    // Row 1: Revenue & Lifecycle
                    { type: "email_revenue_attribution" as ReportType, title: "Email → Revenue Attribution", chartType: "bar" as ChartType, config: { period: "30days" }, position: { x: 0, y: 0, w: 4, h: 3 } },
                    { type: "email_lifecycle_acceleration" as ReportType, title: "Email → Lifecycle Acceleration", chartType: "bar" as ChartType, config: { period: "90days" }, position: { x: 4, y: 0, w: 4, h: 3 } },

                    // Row 2: Campaign & Sequence Analysis
                    { type: "campaign_comparison" as ReportType, title: "Campaign A/B Comparison", chartType: "bar" as ChartType, config: {}, position: { x: 0, y: 3, w: 6, h: 3 } },
                    { type: "sequence_step_funnel" as ReportType, title: "Sequence Drop-Off Funnel", chartType: "bar" as ChartType, config: {}, position: { x: 6, y: 3, w: 6, h: 3 } },

                    // Row 3: Health & Decay
                    { type: "deliverability_health" as ReportType, title: "Deliverability Health Score", chartType: "bar" as ChartType, config: { period: "30days" }, position: { x: 0, y: 6, w: 4, h: 3 } },
                    { type: "engagement_decay" as ReportType, title: "At-Risk Contacts (Declining Engagement)", chartType: "table" as ChartType, config: { period: "60days" }, position: { x: 4, y: 6, w: 8, h: 4 } },
                ],
            };

            const dashboard = await ReportDashboard.create({
                workspaceId,
                name: advancedDashboard.name,
                description: advancedDashboard.description,
                reports: advancedDashboard.reports,
                isDefault: true,
                createdBy: userId,
            });

            res.status(201).json({
                message: "Advanced Email Intelligence dashboard created successfully",
                dashboard
            });
        } catch (error) {
            console.error("Error migrating advanced dashboard:", error);
            res.status(500).json({ error: "Failed to migrate dashboard" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards
 * Create a new dashboard.
 */
router.post(
    "/:workspaceId/report-dashboards",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { name, description } = req.body;
            if (!name?.trim()) {
                return res.status(400).json({ error: "Dashboard name is required" });
            }

            const dashboard = await ReportDashboard.create({
                workspaceId,
                name: name.trim(),
                description: description?.trim() || "",
                reports: [],
                createdBy: userId,
            });

            res.status(201).json({ dashboard });
        } catch (error) {
            console.error("Error creating dashboard:", error);
            res.status(500).json({ error: "Failed to create dashboard" });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/report-dashboards/:id
 * Get a single dashboard with its reports.
 */
router.get(
    "/:workspaceId/report-dashboards/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const dashboard = await ReportDashboard.findOne({ _id: id, workspaceId }).lean();
            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error getting dashboard:", error);
            res.status(500).json({ error: "Failed to get dashboard" });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/report-dashboards/:id
 * Update dashboard (name, description, favorite, report order).
 */
router.put(
    "/:workspaceId/report-dashboards/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const updates: Record<string, any> = {};
            if (req.body.name !== undefined) updates.name = req.body.name.trim();
            if (req.body.description !== undefined) updates.description = req.body.description;
            if (req.body.isFavorite !== undefined) updates.isFavorite = req.body.isFavorite;
            if (req.body.reports !== undefined) updates.reports = req.body.reports;

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { $set: updates },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error updating dashboard:", error);
            res.status(500).json({ error: "Failed to update dashboard" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-dashboards/:id
 * Delete a dashboard.
 */
router.delete(
    "/:workspaceId/report-dashboards/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const result = await ReportDashboard.findOneAndDelete({ _id: id, workspaceId });
            if (!result) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting dashboard:", error);
            res.status(500).json({ error: "Failed to delete dashboard" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/reports
 * Add a report widget to a dashboard.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/reports",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { type, title, chartType, config, position, definition } = req.body;
            if (!type || !title || !chartType) {
                return res.status(400).json({ error: "type, title, and chartType are required" });
            }

            // Validate definition structure if provided
            if (definition) {
                if (!definition.source || !definition.type || !definition.metric) {
                    return res.status(400).json({
                        error: "definition must include source, type, and metric"
                    });
                }

                // Validate metric structure
                if (!definition.metric.aggregation) {
                    return res.status(400).json({
                        error: "definition.metric must include aggregation"
                    });
                }

                // Validate metric field is present for non-count aggregations
                if (definition.metric.aggregation !== "count" && !definition.metric.field) {
                    return res.status(400).json({
                        error: "definition.metric.field is required for aggregations other than count"
                    });
                }
            }

            const report: IReportWidget = {
                type,
                title: title.trim(),
                chartType,
                config: config || {},
                definition,  // Include definition if provided
                position: position || { x: 0, y: 0, w: 2, h: 1 },
            };

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { $push: { reports: report } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.status(201).json({ dashboard });
        } catch (error) {
            console.error("Error adding report:", error);
            res.status(500).json({ error: "Failed to add report" });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/report-dashboards/:id/reports/:reportId
 * Update a report widget in a dashboard.
 */
router.put(
    "/:workspaceId/report-dashboards/:id/reports/:reportId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, reportId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { type, title, chartType, config, definition, position, note } = req.body;

            // Build partial $set — only update fields that are provided
            const setFields: Record<string, any> = {};
            if (type !== undefined) setFields["reports.$.type"] = type;
            if (title !== undefined) setFields["reports.$.title"] = title.trim();
            if (chartType !== undefined) setFields["reports.$.chartType"] = chartType;
            if (config !== undefined) setFields["reports.$.config"] = config;
            if (definition !== undefined) setFields["reports.$.definition"] = definition;
            if (position !== undefined) setFields["reports.$.position"] = position;
            if (note !== undefined) setFields["reports.$.note"] = note;

            // Validate required fields only if they are being updated
            if (definition) {
                if (!definition.source || !definition.type || !definition.metric) {
                    return res.status(400).json({ error: "definition must include source, type, and metric" });
                }
                if (!definition.metric.aggregation) {
                    return res.status(400).json({ error: "definition.metric must include aggregation" });
                }
                if (definition.metric.aggregation !== "count" && !definition.metric.field) {
                    return res.status(400).json({ error: "definition.metric.field is required for aggregations other than count" });
                }
            }

            if (Object.keys(setFields).length === 0) {
                return res.status(400).json({ error: "No fields to update" });
            }

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId, "reports._id": reportId },
                {
                    $set: setFields,
                },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard or report not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error updating report:", error);
            res.status(500).json({ error: "Failed to update report" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/reports/:reportId/duplicate
 * Duplicate a report widget (to same or different dashboard).
 */
router.post(
    "/:workspaceId/report-dashboards/:id/reports/:reportId/duplicate",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, reportId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { targetDashboardId } = req.body;
            const targetId = targetDashboardId || id;

            // Find the source dashboard and report
            const sourceDashboard = await ReportDashboard.findOne({ _id: id, workspaceId }).lean();
            if (!sourceDashboard) {
                return res.status(404).json({ error: "Source dashboard not found" });
            }

            const sourceReport = sourceDashboard.reports?.find(
                (r: any) => r._id?.toString() === reportId
            );
            if (!sourceReport) {
                return res.status(404).json({ error: "Report not found" });
            }

            // Create a copy (new _id will be auto-generated by MongoDB)
            const duplicatedReport: IReportWidget = {
                type: sourceReport.type,
                title: `${sourceReport.title} (Copy)`,
                chartType: sourceReport.chartType,
                config: JSON.parse(JSON.stringify(sourceReport.config || {})),
                definition: sourceReport.definition ? JSON.parse(JSON.stringify(sourceReport.definition)) : undefined,
                position: {
                    x: (sourceReport.position?.x || 0),
                    y: (sourceReport.position?.y || 0) + (sourceReport.position?.h || 1),
                    w: sourceReport.position?.w || 2,
                    h: sourceReport.position?.h || 1,
                },
            };

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: targetId, workspaceId },
                { $push: { reports: duplicatedReport } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Target dashboard not found" });
            }

            res.status(201).json({ dashboard });
        } catch (error) {
            console.error("Error duplicating report:", error);
            res.status(500).json({ error: "Failed to duplicate report" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-dashboards/:id/reports/:reportId
 * Remove a report widget from a dashboard.
 */
router.delete(
    "/:workspaceId/report-dashboards/:id/reports/:reportId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, reportId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { $pull: { reports: { _id: reportId } } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error removing report:", error);
            res.status(500).json({ error: "Failed to remove report" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/clone
 * Clone an entire dashboard with all its widgets.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/clone",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const source = await ReportDashboard.findOne({ _id: id, workspaceId }).lean();
            if (!source) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            // Deep-copy reports, stripping _id so new IDs are generated
            const clonedReports = (source.reports || []).map((r: any) => {
                const { _id, ...rest } = r;
                return {
                    ...rest,
                    config: JSON.parse(JSON.stringify(rest.config || {})),
                    definition: rest.definition ? JSON.parse(JSON.stringify(rest.definition)) : undefined,
                };
            });

            const dashboard = await ReportDashboard.create({
                workspaceId,
                name: `${source.name} (Copy)`,
                description: source.description || "",
                reports: clonedReports,
                createdBy: userId,
            });

            res.status(201).json({ dashboard });
        } catch (error) {
            console.error("Error cloning dashboard:", error);
            res.status(500).json({ error: "Failed to clone dashboard" });
        }
    }
);

// ─── P1: Saved Filter Presets ──────────────────────────────────

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/filter-presets
 * Save current filters as a named preset.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/filter-presets",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { name, filters, dateRange } = req.body;
            if (!name || !filters) {
                return res.status(400).json({ error: "name and filters are required" });
            }

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { $push: { savedFilterPresets: { name, filters, dateRange } } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error saving filter preset:", error);
            res.status(500).json({ error: "Failed to save filter preset" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-dashboards/:id/filter-presets/:presetId
 * Remove a saved filter preset.
 */
router.delete(
    "/:workspaceId/report-dashboards/:id/filter-presets/:presetId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, presetId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { $pull: { savedFilterPresets: { _id: presetId } } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error removing filter preset:", error);
            res.status(500).json({ error: "Failed to remove filter preset" });
        }
    }
);

// ─── P1: Report Templates ─────────────────────────────────────

import ReportTemplate from "../models/ReportTemplate";

/**
 * GET /api/workspaces/:workspaceId/report-templates
 * List all saved report templates.
 */
router.get(
    "/:workspaceId/report-templates",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const templates = await ReportTemplate.find({ workspaceId })
                .sort({ createdAt: -1 })
                .lean();

            res.json({ templates });
        } catch (error) {
            console.error("Error listing templates:", error);
            res.status(500).json({ error: "Failed to list templates" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-templates
 * Save a widget configuration as a reusable template.
 */
router.post(
    "/:workspaceId/report-templates",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { name, description, type, chartType, config, definition } = req.body;
            if (!name || !type || !chartType) {
                return res.status(400).json({ error: "name, type, and chartType are required" });
            }

            const template = await ReportTemplate.create({
                workspaceId,
                name,
                description,
                type,
                chartType,
                config: config || {},
                definition,
                createdBy: userId,
            });

            res.status(201).json({ template });
        } catch (error) {
            console.error("Error creating template:", error);
            res.status(500).json({ error: "Failed to create template" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-templates/:templateId
 * Delete a saved template.
 */
router.delete(
    "/:workspaceId/report-templates/:templateId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, templateId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const deleted = await ReportTemplate.findOneAndDelete({
                _id: templateId,
                workspaceId,
            });

            if (!deleted) {
                return res.status(404).json({ error: "Template not found" });
            }

            res.json({ success: true });
        } catch (error) {
            console.error("Error deleting template:", error);
            res.status(500).json({ error: "Failed to delete template" });
        }
    }
);

// ─── P1: Shareable Dashboard Link ─────────────────────────────

import { randomBytes } from "crypto";

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/share
 * Generate or revoke a share token.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/share",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { action } = req.body; // "generate" or "revoke"

            if (action === "revoke") {
                const dashboard = await ReportDashboard.findOneAndUpdate(
                    { _id: id, workspaceId },
                    { $unset: { shareToken: 1 }, isPublic: false },
                    { new: true }
                ).lean();
                return res.json({ dashboard, shareToken: null });
            }

            // Generate new share token
            const shareToken = randomBytes(24).toString("hex");
            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { shareToken, isPublic: true },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard, shareToken });
        } catch (error) {
            console.error("Error sharing dashboard:", error);
            res.status(500).json({ error: "Failed to share dashboard" });
        }
    }
);

/**
 * GET /api/shared/dashboards/:token
 * Public access to a shared dashboard (no auth required).
 */
router.get(
    "/shared/dashboards/:token",
    async (req: any, res: Response) => {
        try {
            const { token } = req.params;

            const dashboard = await ReportDashboard.findOne({
                shareToken: token,
                isPublic: true,
            }).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found or link has been revoked" });
            }

            // Return read-only dashboard data
            res.json({
                dashboard: {
                    _id: dashboard._id,
                    name: dashboard.name,
                    description: dashboard.description,
                    reports: dashboard.reports,
                },
            });
        } catch (error) {
            console.error("Error accessing shared dashboard:", error);
            res.status(500).json({ error: "Failed to access shared dashboard" });
        }
    }
);

// ─── P1: Dashboard Access Permissions ─────────────────────────

/**
 * PUT /api/workspaces/:workspaceId/report-dashboards/:id/access
 * Update dashboard access permissions.
 */
router.put(
    "/:workspaceId/report-dashboards/:id/access",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { type, allowedUsers } = req.body;

            // Validate access type
            if (!["private", "team", "workspace"].includes(type)) {
                return res.status(400).json({ error: "type must be private, team, or workspace" });
            }

            const dashboard = await ReportDashboard.findOneAndUpdate(
                { _id: id, workspaceId },
                { access: { type, allowedUsers: allowedUsers || [] } },
                { new: true }
            ).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found" });
            }

            res.json({ dashboard });
        } catch (error) {
            console.error("Error updating access:", error);
            res.status(500).json({ error: "Failed to update access" });
        }
    }
);

// ─── P1: Report Custom Field Definitions for Filtering ────────

/**
 * GET /api/workspaces/:workspaceId/report-custom-fields
 * Returns all custom field definitions across entity types for the filter picker.
 */
router.get(
    "/:workspaceId/report-custom-fields",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const CustomFieldDefinition = (await import("../models/CustomFieldDefinition")).default;
            const fields = await CustomFieldDefinition.find({
                workspaceId,
                isActive: true,
            })
                .sort({ entityType: 1, order: 1 })
                .lean();

            res.json({
                success: true,
                data: fields.map((f: any) => ({
                    _id: f._id,
                    entityType: f.entityType,
                    fieldKey: f.fieldKey,
                    fieldLabel: f.fieldLabel,
                    fieldType: f.fieldType,
                    selectOptions: f.selectOptions || [],
                })),
            });
        } catch (error) {
            console.error("Error fetching custom field definitions:", error);
            res.status(500).json({ error: "Failed to fetch custom fields" });
        }
    }
);

// ─── P1: Scheduled Email Subscriptions ─────────────────────────

/**
 * GET /api/workspaces/:workspaceId/report-dashboards/:id/subscriptions
 * List all subscriptions for a dashboard.
 */
router.get(
    "/:workspaceId/report-dashboards/:id/subscriptions",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any)?.toString();
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const ReportSubscription = (await import("../models/ReportSubscription")).default;
            const subscriptions = await ReportSubscription.find({
                workspaceId,
                dashboardId: id,
            })
                .sort({ createdAt: -1 })
                .lean();

            res.json({ success: true, data: subscriptions });
        } catch (error) {
            console.error("Error fetching subscriptions:", error);
            res.status(500).json({ error: "Failed to fetch subscriptions" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/subscriptions
 * Create a new email subscription.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/subscriptions",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = (req.user?._id as any)?.toString();
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { frequency, dayOfWeek, dayOfMonth, timeOfDay, timezone, recipients, subject, message, format } = req.body;

            if (!frequency || !recipients || recipients.length === 0) {
                return res.status(400).json({ error: "Frequency and at least one recipient are required" });
            }

            const ReportSubscription = (await import("../models/ReportSubscription")).default;

            // Calculate next run
            const now = new Date();
            let nextRunAt = new Date(now);
            const [hours, minutes] = (timeOfDay || "08:00").split(":").map(Number);
            nextRunAt.setHours(hours, minutes, 0, 0);
            if (nextRunAt <= now) {
                nextRunAt.setDate(nextRunAt.getDate() + 1);
            }

            const subscription = await ReportSubscription.create({
                workspaceId,
                dashboardId: id,
                createdBy: userId,
                frequency,
                dayOfWeek,
                dayOfMonth,
                timeOfDay: timeOfDay || "08:00",
                timezone: timezone || "UTC",
                recipients,
                subject,
                message,
                format: format || "pdf",
                isActive: true,
                nextRunAt,
            });

            res.status(201).json({ success: true, data: subscription });
        } catch (error) {
            console.error("Error creating subscription:", error);
            res.status(500).json({ error: "Failed to create subscription" });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/report-dashboards/:id/subscriptions/:subId
 * Update a subscription (toggle active, change schedule, etc.).
 */
router.put(
    "/:workspaceId/report-dashboards/:id/subscriptions/:subId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, subId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const ReportSubscription = (await import("../models/ReportSubscription")).default;
            const subscription = await ReportSubscription.findOneAndUpdate(
                { _id: subId, workspaceId, dashboardId: id },
                { $set: req.body },
                { new: true }
            ).lean();

            if (!subscription) {
                return res.status(404).json({ error: "Subscription not found" });
            }

            res.json({ success: true, data: subscription });
        } catch (error) {
            console.error("Error updating subscription:", error);
            res.status(500).json({ error: "Failed to update subscription" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-dashboards/:id/subscriptions/:subId
 * Delete a subscription.
 */
router.delete(
    "/:workspaceId/report-dashboards/:id/subscriptions/:subId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, subId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            if (!(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const ReportSubscription = (await import("../models/ReportSubscription")).default;
            const deleted = await ReportSubscription.findOneAndDelete({
                _id: subId,
                workspaceId,
                dashboardId: id,
            });

            if (!deleted) {
                return res.status(404).json({ error: "Subscription not found" });
            }

            res.json({ success: true, message: "Subscription deleted" });
        } catch (error) {
            console.error("Error deleting subscription:", error);
            res.status(500).json({ error: "Failed to delete subscription" });
        }
    }
);

// ─── P2: Embed Dashboard ──────────────────────────────────────

/**
 * GET /api/shared/embed/:token
 * Public access to an embeddable dashboard (no auth required).
 * Returns lightweight data optimized for iframe embedding.
 */
router.get(
    "/shared/embed/:token",
    async (req: any, res: Response) => {
        try {
            const { token } = req.params;

            const dashboard = await ReportDashboard.findOne({
                shareToken: token,
                isPublic: true,
            }).lean();

            if (!dashboard) {
                return res.status(404).json({ error: "Dashboard not found or link has been revoked" });
            }

            // Return read-only, embed-optimized dashboard data
            res.json({
                dashboard: {
                    _id: dashboard._id,
                    name: dashboard.name,
                    description: dashboard.description,
                    reports: dashboard.reports,
                    tabs: dashboard.tabs,
                },
                embed: true,
            });
        } catch (error) {
            console.error("Error accessing embed dashboard:", error);
            res.status(500).json({ error: "Failed to access embed dashboard" });
        }
    }
);

// ─── P2: Widget Comments ──────────────────────────────────────

import ReportComment from "../models/ReportComment";

/**
 * GET /api/workspaces/:workspaceId/report-dashboards/:id/comments
 * List comments for a widget (pass ?widgetId=xxx).
 */
router.get(
    "/:workspaceId/report-dashboards/:id/comments",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const { widgetId } = req.query;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const filter: any = { workspaceId, dashboardId: id };
            if (widgetId) filter.widgetId = widgetId;

            const comments = await ReportComment.find(filter)
                .sort({ createdAt: -1 })
                .limit(100)
                .populate("userId", "name email avatar")
                .populate("mentions", "name email")
                .lean();

            res.json({ comments });
        } catch (error) {
            console.error("Error listing comments:", error);
            res.status(500).json({ error: "Failed to list comments" });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/report-dashboards/:id/comments
 * Create a comment on a widget.
 */
router.post(
    "/:workspaceId/report-dashboards/:id/comments",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const { widgetId, text, mentions } = req.body;
            if (!widgetId || !text?.trim()) {
                return res.status(400).json({ error: "widgetId and text are required" });
            }

            const comment = await ReportComment.create({
                workspaceId,
                dashboardId: id,
                widgetId,
                userId,
                text: text.trim(),
                mentions: mentions || [],
            });

            // Populate user info before returning
            const populated = await ReportComment.findById(comment._id)
                .populate("userId", "name email avatar")
                .populate("mentions", "name email")
                .lean();

            res.status(201).json({ comment: populated });
        } catch (error) {
            console.error("Error creating comment:", error);
            res.status(500).json({ error: "Failed to create comment" });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/report-dashboards/:id/comments/:commentId
 * Delete own comment.
 */
router.delete(
    "/:workspaceId/report-dashboards/:id/comments/:commentId",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id, commentId } = req.params;
            const userId = req.user?._id?.toString();
            if (!userId || !(await validateWorkspaceAccess(workspaceId, userId, res))) return;

            const deleted = await ReportComment.findOneAndDelete({
                _id: commentId,
                dashboardId: id,
                userId, // Only allow deleting own comments
            });

            if (!deleted) {
                return res.status(404).json({ error: "Comment not found or not authorized" });
            }

            res.json({ success: true, message: "Comment deleted" });
        } catch (error) {
            console.error("Error deleting comment:", error);
            res.status(500).json({ error: "Failed to delete comment" });
        }
    }
);

export default router;

