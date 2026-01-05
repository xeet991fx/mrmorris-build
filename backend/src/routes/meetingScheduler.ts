/**
 * Meeting Scheduler Routes
 *
 * Handles CRUD operations for meeting schedulers and bookings
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import MeetingScheduler from '../models/MeetingScheduler';
import Meeting from '../models/Meeting';
import { meetingSchedulerService } from '../services/meetingSchedulerService';

const router = express.Router();

// ============================================
// SCHEDULER MANAGEMENT (Authenticated)
// ============================================

/**
 * GET /:workspaceId/meeting-schedulers
 * Get all schedulers for a workspace
 */
router.get('/:workspaceId/meeting-schedulers', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;

            const schedulers = await MeetingScheduler.find({ workspaceId })
                .populate('specificUser assignedUsers', 'name email')
                .sort({ createdAt: -1 });

            res.json({
                success: true,
                data: schedulers,
            });
        } catch (error: any) {
            console.error('Error fetching schedulers:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch schedulers',
            });
        }
    }
);

/**
 * POST /:workspaceId/meeting-schedulers
 * Create a new scheduler
 */
router.post('/:workspaceId/meeting-schedulers', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const schedulerData = req.body;

            const scheduler = await MeetingScheduler.create({
                ...schedulerData,
                workspaceId,
                userId: req.user!._id,
            });

            res.json({
                success: true,
                data: scheduler,
            });
        } catch (error: any) {
            console.error('Error creating scheduler:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create scheduler',
            });
        }
    }
);

/**
 * PUT /:workspaceId/meeting-schedulers/:id
 * Update a scheduler
 */
router.put('/:workspaceId/meeting-schedulers/:id', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const updates = req.body;

            const scheduler = await MeetingScheduler.findOneAndUpdate(
                { _id: id, workspaceId },
                { $set: updates },
                { new: true }
            );

            if (!scheduler) {
                return res.status(404).json({
                    success: false,
                    error: 'Scheduler not found',
                });
            }

            res.json({
                success: true,
                data: scheduler,
            });
        } catch (error: any) {
            console.error('Error updating scheduler:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update scheduler',
            });
        }
    }
);

/**
 * DELETE /:workspaceId/meeting-schedulers/:id
 * Delete a scheduler
 */
router.delete('/:workspaceId/meeting-schedulers/:id', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;

            const scheduler = await MeetingScheduler.findOneAndDelete({
                _id: id,
                workspaceId,
            });

            if (!scheduler) {
                return res.status(404).json({
                    success: false,
                    error: 'Scheduler not found',
                });
            }

            res.json({
                success: true,
                message: 'Scheduler deleted successfully',
            });
        } catch (error: any) {
            console.error('Error deleting scheduler:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to delete scheduler',
            });
        }
    }
);

/**
 * GET /:workspaceId/meetings
 * Get all meetings for a workspace
 */
router.get('/:workspaceId/meetings', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { status, startDate, endDate } = req.query;

            const filter: any = { workspaceId };

            if (status) {
                filter.status = status;
            }

            if (startDate && endDate) {
                filter.scheduledAt = {
                    $gte: new Date(startDate as string),
                    $lte: new Date(endDate as string),
                };
            }

            const meetings = await Meeting.find(filter)
                .populate('schedulerId', 'name slug')
                .populate('hostUserId', 'name email')
                .populate('contactId', 'firstName lastName email')
                .sort({ scheduledAt: -1 });

            res.json({
                success: true,
                data: meetings,
            });
        } catch (error: any) {
            console.error('Error fetching meetings:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch meetings',
            });
        }
    }
);

/**
 * PUT /:workspaceId/meetings/:id
 * Update a meeting (mark as completed, add notes, etc.)
 */
router.put('/:workspaceId/meetings/:id', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const updates = req.body;

            const meeting = await Meeting.findOneAndUpdate(
                { _id: id, workspaceId },
                { $set: updates },
                { new: true }
            );

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            // Update scheduler stats if status changed to completed
            if (updates.status === 'completed') {
                await MeetingScheduler.findByIdAndUpdate(meeting.schedulerId, {
                    $inc: { 'stats.completedMeetings': 1 },
                });
            }

            res.json({
                success: true,
                data: meeting,
            });
        } catch (error: any) {
            console.error('Error updating meeting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to update meeting',
            });
        }
    }
);

/**
 * DELETE /:workspaceId/meetings/:id
 * Cancel a meeting
 */
router.delete('/:workspaceId/meetings/:id', authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, id } = req.params;
            const { reason } = req.body;

            const meeting = await Meeting.findOne({ _id: id, workspaceId });

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            await meetingSchedulerService.cancelMeeting(id, 'host', reason);

            res.json({
                success: true,
                message: 'Meeting cancelled successfully',
            });
        } catch (error: any) {
            console.error('Error cancelling meeting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel meeting',
            });
        }
    }
);

// ============================================
// PUBLIC BOOKING ENDPOINTS (No Auth Required)
// ============================================

/**
 * GET /public/:workspaceId/schedulers/:slug
 * Get public scheduler details
 */
router.get('/public/:workspaceId/schedulers/:slug',
    async (req: any, res: Response) => {
        try {
            const { workspaceId, slug } = req.params;

            const scheduler = await MeetingScheduler.findOne({
                workspaceId,
                slug,
                isActive: true,
            }).select('-stats -userId');

            if (!scheduler) {
                return res.status(404).json({
                    success: false,
                    error: 'Scheduler not found',
                });
            }

            res.json({
                success: true,
                data: scheduler,
            });
        } catch (error: any) {
            console.error('Error fetching public scheduler:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch scheduler',
            });
        }
    }
);

/**
 * GET /public/:workspaceId/schedulers/:slug/slots
 * Get available time slots
 */
router.get('/public/:workspaceId/schedulers/:slug/slots',
    async (req: any, res: Response) => {
        try {
            const { workspaceId, slug } = req.params;
            const { startDate, endDate, timezone } = req.query;

            const scheduler = await MeetingScheduler.findOne({
                workspaceId,
                slug,
                isActive: true,
            });

            if (!scheduler) {
                return res.status(404).json({
                    success: false,
                    error: 'Scheduler not found',
                });
            }

            const start = startDate ? new Date(startDate as string) : new Date();
            const end = endDate ? new Date(endDate as string) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            const slots = await meetingSchedulerService.getAvailableSlots(
                scheduler._id.toString(),
                start,
                end,
                timezone as string
            );

            res.json({
                success: true,
                data: slots,
            });
        } catch (error: any) {
            console.error('Error fetching available slots:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch available slots',
            });
        }
    }
);

/**
 * POST /public/:workspaceId/schedulers/:slug/book
 * Book a meeting (public endpoint)
 */
router.post('/public/:workspaceId/schedulers/:slug/book',
    async (req: any, res: Response) => {
        try {
            const { workspaceId, slug } = req.params;
            const { selectedSlot, attendee, qualificationAnswers, utmParams } = req.body;

            if (!selectedSlot || !selectedSlot.start || !selectedSlot.end) {
                return res.status(400).json({
                    success: false,
                    error: 'Selected time slot is required',
                });
            }

            if (!attendee || !attendee.name || !attendee.email) {
                return res.status(400).json({
                    success: false,
                    error: 'Attendee name and email are required',
                });
            }

            const result = await meetingSchedulerService.createBooking({
                schedulerSlug: slug,
                workspaceId,
                selectedSlot: {
                    start: new Date(selectedSlot.start),
                    end: new Date(selectedSlot.end),
                },
                attendee,
                qualificationAnswers,
                utmParams,
            });

            res.json({
                success: true,
                message: result.message,
                data: {
                    meetingId: result.meeting._id,
                    scheduledAt: result.meeting.scheduledAt,
                    location: result.meeting.location,
                },
            });
        } catch (error: any) {
            console.error('Error booking meeting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to book meeting',
            });
        }
    }
);

/**
 * POST /public/meetings/:id/cancel
 * Cancel a meeting (public endpoint with email verification)
 */
router.post('/public/meetings/:id/cancel',
    async (req: any, res: Response) => {
        try {
            const { id } = req.params;
            const { email, reason } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    error: 'Email is required to cancel meeting',
                });
            }

            const meeting = await Meeting.findById(id);

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            // Verify email matches
            if (meeting.attendee.email.toLowerCase() !== email.toLowerCase()) {
                return res.status(403).json({
                    success: false,
                    error: 'Email does not match meeting attendee',
                });
            }

            await meetingSchedulerService.cancelMeeting(id, 'attendee', reason);

            res.json({
                success: true,
                message: 'Meeting cancelled successfully',
            });
        } catch (error: any) {
            console.error('Error cancelling meeting:', error);
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to cancel meeting',
            });
        }
    }
);

export default router;
