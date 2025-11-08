import { Router, Request, Response } from "express";
import Waitlist from "../models/Waitlist";
import { waitlistSchema } from "../validations/waitlist";
import { z } from "zod";

const router = Router();

// POST /api/waitlist - Join waitlist
router.post("/", async (req: Request, res: Response) => {
  try {
    // Validate input
    const validatedData = waitlistSchema.parse(req.body);

    // Check if email already exists
    const existingEntry = await Waitlist.findOne({ email: validatedData.email });

    if (existingEntry) {
      return res.status(400).json({
        error: "This email is already on the waitlist",
      });
    }

    // Create new waitlist entry
    const waitlistEntry = await Waitlist.create(validatedData);

    return res.status(201).json({
      message: "Successfully joined the waitlist!",
      data: {
        email: waitlistEntry.email,
        createdAt: waitlistEntry.createdAt,
      },
    });
  } catch (error) {
    console.error("Waitlist API Error:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Invalid input",
        details: error.errors,
      });
    }

    if (error instanceof Error && error.message.includes("duplicate key")) {
      return res.status(400).json({
        error: "This email is already on the waitlist",
      });
    }

    return res.status(500).json({
      error: "Failed to join waitlist. Please try again.",
    });
  }
});

// GET /api/waitlist?email=xxx - Check waitlist status
router.get("/", async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;

    if (!email) {
      return res.status(400).json({ error: "Email parameter required" });
    }

    const entry = await Waitlist.findOne({ email: email.toLowerCase() });

    if (!entry) {
      return res.status(200).json({ onWaitlist: false });
    }

    return res.status(200).json({
      onWaitlist: true,
      joinedAt: entry.createdAt,
    });
  } catch (error) {
    console.error("Waitlist GET Error:", error);
    return res.status(500).json({ error: "Failed to check waitlist status" });
  }
});

export default router;
