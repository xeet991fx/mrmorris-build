import express, { Request, Response } from "express";
import { Types } from "mongoose";
import ReferralService from "../services/ReferralService";
import Referral from "../models/Referral";

const router = express.Router();

// POST /api/referrals/workspace/:workspaceId/create
router.post("/workspace/:workspaceId/create", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { referrerId, referredEmail, referredName, source } = req.body;

    const referral = await ReferralService.createReferral(
      new Types.ObjectId(workspaceId),
      new Types.ObjectId(referrerId),
      referredEmail,
      { referredName, source }
    );

    res.json({ success: true, referral });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/referrals/:code/track
router.get("/:code/track", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { source } = req.query;

    const referral = await ReferralService.trackClick(code, source as string);

    res.json({ success: true, referral });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/referrals/:code/signup
router.post("/:code/signup", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { contactId } = req.body;

    const referral = await ReferralService.processSignUp(code, new Types.ObjectId(contactId));

    res.json({ success: true, referral });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/referrals/workspace/:workspaceId/leaderboard
router.get("/workspace/:workspaceId/leaderboard", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { limit } = req.query;

    const leaderboard = await ReferralService.getLeaderboard(
      new Types.ObjectId(workspaceId),
      parseInt(limit as string) || 10
    );

    res.json({ success: true, leaderboard });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/referrals/workspace/:workspaceId/statistics
router.get("/workspace/:workspaceId/statistics", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const stats = await ReferralService.getStatistics(new Types.ObjectId(workspaceId));

    res.json({ success: true, statistics: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/referrals/referrer/:referrerId
router.get("/referrer/:referrerId", async (req: Request, res: Response) => {
  try {
    const { referrerId } = req.params;
    const { status, limit } = req.query;

    const referrals = await ReferralService.getReferralsForReferrer(
      new Types.ObjectId(referrerId),
      {
        status: status as string,
        limit: parseInt(limit as string),
      }
    );

    res.json({ success: true, referrals });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/referrals/:referralId/claim
router.post("/:referralId/claim", async (req: Request, res: Response) => {
  try {
    const { referralId } = req.params;
    const { rewardType } = req.body;

    const referral = await ReferralService.claimReward(
      new Types.ObjectId(referralId),
      rewardType
    );

    res.json({ success: true, referral });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
