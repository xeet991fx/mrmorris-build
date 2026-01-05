import express, { Request, Response } from "express";
import { Types } from "mongoose";
import LifecycleStageService from "../services/LifecycleStageService";
import { LifecycleStage } from "../models/ContactLifecycleHistory";
import Contact from "../models/Contact";

const router = express.Router();

/**
 * POST /api/lifecycle-stages/:contactId/transition
 * Transition a contact to a new lifecycle stage
 */
router.post("/:contactId/transition", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { stage, reason, metadata, skipValidation } = req.body;
    const userId = (req as any).user?._id;

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: "Stage is required",
      });
    }

    const result = await LifecycleStageService.transitionStage(
      new Types.ObjectId(contactId),
      stage as LifecycleStage,
      {
        userId,
        reason,
        method: "manual",
        metadata,
        skipValidation,
      }
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error("Error transitioning lifecycle stage:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/:contactId/history
 * Get lifecycle history for a contact
 */
router.get("/:contactId/history", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const history = await LifecycleStageService.getContactHistory(
      new Types.ObjectId(contactId)
    );

    res.json({
      success: true,
      history,
    });
  } catch (error: any) {
    console.error("Error getting lifecycle history:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/workspace/:workspaceId/funnel-metrics
 * Get funnel metrics for a workspace
 */
router.get("/workspace/:workspaceId/funnel-metrics", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { startDate, endDate } = req.query;

    const options: any = {};
    if (startDate) {
      options.startDate = new Date(startDate as string);
    }
    if (endDate) {
      options.endDate = new Date(endDate as string);
    }

    const metrics = await LifecycleStageService.getFunnelMetrics(
      new Types.ObjectId(workspaceId),
      options
    );

    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    console.error("Error getting funnel metrics:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/workspace/:workspaceId/stage/:stage
 * Get contacts by lifecycle stage
 */
router.get("/workspace/:workspaceId/stage/:stage", async (req: Request, res: Response) => {
  try {
    const { workspaceId, stage } = req.params;
    const { page, limit, sortBy, sortOrder } = req.query;

    const result = await LifecycleStageService.getContactsByStage(
      new Types.ObjectId(workspaceId),
      stage as LifecycleStage,
      {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
      }
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error getting contacts by stage:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/workspace/:workspaceId/sla-breaches
 * Get SLA breaches for a workspace
 */
router.get("/workspace/:workspaceId/sla-breaches", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { stage, limit } = req.query;

    const breaches = await LifecycleStageService.getSLABreaches(
      new Types.ObjectId(workspaceId),
      {
        stage: stage as LifecycleStage,
        limit: limit ? parseInt(limit as string) : undefined,
      }
    );

    res.json({
      success: true,
      breaches,
    });
  } catch (error: any) {
    console.error("Error getting SLA breaches:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/lifecycle-stages/workspace/:workspaceId/process-automatic
 * Process automatic progressions for a workspace
 */
router.post("/workspace/:workspaceId/process-automatic", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const progressedCount = await LifecycleStageService.processAutomaticProgressions(
      new Types.ObjectId(workspaceId)
    );

    res.json({
      success: true,
      progressedCount,
      message: `Successfully progressed ${progressedCount} contacts`,
    });
  } catch (error: any) {
    console.error("Error processing automatic progressions:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/:contactId/check-progression
 * Check if a contact is eligible for automatic progression
 */
router.get("/:contactId/check-progression", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const result = await LifecycleStageService.checkAutomaticProgression(
      new Types.ObjectId(contactId)
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error checking progression:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/lifecycle-stages/workspace/:workspaceId/overview
 * Get overview of all stages with counts and metrics
 */
router.get("/workspace/:workspaceId/overview", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    // Get counts for each stage
    const stages: LifecycleStage[] = [
      "subscriber",
      "lead",
      "mql",
      "sql",
      "sal",
      "opportunity",
      "customer",
      "evangelist",
      "churned",
      "disqualified",
    ];

    const stageCounts = await Promise.all(
      stages.map(async (stage) => {
        const count = await Contact.countDocuments({
          workspaceId: new Types.ObjectId(workspaceId),
          lifecycleStage: stage,
        });
        return { stage, count };
      })
    );

    // Get funnel metrics
    const metrics = await LifecycleStageService.getFunnelMetrics(
      new Types.ObjectId(workspaceId)
    );

    res.json({
      success: true,
      overview: stageCounts,
      metrics,
    });
  } catch (error: any) {
    console.error("Error getting overview:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/lifecycle-stages/:contactId/bulk-transition
 * Bulk transition multiple contacts to a new stage
 */
router.post("/bulk-transition", async (req: Request, res: Response) => {
  try {
    const { contactIds, stage, reason, metadata } = req.body;
    const userId = (req as any).user?._id;

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "contactIds array is required",
      });
    }

    if (!stage) {
      return res.status(400).json({
        success: false,
        message: "stage is required",
      });
    }

    const results = await Promise.all(
      contactIds.map((contactId: string) =>
        LifecycleStageService.transitionStage(
          new Types.ObjectId(contactId),
          stage as LifecycleStage,
          {
            userId,
            reason,
            method: "manual",
            metadata,
          }
        )
      )
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      successful,
      failed,
      results,
    });
  } catch (error: any) {
    console.error("Error bulk transitioning:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
