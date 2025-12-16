import express, { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import Report from "../models/Report";
import Forecast from "../models/Forecast";
import Opportunity from "../models/Opportunity";

const router: Router = express.Router();

/**
 * Report and Forecast Routes
 * 
 * Custom reports and sales forecasting
 * Base path: /api/workspaces/:workspaceId/reports
 */

// ============= REPORTS =============

// Get all reports
router.get(
    "/:workspaceId/reports",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;

            const reports = await Report.find({
                workspaceId: new Types.ObjectId(workspaceId),
                $or: [
                    { createdBy: new Types.ObjectId(userId) },
                    { isPublic: true },
                    { sharedWith: new Types.ObjectId(userId) },
                ],
            })
                .populate("createdBy", "name email")
                .sort({ updatedAt: -1 });

            res.json({
                success: true,
                data: reports,
            });
        } catch (error: any) {
            console.error("Error getting reports:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get reports",
            });
        }
    }
);

// Get single report
router.get(
    "/:workspaceId/reports/:reportId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, reportId } = req.params;

            const report = await Report.findOne({
                _id: new Types.ObjectId(reportId),
                workspaceId: new Types.ObjectId(workspaceId),
            }).populate("createdBy", "name email");

            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: "Report not found",
                });
            }

            res.json({
                success: true,
                data: report,
            });
        } catch (error: any) {
            console.error("Error getting report:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get report",
            });
        }
    }
);

// Create report
router.post(
    "/:workspaceId/reports",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;

            const report = new Report({
                workspaceId: new Types.ObjectId(workspaceId),
                createdBy: new Types.ObjectId(userId),
                ...req.body,
            });

            await report.save();

            res.status(201).json({
                success: true,
                data: report,
                message: "Report created successfully",
            });
        } catch (error: any) {
            console.error("Error creating report:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create report",
            });
        }
    }
);

// Update report
router.put(
    "/:workspaceId/reports/:reportId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, reportId } = req.params;

            const report = await Report.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(reportId),
                    workspaceId: new Types.ObjectId(workspaceId),
                },
                req.body,
                { new: true }
            );

            if (!report) {
                return res.status(404).json({
                    success: false,
                    error: "Report not found",
                });
            }

            res.json({
                success: true,
                data: report,
                message: "Report updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating report:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update report",
            });
        }
    }
);

// Delete report
router.delete(
    "/:workspaceId/reports/:reportId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, reportId } = req.params;

            const result = await Report.deleteOne({
                _id: new Types.ObjectId(reportId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Report not found",
                });
            }

            res.json({
                success: true,
                message: "Report deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting report:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete report",
            });
        }
    }
);

// ============= FORECASTS =============

// Get forecasts
router.get(
    "/:workspaceId/forecasts",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const forecasts = await Forecast.find({
                workspaceId: new Types.ObjectId(workspaceId),
            })
                .populate("createdBy", "name email")
                .sort({ startDate: -1 });

            res.json({
                success: true,
                data: forecasts,
            });
        } catch (error: any) {
            console.error("Error getting forecasts:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get forecasts",
            });
        }
    }
);

// Get single forecast
router.get(
    "/:workspaceId/forecasts/:forecastId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, forecastId } = req.params;

            const forecast = await Forecast.findOne({
                _id: new Types.ObjectId(forecastId),
                workspaceId: new Types.ObjectId(workspaceId),
            })
                .populate("createdBy", "name email")
                .populate("entries.userId", "name email");

            if (!forecast) {
                return res.status(404).json({
                    success: false,
                    error: "Forecast not found",
                });
            }

            res.json({
                success: true,
                data: forecast,
            });
        } catch (error: any) {
            console.error("Error getting forecast:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get forecast",
            });
        }
    }
);

// Create forecast
router.post(
    "/:workspaceId/forecasts",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;

            const forecast = new Forecast({
                workspaceId: new Types.ObjectId(workspaceId),
                createdBy: new Types.ObjectId(userId),
                ...req.body,
            });

            await forecast.save();

            res.status(201).json({
                success: true,
                data: forecast,
                message: "Forecast created successfully",
            });
        } catch (error: any) {
            console.error("Error creating forecast:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create forecast",
            });
        }
    }
);

// Update forecast
router.put(
    "/:workspaceId/forecasts/:forecastId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, forecastId } = req.params;

            const forecast = await Forecast.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(forecastId),
                    workspaceId: new Types.ObjectId(workspaceId),
                },
                req.body,
                { new: true }
            );

            if (!forecast) {
                return res.status(404).json({
                    success: false,
                    error: "Forecast not found",
                });
            }

            res.json({
                success: true,
                data: forecast,
                message: "Forecast updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating forecast:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update forecast",
            });
        }
    }
);

// Get pipeline forecast (auto-calculated from opportunities)
router.get(
    "/:workspaceId/forecast/pipeline",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            // Get all open opportunities
            const opportunities = await Opportunity.find({
                workspaceId: new Types.ObjectId(workspaceId),
                status: "open",
            });

            // Calculate forecast based on deal probability
            let committed = 0; // 80%+ probability
            let bestCase = 0; // 50-79% probability
            let pipeline = 0; // All open

            for (const opp of opportunities) {
                const value = opp.value || 0;
                const probability = opp.probability || 0;

                pipeline += value;

                if (probability >= 80) {
                    committed += value;
                } else if (probability >= 50) {
                    bestCase += value;
                }
            }

            // Get closed won this period
            const closedWon = await Opportunity.aggregate([
                {
                    $match: {
                        workspaceId: new Types.ObjectId(workspaceId),
                        status: "won",
                        closedAt: {
                            $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: "$value" },
                    },
                },
            ]);

            res.json({
                success: true,
                data: {
                    pipeline,
                    committed,
                    bestCase,
                    closed: closedWon[0]?.total || 0,
                    dealCount: opportunities.length,
                },
            });
        } catch (error: any) {
            console.error("Error getting pipeline forecast:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get pipeline forecast",
            });
        }
    }
);

export default router;
