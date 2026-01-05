import express, { Request, Response } from "express";
import { Types } from "mongoose";
import AttributionService from "../services/AttributionService";
import Attribution from "../models/Attribution";

const router = express.Router();

/**
 * POST /api/attribution/workspace/:workspaceId/build
 * Build attribution records for all contacts
 */
router.post("/workspace/:workspaceId/build", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;

    const built = await AttributionService.buildAllAttributions(new Types.ObjectId(workspaceId));

    res.json({
      success: true,
      built,
      message: `Built attribution records for ${built} contacts`,
    });
  } catch (error: any) {
    console.error("Error building attributions:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/attribution/workspace/:workspaceId/report
 * Get attribution report
 */
router.get("/workspace/:workspaceId/report", async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { model, startDate, endDate, channel } = req.query;

    const options: any = {};
    if (model) options.model = model;
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);
    if (channel) options.channel = channel;

    const report = await AttributionService.getAttributionReport(
      new Types.ObjectId(workspaceId),
      options
    );

    res.json({
      success: true,
      report,
    });
  } catch (error: any) {
    console.error("Error getting attribution report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/attribution/contact/:contactId
 * Get attribution for a specific contact
 */
router.get("/contact/:contactId", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;

    const attribution = await Attribution.findOne({ contactId }).populate(
      "contactId",
      "firstName lastName email"
    );

    if (!attribution) {
      return res.status(404).json({
        success: false,
        message: "Attribution not found",
      });
    }

    res.json({
      success: true,
      attribution,
    });
  } catch (error: any) {
    console.error("Error getting attribution:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/attribution/contact/:contactId/rebuild
 * Rebuild attribution for a contact
 */
router.post("/contact/:contactId/rebuild", async (req: Request, res: Response) => {
  try {
    const { contactId } = req.params;
    const { workspaceId } = req.body;

    const attribution = await AttributionService.buildAttributionRecord(
      new Types.ObjectId(contactId),
      new Types.ObjectId(workspaceId)
    );

    if (!attribution) {
      return res.status(404).json({
        success: false,
        message: "No tracking events found for contact",
      });
    }

    res.json({
      success: true,
      attribution,
    });
  } catch (error: any) {
    console.error("Error rebuilding attribution:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
