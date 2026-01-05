import express, { Request, Response } from "express";
import { Types } from "mongoose";
import VoiceDrop from "../models/VoiceDrop";

const router = express.Router();

// GET /api/voice-drops/workspace/:workspaceId
router.get("/workspace/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const campaigns = await VoiceDrop.find({
      workspaceId: new Types.ObjectId(workspaceId),
    }).sort({ createdAt: -1 });

    res.json({ success: true, campaigns });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/voice-drops/workspace/:workspaceId
router.post("/workspace/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const userId = (req as any).user?._id;

    const campaign = await VoiceDrop.create({
      ...req.body,
      workspaceId: new Types.ObjectId(workspaceId),
      userId,
    });

    res.json({ success: true, campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/voice-drops/workspace/:workspaceId/statistics
router.get("/workspace/:workspaceId/statistics", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const campaigns = await VoiceDrop.find({
      workspaceId: new Types.ObjectId(workspaceId),
    });

    const stats = {
      totalCampaigns: campaigns.length,
      totalDrops: campaigns.reduce((sum, c) => sum + c.totalRecipients, 0),
      totalDelivered: campaigns.reduce((sum, c) => sum + c.delivered, 0),
      totalCost: campaigns.reduce((sum, c) => sum + c.actualCost, 0),
      avgListenRate: campaigns.reduce((sum, c) => sum + (c.listenRate || 0), 0) / campaigns.length,
    };

    res.json({ success: true, statistics: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
