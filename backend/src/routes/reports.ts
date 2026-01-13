import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import Contact from "../models/Contact";
import Company from "../models/Company";
import Opportunity from "../models/Opportunity";
import Task from "../models/Task";
import Ticket from "../models/Ticket";
import Campaign from "../models/Campaign";
import WorkflowEnrollment from "../models/WorkflowEnrollment";
import EmailMessage from "../models/EmailMessage";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = express.Router();

const reportLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many requests, please try again later.",
});

// ============================================
// HELPER
// ============================================

async function validateAccess(workspaceId: string, userId: string, res: Response): Promise<boolean> {
    const workspace = await Project.findById(workspaceId);
    if (!workspace) {
        res.status(404).json({ success: false, error: "Workspace not found." });
        return false;
    }
    if (workspace.userId.toString() !== userId) {
        res.status(403).json({ success: false, error: "Access denied." });
        return false;
    }
    return true;
}

// ============================================
// ROUTES
// ============================================

/**
 * @route   GET /api/workspaces/:workspaceId/reports/overview
 * @desc    Get overall CRM metrics
 */
router.get(
    "/:workspaceId/reports/overview",
    authenticate,
    reportLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateAccess(workspaceId, userId, res))) return;

            const mongoose = require("mongoose");
            const wsId = mongoose.Types.ObjectId.createFromHexString(workspaceId);

            // Get date range (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [
                totalContacts,
                newContactsThisMonth,
                totalCompanies,
                totalDeals,
                openDeals,
                wonDealsValue,
                totalTasks,
                completedTasks,
                openTickets,
            ] = await Promise.all([
                Contact.countDocuments({ workspaceId }),
                Contact.countDocuments({ workspaceId, createdAt: { $gte: thirtyDaysAgo } }),
                Company.countDocuments({ workspaceId }),
                Opportunity.countDocuments({ workspaceId }),
                Opportunity.countDocuments({ workspaceId, status: { $nin: ["won", "lost"] } }),
                Opportunity.aggregate([
                    { $match: { workspaceId: wsId, status: "won" } },
                    { $group: { _id: null, total: { $sum: "$value" } } },
                ]),
                Task.countDocuments({ workspaceId }),
                Task.countDocuments({ workspaceId, status: "completed" }),
                Ticket.countDocuments({ workspaceId, status: { $in: ["open", "in_progress"] } }),
            ]);

            res.json({
                success: true,
                data: {
                    contacts: {
                        total: totalContacts,
                        newThisMonth: newContactsThisMonth,
                    },
                    companies: {
                        total: totalCompanies,
                    },
                    deals: {
                        total: totalDeals,
                        open: openDeals,
                        wonValue: wonDealsValue[0]?.total || 0,
                    },
                    tasks: {
                        total: totalTasks,
                        completed: completedTasks,
                        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
                    },
                    tickets: {
                        open: openTickets,
                    },
                },
            });
        } catch (error: any) {
            console.error("Get overview error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch overview." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/reports/pipeline
 * @desc    Get pipeline/sales funnel data
 */
router.get(
    "/:workspaceId/reports/pipeline",
    authenticate,
    reportLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateAccess(workspaceId, userId, res))) return;

            const mongoose = require("mongoose");
            const wsId = mongoose.Types.ObjectId.createFromHexString(workspaceId);

            // Deals by stage
            const dealsByStage = await Opportunity.aggregate([
                { $match: { workspaceId: wsId } },
                {
                    $group: {
                        _id: "$stage",
                        count: { $sum: 1 },
                        totalValue: { $sum: "$value" },
                    },
                },
                { $sort: { _id: 1 } },
            ]);

            // Deals by status
            const dealsByStatus = await Opportunity.aggregate([
                { $match: { workspaceId: wsId } },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                        totalValue: { $sum: "$value" },
                    },
                },
            ]);

            // Win rate (last 90 days)
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

            const [won, lost] = await Promise.all([
                Opportunity.countDocuments({ workspaceId, status: "won", updatedAt: { $gte: ninetyDaysAgo } }),
                Opportunity.countDocuments({ workspaceId, status: "lost", updatedAt: { $gte: ninetyDaysAgo } }),
            ]);

            const winRate = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

            res.json({
                success: true,
                data: {
                    byStage: dealsByStage,
                    byStatus: dealsByStatus,
                    winRate,
                    wonCount: won,
                    lostCount: lost,
                },
            });
        } catch (error: any) {
            console.error("Get pipeline error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch pipeline data." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/reports/activity
 * @desc    Get activity timeline data
 */
router.get(
    "/:workspaceId/reports/activity",
    authenticate,
    reportLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateAccess(workspaceId, userId, res))) return;

            const mongoose = require("mongoose");
            const wsId = mongoose.Types.ObjectId.createFromHexString(workspaceId);

            // Get activity over last 30 days by day
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const [contactsOverTime, tasksOverTime, emailsOverTime] = await Promise.all([
                Contact.aggregate([
                    { $match: { workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                Task.aggregate([
                    { $match: { workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                EmailMessage.aggregate([
                    { $match: { workspaceId: wsId, createdAt: { $gte: thirtyDaysAgo } } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
            ]);

            res.json({
                success: true,
                data: {
                    contacts: contactsOverTime,
                    tasks: tasksOverTime,
                    emails: emailsOverTime,
                },
            });
        } catch (error: any) {
            console.error("Get activity error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch activity data." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/reports/email
 * @desc    Get email performance metrics
 */
router.get(
    "/:workspaceId/reports/email",
    authenticate,
    reportLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();

            if (!(await validateAccess(workspaceId, userId, res))) return;

            const mongoose = require("mongoose");
            const wsId = mongoose.Types.ObjectId.createFromHexString(workspaceId);

            const [totalSent, opened, clicked, replied] = await Promise.all([
                EmailMessage.countDocuments({ workspaceId }),
                EmailMessage.countDocuments({ workspaceId, opened: true }),
                EmailMessage.countDocuments({ workspaceId, clicked: true }),
                EmailMessage.countDocuments({ workspaceId, replied: true }),
            ]);

            res.json({
                success: true,
                data: {
                    totalSent,
                    opened,
                    clicked,
                    replied,
                    openRate: totalSent ? Math.round((opened / totalSent) * 100) : 0,
                    clickRate: totalSent ? Math.round((clicked / totalSent) * 100) : 0,
                    replyRate: totalSent ? Math.round((replied / totalSent) * 100) : 0,
                },
            });
        } catch (error: any) {
            console.error("Get email stats error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch email stats." });
        }
    }
);

/**
 * @route   GET /api/workspaces/:workspaceId/reports/email-details
 * @desc    Get detailed email tracking data including individual link clicks
 */
router.get(
    "/:workspaceId/reports/email-details",
    authenticate,
    reportLimiter,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any).toString();
            const { limit = 50, skip = 0 } = req.query;

            if (!(await validateAccess(workspaceId, userId, res))) return;

            // Get detailed email messages with link tracking
            const emails = await EmailMessage.find({ workspaceId })
                .populate("contactId", "firstName lastName email")
                .sort({ sentAt: -1 })
                .limit(Number(limit))
                .skip(Number(skip))
                .select("subject toEmail fromEmail sentAt opened openedAt clicked clickedAt linkClicks source campaignId workflowId");

            // Get total count for pagination
            const totalCount = await EmailMessage.countDocuments({ workspaceId });

            // Aggregate link performance across all emails
            const linkPerformance = await EmailMessage.aggregate([
                { $match: { workspaceId: mongoose.Types.ObjectId.createFromHexString(workspaceId) } },
                { $unwind: "$linkClicks" },
                {
                    $group: {
                        _id: "$linkClicks.url",
                        totalClicks: { $sum: "$linkClicks.clickCount" },
                        uniqueEmails: { $addToSet: "$_id" },
                        lastClicked: { $max: "$linkClicks.clickedAt" },
                    },
                },
                {
                    $project: {
                        url: "$_id",
                        totalClicks: 1,
                        uniqueEmailCount: { $size: "$uniqueEmails" },
                        lastClicked: 1,
                    },
                },
                { $sort: { totalClicks: -1 } },
                { $limit: 20 },
            ]);

            res.json({
                success: true,
                data: {
                    emails,
                    totalCount,
                    linkPerformance,
                    pagination: {
                        limit: Number(limit),
                        skip: Number(skip),
                        hasMore: Number(skip) + Number(limit) < totalCount,
                    },
                },
            });
        } catch (error: any) {
            console.error("Get email details error:", error);
            res.status(500).json({ success: false, error: "Failed to fetch email details." });
        }
    }
);

export default router;
