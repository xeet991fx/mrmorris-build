import express, { Request, Response } from "express";
import { Types } from "mongoose";
import LeadRecyclingService from "../services/LeadRecyclingService";
import LeadRecycling from "../models/LeadRecycling";

const router = express.Router();

/**
 * POST /api/lead-recycling/workspace/:workspaceId/detect
 * Detect dead leads that need recycling
 */
router.post("/workspace/:workspaceId/detect", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const criteria = req.body.criteria || {};

    const result = await LeadRecyclingService.detectDeadLeads(
      new Types.ObjectId(workspaceId),
      criteria
    );

    // Create recycling records
    const created = await LeadRecyclingService.createRecyclingRecords(
      new Types.ObjectId(workspaceId),
      result.leads
    );

    res.json({
      success: true,
      detected: result.detected,
      created,
      leads: result.leads,
    });
  } catch (error: any) {
    console.error("Error detecting dead leads:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/lead-recycling/workspace/:workspaceId/process
 * Process re-engagement attempts
 */
router.post("/workspace/:workspaceId/process", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const result = await LeadRecyclingService.processReEngagementAttempts(
      new Types.ObjectId(workspaceId)
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error processing re-engagement:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lead-recycling/workspace/:workspaceId/statistics
 * Get recycling statistics
 */
router.get("/workspace/:workspaceId/statistics", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const stats = await LeadRecyclingService.getStatistics(new Types.ObjectId(workspaceId));

    res.json({
      success: true,
      statistics: stats,
    });
  } catch (error: any) {
    console.error("Error getting statistics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lead-recycling/workspace/:workspaceId/leads
 * Get leads in recycling
 */
router.get("/workspace/:workspaceId/leads", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { status, limit } = req.query;

    const query: any = { workspaceId: new Types.ObjectId(workspaceId) };

    if (status) {
      query.status = status;
    }

    const leads = await LeadRecycling.find(query)
      .populate("contactId", "firstName lastName email lifecycleStage")
      .sort({ detectedAt: -1 })
      .limit(parseInt(limit as string) || 100);

    res.json({
      success: true,
      leads,
    });
  } catch (error: any) {
    console.error("Error getting leads:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/lead-recycling/:recyclingId/mark-engaged
 * Manually mark a lead as re-engaged
 */
router.post("/:recyclingId/mark-engaged", async (req: Request, res: Response) => {
  try {
    const { recyclingId } = req.params;
    const { notes } = req.body;

    const recycling = await LeadRecycling.findById(recyclingId);

    if (!recycling) {
      return res.status(404).json({
        success: false,
        message: "Recycling record not found",
      });
    }

    recycling.status = "re_engaged";
    recycling.reEngagedAt = new Date();
    if (notes) {
      recycling.notes = notes;
    }

    await recycling.save();

    res.json({
      success: true,
      recycling,
    });
  } catch (error: any) {
    console.error("Error marking as engaged:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/lead-recycling/:recyclingId
 * Remove from recycling (give up)
 */
router.delete("/:recyclingId", async (req: Request, res: Response) => {
  try {
    const { recyclingId } = req.params;

    const recycling = await LeadRecycling.findById(recyclingId);

    if (!recycling) {
      return res.status(404).json({
        success: false,
        message: "Recycling record not found",
      });
    }

    recycling.status = "failed";
    await recycling.save();

    res.json({
      success: true,
      message: "Removed from recycling",
    });
  } catch (error: any) {
    console.error("Error removing from recycling:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lead-recycling/workspace/:workspaceId/ready
 * Get leads ready for next re-engagement attempt
 */
router.get("/workspace/:workspaceId/ready", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { limit } = req.query;

    const leads = await LeadRecyclingService.getLeadsReadyForRecycling(
      new Types.ObjectId(workspaceId),
      parseInt(limit as string) || 50
    );

    res.json({
      success: true,
      leads,
      count: leads.length,
    });
  } catch (error: any) {
    console.error("Error getting ready leads:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
