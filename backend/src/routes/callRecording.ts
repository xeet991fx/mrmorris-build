/**
 * Call Recording API Routes
 *
 * Provides CRUD operations for call recordings with AI transcription and insights.
 */

import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth";
import CallRecording from "../models/CallRecording";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), "uploads", "recordings");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /mp3|wav|m4a|ogg|webm/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error("Only audio files are allowed (mp3, wav, m4a, ogg, webm)"));
        }
    },
});

/**
 * GET /api/workspaces/:workspaceId/call-recordings
 *
 * Get all call recordings for a workspace.
 */
router.get(
    "/:workspaceId/call-recordings",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { contactId, opportunityId, search, limit = 50, offset = 0 } = req.query;

            const filter: any = { workspaceId };
            if (contactId) filter.contactId = contactId;
            if (opportunityId) filter.opportunityId = opportunityId;
            if (search) {
                filter.$text = { $search: search as string };
            }

            const recordings = await CallRecording.find(filter)
                .populate("contactId", "firstName lastName email")
                .populate("opportunityId", "title value")
                .populate("companyId", "name")
                .sort({ recordedAt: -1 })
                .limit(parseInt(limit as string))
                .skip(parseInt(offset as string))
                .lean();

            const total = await CallRecording.countDocuments(filter);

            res.json({
                success: true,
                data: recordings,
                pagination: {
                    total,
                    limit: parseInt(limit as string),
                    offset: parseInt(offset as string),
                    hasMore: total > parseInt(offset as string) + recordings.length,
                },
            });
        } catch (error: any) {
            console.error("Error fetching call recordings:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch call recordings",
            });
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/call-recordings/:id
 *
 * Get a specific call recording.
 */
router.get(
    "/:workspaceId/call-recordings/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const recording = await CallRecording.findOne({ _id: id, workspaceId })
                .populate("contactId", "firstName lastName email")
                .populate("opportunityId", "title value")
                .populate("companyId", "name")
                .lean();

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "Call recording not found",
                });
            }

            res.json({
                success: true,
                data: recording,
            });
        } catch (error: any) {
            console.error("Error fetching call recording:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to fetch call recording",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/call-recordings
 *
 * Create a new call recording (with optional audio upload).
 */
router.post(
    "/:workspaceId/call-recordings",
    authenticate,
    upload.single("audio"),
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req.user?._id as any)?.toString();
            const file = req.file;

            const {
                title,
                contactId,
                opportunityId,
                companyId,
                recordedAt,
                source,
                transcript,
                participants,
                tags,
            } = req.body;

            const audioUrl = file ? `/uploads/recordings/${file.filename}` : undefined;

            const recording = await CallRecording.create({
                workspaceId,
                userId,
                title,
                contactId: contactId || undefined,
                opportunityId: opportunityId || undefined,
                companyId: companyId || undefined,
                audioUrl,
                recordedAt: recordedAt || new Date(),
                source: source || "upload",
                transcript,
                participants: participants ? JSON.parse(participants) : undefined,
                tags: tags ? JSON.parse(tags) : undefined,
            });

            res.status(201).json({
                success: true,
                data: recording,
                message: "Call recording uploaded successfully",
            });
        } catch (error: any) {
            console.error("Error creating call recording:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create call recording",
            });
        }
    }
);

/**
 * PUT /api/workspaces/:workspaceId/call-recordings/:id
 *
 * Update a call recording (typically used by transcription agent).
 */
router.put(
    "/:workspaceId/call-recordings/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const updates = req.body;

            const recording = await CallRecording.findOneAndUpdate(
                { _id: id, workspaceId },
                updates,
                { new: true, runValidators: true }
            );

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "Call recording not found",
                });
            }

            res.json({
                success: true,
                data: recording,
                message: "Call recording updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating call recording:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update call recording",
            });
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/call-recordings/:id
 *
 * Delete a call recording.
 */
router.delete(
    "/:workspaceId/call-recordings/:id",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const recording = await CallRecording.findOne({ _id: id, workspaceId });

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "Call recording not found",
                });
            }

            // Delete audio file if exists
            if (recording.audioUrl) {
                const filePath = path.join(process.cwd(), recording.audioUrl);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            await recording.deleteOne();

            res.json({
                success: true,
                message: "Call recording deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting call recording:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete call recording",
            });
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/call-recordings/:id/transcribe
 *
 * Trigger transcription for a call recording.
 */
router.post(
    "/:workspaceId/call-recordings/:id/transcribe",
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const recording = await CallRecording.findOne({ _id: id, workspaceId });

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "Call recording not found",
                });
            }

            // TODO: Integrate with transcription service (Whisper API, Deepgram, etc.)
            // For now, return a placeholder response

            res.json({
                success: true,
                message: "Transcription job started. This feature will be completed in a future update.",
                data: {
                    status: "pending",
                    recordingId: id,
                },
            });
        } catch (error: any) {
            console.error("Error triggering transcription:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to trigger transcription",
            });
        }
    }
);

export default router;
