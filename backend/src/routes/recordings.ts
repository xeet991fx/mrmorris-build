import express, { Request, Response, NextFunction } from "express";
import { recordingsService } from "../services/recordingsService";
import { authenticate } from "../middleware/auth";
import { validateWorkspaceAccess } from "../middleware/workspace";
import { logger } from "../utils/logger";

const router = express.Router();

/**
 * Recordings Routes
 * Handles recording management, viewing, sharing, and deletion
 */

// Apply authentication to all routes
router.use(authenticate);

/**
 * GET /api/workspaces/:workspaceId/recordings
 * List all recordings for a workspace
 */
router.get(
    "/:workspaceId/recordings",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { workspaceId } = req.params;
            const {
                status,
                schedulerId,
                hostUserId,
                search,
                startDate,
                endDate,
                sortBy,
                sortOrder,
                limit,
                offset,
            } = req.query;

            const result = await recordingsService.listRecordings(workspaceId, {
                status: status as string,
                schedulerId: schedulerId as string,
                hostUserId: hostUserId as string,
                search: search as string,
                startDate: startDate ? new Date(startDate as string) : undefined,
                endDate: endDate ? new Date(endDate as string) : undefined,
                sortBy: sortBy as "recordedAt" | "recordingDuration" | "viewCount",
                sortOrder: sortOrder as "asc" | "desc",
                limit: limit ? parseInt(limit as string) : undefined,
                offset: offset ? parseInt(offset as string) : undefined,
            });

            res.json({
                success: true,
                data: result.recordings,
                pagination: {
                    total: result.total,
                    limit: limit ? parseInt(limit as string) : 20,
                    offset: offset ? parseInt(offset as string) : 0,
                },
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/recordings/:recordingId
 * Get a specific recording
 */
router.get(
    "/:workspaceId/recordings/:recordingId",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { recordingId } = req.params;
            const userId = (req as any).user._id.toString();

            const recording = await recordingsService.getRecording(recordingId, userId);

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "Recording not found",
                });
            }

            res.json({
                success: true,
                data: recording,
            });
        } catch (error: any) {
            if (error.message === "Access denied") {
                return res.status(403).json({
                    success: false,
                    error: "You do not have access to this recording",
                });
            }
            next(error);
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/recordings/:recordingId/url
 * Get the view URL for a recording
 */
router.get(
    "/:workspaceId/recordings/:recordingId/url",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { recordingId } = req.params;
            const userId = (req as any).user._id.toString();

            const url = await recordingsService.getRecordingViewUrl(recordingId, userId);

            res.json({
                success: true,
                data: { url },
            });
        } catch (error: any) {
            if (error.message === "Access denied") {
                return res.status(403).json({
                    success: false,
                    error: "You do not have access to this recording",
                });
            }
            next(error);
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/recordings/:recordingId/stream
 * Stream the recording file
 */
router.get(
    "/:workspaceId/recordings/:recordingId/stream",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { recordingId } = req.params;
            const userId = (req as any).user._id.toString();

            const { stream, contentType, contentLength } =
                await recordingsService.streamRecording(recordingId, userId);

            res.setHeader("Content-Type", contentType);
            // res.setHeader("Content-Length", contentLength); // content-length might be missing or incorrect for chunked streams

            stream.pipe(res);
        } catch (error: any) {
            if (error.message === "Access denied") {
                return res.status(403).json({
                    success: false,
                    error: "You do not have access to this recording",
                });
            }
            if (error.message === "Google account not connected") {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === "Recording not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            next(error);
        }
    }
);

/**
 * DELETE /api/workspaces/:workspaceId/recordings/:recordingId
 * Delete a recording
 */
router.delete(
    "/:workspaceId/recordings/:recordingId",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { recordingId } = req.params;
            const { deleteFromDrive } = req.query;
            const userId = (req as any).user._id.toString();

            await recordingsService.deleteRecording(
                recordingId,
                userId,
                deleteFromDrive === "true"
            );

            res.json({
                success: true,
                message: "Recording deleted successfully",
            });
        } catch (error: any) {
            if (error.message === "Recording not found") {
                return res.status(404).json({
                    success: false,
                    error: "Recording not found",
                });
            }
            if (error.message === "Only the host can delete recordings") {
                return res.status(403).json({
                    success: false,
                    error: error.message,
                });
            }
            next(error);
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/recordings/:recordingId/share
 * Share a recording with users
 */
router.post(
    "/:workspaceId/recordings/:recordingId/share",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { recordingId } = req.params;
            const { emails, role, sendNotification } = req.body;
            const userId = (req as any).user._id.toString();

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "At least one email is required",
                });
            }

            const result = await recordingsService.shareRecording(
                recordingId,
                userId,
                emails,
                role || "viewer",
                sendNotification !== false
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            if (error.message === "Access denied") {
                return res.status(403).json({
                    success: false,
                    error: "You do not have access to share this recording",
                });
            }
            if (error.message === "Google account not connected") {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            next(error);
        }
    }
);

/**
 * GET /api/workspaces/:workspaceId/meetings/:meetingId/recording
 * Get the recording for a specific meeting
 */
router.get(
    "/:workspaceId/meetings/:meetingId/recording",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { meetingId } = req.params;
            const userId = (req as any).user._id.toString();

            const recording = await recordingsService.getRecordingByMeetingId(
                meetingId,
                userId
            );

            if (!recording) {
                return res.status(404).json({
                    success: false,
                    error: "No recording found for this meeting",
                });
            }

            res.json({
                success: true,
                data: recording,
            });
        } catch (error: any) {
            if (error.message === "Access denied") {
                return res.status(403).json({
                    success: false,
                    error: "You do not have access to this recording",
                });
            }
            next(error);
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/recordings/sync
 * Sync a recording from Google Drive (webhook callback or manual sync)
 */
router.post(
    "/:workspaceId/recordings/sync",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { meetingId, driveFileId } = req.body;
            const userId = (req as any).user._id.toString();

            if (!meetingId || !driveFileId) {
                return res.status(400).json({
                    success: false,
                    error: "meetingId and driveFileId are required",
                });
            }

            const recording = await recordingsService.syncFromDrive(
                meetingId,
                driveFileId,
                userId
            );

            res.json({
                success: true,
                data: recording,
            });
        } catch (error: any) {
            if (error.message === "Meeting not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === "Google account not connected") {
                return res.status(400).json({
                    success: false,
                    error: error.message,
                });
            }
            next(error);
        }
    }
);

/**
 * POST /api/workspaces/:workspaceId/recordings/create
 * Create a recording record (internal use or webhook)
 */
router.post(
    "/:workspaceId/recordings/create",
    validateWorkspaceAccess,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { workspaceId } = req.params;
            const {
                meetingId,
                driveFileId,
                driveFileUrl,
                fileName,
                mimeType,
                fileSize,
                recordingDuration,
                recordingStartTime,
                recordingEndTime,
            } = req.body;

            if (!meetingId || !driveFileId || !driveFileUrl) {
                return res.status(400).json({
                    success: false,
                    error: "meetingId, driveFileId, and driveFileUrl are required",
                });
            }

            const recording = await recordingsService.createRecording({
                workspaceId,
                meetingId,
                driveFileId,
                driveFileUrl,
                fileName: fileName || "Recording",
                mimeType,
                fileSize,
                recordingDuration: recordingDuration || 0,
                recordingStartTime: recordingStartTime
                    ? new Date(recordingStartTime)
                    : new Date(),
                recordingEndTime: recordingEndTime
                    ? new Date(recordingEndTime)
                    : undefined,
            });

            res.status(201).json({
                success: true,
                data: recording,
            });
        } catch (error: any) {
            if (error.message === "Meeting not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            next(error);
        }
    }
);

export default router;
