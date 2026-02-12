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

            const { type, title, chartType, config, position } = req.body;
            if (!type || !title || !chartType) {
                return res.status(400).json({ error: "type, title, and chartType are required" });
            }

            const report: IReportWidget = {
                type,
                title: title.trim(),
                chartType,
                config: config || {},
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

export default router;
