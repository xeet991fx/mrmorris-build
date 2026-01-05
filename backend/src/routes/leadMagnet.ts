import express, { Request, Response } from "express";
import { Types } from "mongoose";
import LeadMagnet from "../models/LeadMagnet";

const router = express.Router();

// GET /api/lead-magnets/workspace/:workspaceId
router.get("/workspace/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { status, type } = req.query;

    const query: any = { workspaceId: new Types.ObjectId(workspaceId) };
    if (status) query.status = status;
    if (type) query.type = type;

    const magnets = await LeadMagnet.find(query).sort({ createdAt: -1 });

    res.json({ success: true, magnets });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lead-magnets/workspace/:workspaceId
router.post("/workspace/:workspaceId", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const magnetData = { ...req.body, workspaceId: new Types.ObjectId(workspaceId) };

    const magnet = await LeadMagnet.create(magnetData);

    res.json({ success: true, magnet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/lead-magnets/workspace/:workspaceId/analytics
router.get("/workspace/:workspaceId/analytics", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const analytics = await (LeadMagnet as any).getAnalytics(new Types.ObjectId(workspaceId));

    res.json({ success: true, analytics });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lead-magnets/:id/track-view
router.post("/:id/track-view", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const magnet = await LeadMagnet.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    res.json({ success: true, magnet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/lead-magnets/:id/track-download
router.post("/:id/track-download", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const magnet = await LeadMagnet.findByIdAndUpdate(
      id,
      { $inc: { downloads: 1 } },
      { new: true }
    );

    res.json({ success: true, magnet });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
