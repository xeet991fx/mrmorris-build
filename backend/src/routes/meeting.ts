import express, { Request, Response, Router } from "express";
import { Types } from "mongoose";
import { authenticate } from "../middleware/auth";
import Meeting from "../models/Meeting";
import MeetingType from "../models/MeetingType";
import CalendarService from "../services/CalendarService";

const router: Router = express.Router();

/**
 * Meeting Routes
 * 
 * Meeting and meeting type management with Google Calendar sync
 * Base path: /api/workspaces/:workspaceId/meetings
 */

// Get all meetings
router.get(
    "/:workspaceId/meetings",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { startDate, endDate, status, page = 1, limit = 20 } = req.query;

            const query: any = { workspaceId: new Types.ObjectId(workspaceId) };

            if (startDate && endDate) {
                query.startTime = {
                    $gte: new Date(startDate as string),
                    $lte: new Date(endDate as string),
                };
            }

            if (status) {
                query.status = status;
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [meetings, total] = await Promise.all([
                Meeting.find(query)
                    .sort({ startTime: 1 })
                    .skip(skip)
                    .limit(Number(limit))
                    .populate("createdBy", "name email")
                    .populate("contactId", "firstName lastName email")
                    .populate("meetingTypeId", "name color duration"),
                Meeting.countDocuments(query),
            ]);

            res.json({
                success: true,
                data: meetings,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / Number(limit)),
                },
            });
        } catch (error: any) {
            console.error("Error getting meetings:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get meetings",
            });
        }
    }
);

// Get single meeting
router.get(
    "/:workspaceId/meetings/:meetingId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            const meeting = await Meeting.findOne({
                _id: new Types.ObjectId(meetingId),
                workspaceId: new Types.ObjectId(workspaceId),
            })
                .populate("createdBy", "name email")
                .populate("contactId", "firstName lastName email")
                .populate("meetingTypeId", "name color duration");

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting not found",
                });
            }

            res.json({
                success: true,
                data: meeting,
            });
        } catch (error: any) {
            console.error("Error getting meeting:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get meeting",
            });
        }
    }
);

// Create meeting (with optional Google Calendar sync)
router.post(
    "/:workspaceId/meetings",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;
            const { syncToCalendar = true } = req.body;

            const meeting = new Meeting({
                workspaceId: new Types.ObjectId(workspaceId),
                createdBy: new Types.ObjectId(userId),
                ...req.body,
            });

            await meeting.save();
            await meeting.populate("createdBy", "name email");

            // Sync to Google Calendar if requested
            let calendarSync = null;
            if (syncToCalendar) {
                calendarSync = await CalendarService.createCalendarEvent(workspaceId, meeting);

                if (calendarSync.success && calendarSync.eventId) {
                    // Save Google Calendar event ID to meeting
                    meeting.calendarEventId = calendarSync.eventId;
                    meeting.calendarEventLink = calendarSync.eventLink;
                    await meeting.save();
                }
            }

            res.status(201).json({
                success: true,
                data: meeting,
                calendarSync,
                message: "Meeting created successfully",
            });
        } catch (error: any) {
            console.error("Error creating meeting:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create meeting",
            });
        }
    }
);

// Update meeting (with optional Google Calendar sync)
router.put(
    "/:workspaceId/meetings/:meetingId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;
            const { syncToCalendar = true } = req.body;

            const meeting = await Meeting.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(meetingId),
                    workspaceId: new Types.ObjectId(workspaceId),
                },
                req.body,
                { new: true }
            ).populate("createdBy", "name email");

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting not found",
                });
            }

            // Update Google Calendar event if it exists
            let calendarSync = null;
            if (syncToCalendar && meeting.calendarEventId) {
                calendarSync = await CalendarService.updateCalendarEvent(
                    workspaceId,
                    meeting.calendarEventId,
                    meeting
                );
            }

            res.json({
                success: true,
                data: meeting,
                calendarSync,
                message: "Meeting updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating meeting:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update meeting",
            });
        }
    }
);

// Delete meeting (with Google Calendar sync)
router.delete(
    "/:workspaceId/meetings/:meetingId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            // Get meeting first to get calendar event ID
            const meeting = await Meeting.findOne({
                _id: new Types.ObjectId(meetingId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting not found",
                });
            }

            // Delete from Google Calendar if synced
            let calendarSync = null;
            if (meeting.calendarEventId) {
                calendarSync = await CalendarService.deleteCalendarEvent(
                    workspaceId,
                    meeting.calendarEventId
                );
            }

            await Meeting.deleteOne({ _id: meeting._id });

            res.json({
                success: true,
                calendarSync,
                message: "Meeting deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting meeting:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete meeting",
            });
        }
    }
);

// ============= Google Calendar Integration =============

// Check calendar connection status
router.get(
    "/:workspaceId/calendar/status",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const isConnected = await CalendarService.isCalendarConnected(workspaceId);

            res.json({
                success: true,
                data: { isConnected },
            });
        } catch (error: any) {
            console.error("Error checking calendar status:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to check calendar status",
            });
        }
    }
);

// Get upcoming Google Calendar events
router.get(
    "/:workspaceId/calendar/events",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { maxResults = 10 } = req.query;

            const result = await CalendarService.getUpcomingEvents(
                workspaceId,
                Number(maxResults)
            );

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    error: result.error,
                });
            }

            res.json({
                success: true,
                data: result.events,
            });
        } catch (error: any) {
            console.error("Error getting calendar events:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get calendar events",
            });
        }
    }
);

// Sync a meeting to Google Calendar
router.post(
    "/:workspaceId/meetings/:meetingId/sync-calendar",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            const meeting = await Meeting.findOne({
                _id: new Types.ObjectId(meetingId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting not found",
                });
            }

            // Create calendar event
            const result = await CalendarService.createCalendarEvent(workspaceId, meeting);

            if (result.success && result.eventId) {
                meeting.calendarEventId = result.eventId;
                meeting.calendarEventLink = result.eventLink;
                await meeting.save();
            }

            res.json({
                success: result.success,
                data: {
                    eventId: result.eventId,
                    eventLink: result.eventLink,
                },
                error: result.error,
            });
        } catch (error: any) {
            console.error("Error syncing to calendar:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to sync meeting to calendar",
            });
        }
    }
);

// ============= Meeting Types =============

// Get meeting types
router.get(
    "/:workspaceId/meeting-types",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const meetingTypes = await MeetingType.find({
                workspaceId: new Types.ObjectId(workspaceId),
            }).populate("createdBy", "name email");

            res.json({
                success: true,
                data: meetingTypes,
            });
        } catch (error: any) {
            console.error("Error getting meeting types:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to get meeting types",
            });
        }
    }
);

// Create meeting type
router.post(
    "/:workspaceId/meeting-types",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const userId = (req as any).user?.id;

            const meetingType = new MeetingType({
                workspaceId: new Types.ObjectId(workspaceId),
                createdBy: new Types.ObjectId(userId),
                ...req.body,
            });

            await meetingType.save();

            res.status(201).json({
                success: true,
                data: meetingType,
                message: "Meeting type created successfully",
            });
        } catch (error: any) {
            console.error("Error creating meeting type:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to create meeting type",
            });
        }
    }
);

// Update meeting type
router.put(
    "/:workspaceId/meeting-types/:typeId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, typeId } = req.params;

            const meetingType = await MeetingType.findOneAndUpdate(
                {
                    _id: new Types.ObjectId(typeId),
                    workspaceId: new Types.ObjectId(workspaceId),
                },
                req.body,
                { new: true }
            );

            if (!meetingType) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting type not found",
                });
            }

            res.json({
                success: true,
                data: meetingType,
                message: "Meeting type updated successfully",
            });
        } catch (error: any) {
            console.error("Error updating meeting type:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to update meeting type",
            });
        }
    }
);

// Delete meeting type
router.delete(
    "/:workspaceId/meeting-types/:typeId",
    authenticate,
    async (req: Request, res: Response) => {
        try {
            const { workspaceId, typeId } = req.params;

            const result = await MeetingType.deleteOne({
                _id: new Types.ObjectId(typeId),
                workspaceId: new Types.ObjectId(workspaceId),
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Meeting type not found",
                });
            }

            res.json({
                success: true,
                message: "Meeting type deleted successfully",
            });
        } catch (error: any) {
            console.error("Error deleting meeting type:", error);
            res.status(500).json({
                success: false,
                error: error.message || "Failed to delete meeting type",
            });
        }
    }
);

export default router;

