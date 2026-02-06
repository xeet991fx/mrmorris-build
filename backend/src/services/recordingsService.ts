import mongoose from "mongoose";
import { Recording, IRecording } from "../models/Recording";
import Meeting from "../models/Meeting";
import User from "../models/User";
import { google } from "googleapis";
import { logger } from "../utils/logger";

/**
 * Recordings Service
 * Handles recording management, access control, and Drive integration
 */
class RecordingsService {
    /**
     * List recordings for a workspace with filtering and pagination
     */
    async listRecordings(
        workspaceId: string,
        options: {
            status?: string;
            schedulerId?: string;
            hostUserId?: string;
            search?: string;
            startDate?: Date;
            endDate?: Date;
            sortBy?: "recordedAt" | "recordingDuration" | "viewCount";
            sortOrder?: "asc" | "desc";
            limit?: number;
            offset?: number;
        } = {}
    ): Promise<{ recordings: IRecording[]; total: number }> {
        const {
            status,
            schedulerId,
            hostUserId,
            search,
            startDate,
            endDate,
            sortBy = "recordedAt",
            sortOrder = "desc",
            limit = 20,
            offset = 0,
        } = options;

        // Build query
        const query: any = {
            workspaceId: new mongoose.Types.ObjectId(workspaceId),
            status: { $ne: "deleted" },
        };

        if (status && status !== "all") {
            query.status = status;
        }

        if (schedulerId) {
            query.schedulerId = new mongoose.Types.ObjectId(schedulerId);
        }

        if (hostUserId) {
            query.hostUserId = new mongoose.Types.ObjectId(hostUserId);
        }

        if (startDate) {
            query.recordedAt = { ...query.recordedAt, $gte: startDate };
        }

        if (endDate) {
            query.recordedAt = { ...query.recordedAt, $lte: endDate };
        }

        if (search) {
            query.$text = { $search: search };
        }

        // Build sort
        const sort: any = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        // Execute query
        const [recordings, total] = await Promise.all([
            Recording.find(query)
                .sort(sort)
                .skip(offset)
                .limit(limit)
                .populate("hostUserId", "name email profilePicture")
                .populate("schedulerId", "name slug")
                .lean(),
            Recording.countDocuments(query),
        ]);

        return { recordings: recordings as unknown as IRecording[], total };
    }

    /**
     * Get a single recording by ID
     */
    async getRecording(
        recordingId: string,
        userId: string
    ): Promise<IRecording | null> {
        const recording = await Recording.findById(recordingId)
            .populate("hostUserId", "name email profilePicture")
            .populate("schedulerId", "name slug")
            .populate("meetingId");

        if (!recording) {
            return null;
        }

        // Check access
        const hasAccess = await this.checkAccess(recording, userId);
        if (!hasAccess) {
            throw new Error("Access denied");
        }

        // Update view count
        await Recording.findByIdAndUpdate(recordingId, {
            $inc: { viewCount: 1 },
            lastViewedAt: new Date(),
            lastViewedBy: new mongoose.Types.ObjectId(userId),
        });

        return recording;
    }

    /**
     * Get recording by meeting ID
     */
    async getRecordingByMeetingId(
        meetingId: string,
        userId: string
    ): Promise<IRecording | null> {
        const recording = await Recording.findOne({
            meetingId: new mongoose.Types.ObjectId(meetingId),
            status: { $ne: "deleted" },
        })
            .populate("hostUserId", "name email profilePicture")
            .populate("schedulerId", "name slug");

        if (!recording) {
            return null;
        }

        // Check access
        const hasAccess = await this.checkAccess(recording, userId);
        if (!hasAccess) {
            throw new Error("Access denied");
        }

        return recording;
    }

    /**
     * Create a recording record from a completed meeting recording
     */
    async createRecording(data: {
        workspaceId: string;
        meetingId: string;
        driveFileId: string;
        driveFileUrl: string;
        fileName: string;
        mimeType?: string;
        fileSize?: number;
        recordingDuration: number;
        recordingStartTime: Date;
        recordingEndTime?: Date;
    }): Promise<IRecording> {
        // Get meeting details
        const meeting = await Meeting.findById(data.meetingId)
            .populate("schedulerId")
            .populate("hostUserId");

        if (!meeting) {
            throw new Error("Meeting not found");
        }

        const scheduler = meeting.schedulerId as any;

        // Create recording
        const recording = new Recording({
            workspaceId: new mongoose.Types.ObjectId(data.workspaceId),
            meetingId: new mongoose.Types.ObjectId(data.meetingId),
            schedulerId: scheduler._id,
            hostUserId: meeting.hostUserId,
            meetingTitle: `${scheduler.name} - ${meeting.attendee.name}`,
            scheduledAt: meeting.scheduledAt,
            meetingDuration: meeting.duration,
            attendees: [
                {
                    name: meeting.attendee.name,
                    email: meeting.attendee.email,
                },
            ],
            driveFileId: data.driveFileId,
            driveFileUrl: data.driveFileUrl,
            fileName: data.fileName,
            mimeType: data.mimeType || "video/mp4",
            fileSize: data.fileSize || 0,
            recordingDuration: data.recordingDuration,
            recordedAt: data.recordingStartTime,
            recordingStartTime: data.recordingStartTime,
            recordingEndTime: data.recordingEndTime,
            status: "ready",
            accessLevel: scheduler.recordingSettings?.accessLevel || "host",
            retentionDays: scheduler.recordingSettings?.retentionDays,
            expiresAt: scheduler.recordingSettings?.retentionDays
                ? new Date(
                    Date.now() +
                    scheduler.recordingSettings.retentionDays * 24 * 60 * 60 * 1000
                )
                : undefined,
        });

        await recording.save();

        // Update meeting with recording reference
        await Meeting.findByIdAndUpdate(data.meetingId, {
            "googleMeet.recording.status": "completed",
            "googleMeet.recording.driveFileId": data.driveFileId,
            "googleMeet.recording.driveFileUrl": data.driveFileUrl,
            "googleMeet.recording.duration": data.recordingDuration,
            "googleMeet.recording.recordedAt": data.recordingStartTime,
        });

        logger.info("Recording created", {
            recordingId: recording._id,
            meetingId: data.meetingId,
            driveFileId: data.driveFileId,
        });

        return recording;
    }

    /**
     * Update recording status
     */
    async updateRecordingStatus(
        recordingId: string,
        status: "processing" | "ready" | "failed" | "deleted",
        error?: string
    ): Promise<IRecording | null> {
        const update: any = { status };

        if (status === "failed" && error) {
            update.processingError = error;
        }

        if (status === "deleted") {
            update.deletedAt = new Date();
        }

        const recording = await Recording.findByIdAndUpdate(recordingId, update, {
            new: true,
        });

        return recording;
    }

    /**
     * Delete a recording (soft delete)
     */
    async deleteRecording(
        recordingId: string,
        userId: string,
        deleteFromDrive: boolean = false
    ): Promise<boolean> {
        const recording = await Recording.findById(recordingId);

        if (!recording) {
            throw new Error("Recording not found");
        }

        // Check if user is host or workspace admin
        if (recording.hostUserId.toString() !== userId) {
            // TODO: Check if user is workspace admin
            throw new Error("Only the host can delete recordings");
        }

        // Delete from Google Drive if requested
        if (deleteFromDrive && recording.driveFileId) {
            try {
                await this.deleteFromDrive(recording.driveFileId, userId);
            } catch (error) {
                logger.error("Failed to delete from Drive", {
                    recordingId,
                    driveFileId: recording.driveFileId,
                    error,
                });
                // Continue with soft delete even if Drive delete fails
            }
        }

        // Soft delete
        await Recording.findByIdAndUpdate(recordingId, {
            status: "deleted",
            deletedAt: new Date(),
        });

        // Update meeting
        await Meeting.findByIdAndUpdate(recording.meetingId, {
            "googleMeet.recording.status": "deleted",
        });

        logger.info("Recording deleted", {
            recordingId,
            userId,
            deleteFromDrive,
        });

        return true;
    }

    /**
     * Share a recording with users
     */
    async shareRecording(
        recordingId: string,
        userId: string,
        emails: string[],
        role: "viewer" | "editor" = "viewer",
        sendNotification: boolean = true
    ): Promise<{ sharedWith: string[] }> {
        const recording = await Recording.findById(recordingId);

        if (!recording) {
            throw new Error("Recording not found");
        }

        // Check if user can share
        const hasAccess = await this.checkAccess(recording, userId);
        if (!hasAccess) {
            throw new Error("Access denied");
        }

        // Get user's Google tokens for Drive sharing
        const user = await User.findById(userId).select("+googleTokens");
        if (!user?.googleTokens?.accessToken) {
            throw new Error("Google account not connected");
        }

        // Share on Google Drive
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.googleTokens.accessToken,
            refresh_token: user.googleTokens.refreshToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const sharedSuccessfully: string[] = [];

        for (const email of emails) {
            try {
                await drive.permissions.create({
                    fileId: recording.driveFileId,
                    sendNotificationEmail: sendNotification,
                    requestBody: {
                        type: "user",
                        role: role === "editor" ? "writer" : "reader",
                        emailAddress: email,
                    },
                });

                sharedSuccessfully.push(email);

                // Add to sharedWith array
                if (!recording.sharedWith.find((s) => s.email === email)) {
                    recording.sharedWith.push({
                        email,
                        role,
                        sharedAt: new Date(),
                        sharedBy: new mongoose.Types.ObjectId(userId),
                    });
                }
            } catch (error) {
                logger.error("Failed to share with user", {
                    recordingId,
                    email,
                    error,
                });
            }
        }

        await recording.save();

        logger.info("Recording shared", {
            recordingId,
            sharedWith: sharedSuccessfully,
        });

        return { sharedWith: sharedSuccessfully };
    }

    /**
     * Get a view URL for a recording (may include access token)
     */
    async getRecordingViewUrl(
        recordingId: string,
        userId: string
    ): Promise<string> {
        const recording = await Recording.findById(recordingId);

        if (!recording) {
            throw new Error("Recording not found");
        }

        const hasAccess = await this.checkAccess(recording, userId);
        if (!hasAccess) {
            throw new Error("Access denied");
        }

        // For now, return the direct Drive URL
        // In production, you might want to generate a signed URL
        return recording.driveFileUrl;
    }

    /**
     * Check if a user has access to a recording
     */
    private async checkAccess(
        recording: IRecording,
        userId: string
    ): Promise<boolean> {
        // Host always has access
        if (recording.hostUserId.toString() === userId) {
            return true;
        }

        // Check access level
        switch (recording.accessLevel) {
            case "host":
                return false;

            case "participants":
                // Check if user email is in attendees
                const user = await User.findById(userId);
                if (!user) return false;
                return recording.attendees.some((a) => a.email === user.email);

            case "workspace":
                // TODO: Check if user is in workspace
                return true;

            default:
                return false;
        }
    }

    /**
     * Delete a file from Google Drive
     */
    private async deleteFromDrive(
        fileId: string,
        userId: string
    ): Promise<void> {
        const user = await User.findById(userId).select("+googleTokens");
        if (!user?.googleTokens?.accessToken) {
            throw new Error("Google account not connected");
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.googleTokens.accessToken,
            refresh_token: user.googleTokens.refreshToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        await drive.files.delete({
            fileId,
        });
    }

    /**
     * Sync recording from Google Drive (for webhook callbacks)
     */
    async syncFromDrive(
        meetingId: string,
        driveFileId: string,
        userId: string
    ): Promise<IRecording | null> {
        const user = await User.findById(userId).select("+googleTokens");
        if (!user?.googleTokens?.accessToken) {
            throw new Error("Google account not connected");
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.googleTokens.accessToken,
            refresh_token: user.googleTokens.refreshToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        // Get file metadata
        const fileResponse = await drive.files.get({
            fileId: driveFileId,
            fields: "id,name,mimeType,size,webViewLink,createdTime,videoMediaMetadata",
        });

        const file = fileResponse.data;

        // Get meeting
        const meeting = await Meeting.findById(meetingId).populate("schedulerId");
        if (!meeting) {
            throw new Error("Meeting not found");
        }

        const scheduler = meeting.schedulerId as any;

        // Create or update recording
        let recording = await Recording.findOne({
            meetingId: new mongoose.Types.ObjectId(meetingId),
        });

        const recordingData = {
            driveFileId: file.id!,
            driveFileUrl: file.webViewLink!,
            fileName: file.name!,
            mimeType: file.mimeType || "video/mp4",
            fileSize: parseInt(file.size || "0"),
            recordingDuration: (file.videoMediaMetadata as any)?.durationMillis
                ? Math.floor((file.videoMediaMetadata as any).durationMillis / 1000)
                : 0,
            status: "ready" as const,
        };

        if (recording) {
            recording = await Recording.findByIdAndUpdate(
                recording._id,
                recordingData,
                { new: true }
            );
        } else {
            recording = new Recording({
                workspaceId: scheduler.workspaceId,
                meetingId: meeting._id,
                schedulerId: scheduler._id,
                hostUserId: meeting.hostUserId,
                meetingTitle: `${scheduler.name} - ${meeting.attendee.name}`,
                scheduledAt: meeting.scheduledAt,
                meetingDuration: meeting.duration,
                attendees: [
                    {
                        name: meeting.attendee.name,
                        email: meeting.attendee.email,
                    },
                ],
                recordedAt: new Date(file.createdTime!),
                recordingStartTime: new Date(file.createdTime!),
                accessLevel: scheduler.recordingSettings?.accessLevel || "host",
                ...recordingData,
            });
            await recording.save();
        }

        // Update meeting
        await Meeting.findByIdAndUpdate(meetingId, {
            "googleMeet.recording.status": "completed",
            "googleMeet.recording.driveFileId": file.id,
            "googleMeet.recording.driveFileUrl": file.webViewLink,
            "googleMeet.recording.duration": recordingData.recordingDuration,
        });

        logger.info("Recording synced from Drive", {
            recordingId: recording?._id,
            meetingId,
            driveFileId,
        });

        return recording;
    }

    /**
     * Get recordings that are about to expire (for cleanup notifications)
     */
    async getExpiringRecordings(daysBeforeExpiry: number = 7): Promise<IRecording[]> {
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + daysBeforeExpiry);

        return Recording.find({
            status: "ready",
            expiresAt: {
                $exists: true,
                $lte: expiryThreshold,
                $gt: new Date(),
            },
        })
            .populate("hostUserId", "name email")
            .lean() as unknown as Promise<IRecording[]>;
    }

    /**
     * Cleanup expired recordings
     */
    async cleanupExpiredRecordings(): Promise<number> {
        const expiredRecordings = await Recording.find({
            status: "ready",
            expiresAt: { $lte: new Date() },
        });

        let deletedCount = 0;

        for (const recording of expiredRecordings) {
            try {
                await this.updateRecordingStatus(
                    recording._id.toString(),
                    "deleted",
                    "Expired"
                );
                deletedCount++;
            } catch (error) {
                logger.error("Failed to cleanup expired recording", {
                    recordingId: recording._id,
                    error,
                });
            }
        }

        logger.info("Expired recordings cleaned up", { deletedCount });

        return deletedCount;
    }

    /**
     * Get a readable stream for the recording file from Google Drive
     */
    async streamRecording(
        recordingId: string,
        userId: string
    ): Promise<{ stream: any; contentType: string; contentLength: number }> {
        const recording = await Recording.findById(recordingId);

        if (!recording) {
            throw new Error("Recording not found");
        }

        const hasAccess = await this.checkAccess(recording, userId);
        if (!hasAccess) {
            throw new Error("Access denied");
        }

        const user = await User.findById(userId).select("+googleTokens");
        if (!user?.googleTokens?.accessToken) {
            throw new Error("Google account not connected");
        }

        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({
            access_token: user.googleTokens.accessToken,
            refresh_token: user.googleTokens.refreshToken,
        });

        const drive = google.drive({ version: "v3", auth: oauth2Client });

        const response = await drive.files.get(
            {
                fileId: recording.driveFileId,
                alt: "media",
            },
            { responseType: "stream" }
        );

        return {
            stream: response.data,
            contentType: response.headers["content-type"] || "video/mp4",
            contentLength: parseInt(response.headers["content-length"] || "0"),
        };
    }
}

export const recordingsService = new RecordingsService();
