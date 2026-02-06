/**
 * Google Meet Routes
 *
 * Handles Google Meet integration endpoints:
 * - Create Google Meet for meetings
 * - Get Google Meet details
 * - Recording management
 * - OAuth flow for Google Calendar access
 */

import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { googleMeetService } from '../services/googleMeetService';
import Meeting from '../models/Meeting';
import MeetingScheduler from '../models/MeetingScheduler';
import User from '../models/User';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================
// GOOGLE OAUTH ENDPOINTS
// ============================================

/**
 * GET /google/auth-url
 * Get Google OAuth URL for connecting Google Calendar
 */
router.get('/google/auth-url', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const state = JSON.stringify({
            userId: req.user.id,
            returnUrl: req.query.returnUrl || '/',
        });

        const authUrl = googleMeetService.generateAuthUrl(
            Buffer.from(state).toString('base64')
        );

        res.json({
            success: true,
            data: { authUrl },
        });
    } catch (error: any) {
        logger.error('Failed to generate Google auth URL', {
            error: error.message,
            userId: req.user.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to generate authentication URL',
        });
    }
});

/**
 * GET /google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req: any, res: Response) => {
    try {
        const { code, state } = req.query;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Authorization code is required',
            });
        }

        // Get tokens from code
        const tokens = await googleMeetService.getTokensFromCode(code as string);

        // Decode state to get userId and returnUrl
        let stateData = { userId: '', returnUrl: '/' };
        if (state) {
            try {
                stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
            } catch {
                // Invalid state, continue without it
            }
        }

        // Store tokens in user record
        if (stateData.userId) {
            await User.findByIdAndUpdate(stateData.userId, {
                'googleTokens.accessToken': tokens.access_token,
                'googleTokens.refreshToken': tokens.refresh_token,
                'googleTokens.expiryDate': tokens.expiry_date,
                'googleTokens.connectedAt': new Date(),
            });

            logger.info('Google account connected', {
                userId: stateData.userId,
            });
        }

        // Redirect to frontend
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}${stateData.returnUrl}?google_connected=true`;

        res.redirect(redirectUrl);
    } catch (error: any) {
        logger.error('Google OAuth callback failed', {
            error: error.message,
        });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}?google_error=${encodeURIComponent(error.message)}`);
    }
});

/**
 * POST /google/disconnect
 * Disconnect Google account
 */
router.post('/google/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        await User.findByIdAndUpdate(req.user.id, {
            $unset: {
                'googleTokens.accessToken': '',
                'googleTokens.refreshToken': '',
                'googleTokens.expiryDate': '',
            },
            'googleTokens.connectedAt': null,
        });

        res.json({
            success: true,
            message: 'Google account disconnected',
        });
    } catch (error: any) {
        logger.error('Failed to disconnect Google account', {
            error: error.message,
            userId: req.user.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to disconnect Google account',
        });
    }
});

/**
 * GET /google/status
 * Check Google connection status
 */
router.get('/google/status', authenticate, async (req: AuthRequest, res: Response) => {
    try {
        const user = await User.findById(req.user.id).select('googleTokens');

        const connected = !!(
            user?.googleTokens?.accessToken && user?.googleTokens?.refreshToken
        );

        res.json({
            success: true,
            data: {
                connected,
                connectedAt: user?.googleTokens?.connectedAt,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'Failed to check Google status',
        });
    }
});

// ============================================
// GOOGLE MEET ENDPOINTS
// ============================================

/**
 * POST /:workspaceId/meetings/:meetingId/google-meet
 * Create Google Meet for a meeting
 */
router.post(
    '/:workspaceId/meetings/:meetingId/google-meet',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            // Get user's Google tokens
            const user = await User.findById(req.user.id).select('googleTokens');

            if (!user?.googleTokens?.accessToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Please connect your Google account first',
                    code: 'GOOGLE_NOT_CONNECTED',
                });
            }

            // Verify meeting exists and belongs to workspace
            const meeting = await Meeting.findOne({
                _id: meetingId,
                workspaceId,
            });

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            // Check if meeting already has Google Meet
            if (meeting.googleMeet?.hangoutLink) {
                return res.status(400).json({
                    success: false,
                    error: 'Meeting already has a Google Meet link',
                    data: meeting.googleMeet,
                });
            }

            // Create Google Meet
            const googleMeetData = await googleMeetService.createMeetForMeeting(
                meetingId,
                {
                    access_token: user.googleTokens.accessToken,
                    refresh_token: user.googleTokens.refreshToken,
                    expiry_date: user.googleTokens.expiryDate,
                }
            );

            res.json({
                success: true,
                data: googleMeetData,
            });
        } catch (error: any) {
            logger.error('Failed to create Google Meet', {
                error: error.message,
                meetingId: req.params.meetingId,
            });
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to create Google Meet',
            });
        }
    }
);

/**
 * GET /:workspaceId/meetings/:meetingId/google-meet
 * Get Google Meet details for a meeting
 */
router.get(
    '/:workspaceId/meetings/:meetingId/google-meet',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            const meeting = await Meeting.findOne({
                _id: meetingId,
                workspaceId,
            }).select('googleMeet calendarEventId');

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            if (!meeting.googleMeet) {
                return res.status(404).json({
                    success: false,
                    error: 'No Google Meet associated with this meeting',
                });
            }

            res.json({
                success: true,
                data: meeting.googleMeet,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to get Google Meet details',
            });
        }
    }
);

/**
 * DELETE /:workspaceId/meetings/:meetingId/google-meet
 * Remove Google Meet from a meeting (cancels the calendar event)
 */
router.delete(
    '/:workspaceId/meetings/:meetingId/google-meet',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            // Get user's Google tokens
            const user = await User.findById(req.user.id).select('googleTokens');

            if (!user?.googleTokens?.accessToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Please connect your Google account first',
                });
            }

            const meeting = await Meeting.findOne({
                _id: meetingId,
                workspaceId,
            });

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            if (!meeting.calendarEventId) {
                return res.status(400).json({
                    success: false,
                    error: 'No Google Calendar event to delete',
                });
            }

            // Delete the calendar event
            await googleMeetService.deleteMeeting(
                {
                    access_token: user.googleTokens.accessToken,
                    refresh_token: user.googleTokens.refreshToken,
                    expiry_date: user.googleTokens.expiryDate,
                },
                meeting.calendarEventId
            );

            // Update meeting record
            await Meeting.findByIdAndUpdate(meetingId, {
                $unset: {
                    googleMeet: '',
                    calendarEventId: '',
                },
            });

            res.json({
                success: true,
                message: 'Google Meet removed from meeting',
            });
        } catch (error: any) {
            logger.error('Failed to delete Google Meet', {
                error: error.message,
                meetingId: req.params.meetingId,
            });
            res.status(500).json({
                success: false,
                error: 'Failed to remove Google Meet',
            });
        }
    }
);

// ============================================
// RECORDING ENDPOINTS
// ============================================

/**
 * GET /:workspaceId/recordings
 * List all recordings for a workspace
 */
router.get(
    '/:workspaceId/recordings',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId } = req.params;
            const { startDate, endDate, schedulerId, status } = req.query;

            const query: any = {
                workspaceId,
                'googleMeet.recording.status': status || 'completed',
            };

            if (schedulerId) {
                query.schedulerId = schedulerId;
            }
            if (startDate) {
                query.scheduledAt = { $gte: new Date(startDate as string) };
            }
            if (endDate) {
                query.scheduledAt = {
                    ...query.scheduledAt,
                    $lte: new Date(endDate as string),
                };
            }

            const meetings = await Meeting.find(query)
                .populate('schedulerId', 'name')
                .populate('hostUserId', 'name email')
                .select('attendee scheduledAt duration googleMeet schedulerId hostUserId')
                .sort({ scheduledAt: -1 })
                .limit(50);

            const recordings = meetings.map((meeting) => ({
                meetingId: meeting._id,
                attendee: meeting.attendee,
                scheduledAt: meeting.scheduledAt,
                duration: meeting.duration,
                scheduler: (meeting.schedulerId as any)?.name,
                host: (meeting.hostUserId as any)?.name,
                recording: meeting.googleMeet?.recording,
            }));

            res.json({
                success: true,
                data: recordings,
            });
        } catch (error: any) {
            logger.error('Failed to list recordings', {
                error: error.message,
                workspaceId: req.params.workspaceId,
            });
            res.status(500).json({
                success: false,
                error: 'Failed to list recordings',
            });
        }
    }
);

/**
 * GET /:workspaceId/meetings/:meetingId/recording
 * Get recording for a specific meeting
 */
router.get(
    '/:workspaceId/meetings/:meetingId/recording',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;

            const meeting = await Meeting.findOne({
                _id: meetingId,
                workspaceId,
            }).select('googleMeet');

            if (!meeting) {
                return res.status(404).json({
                    success: false,
                    error: 'Meeting not found',
                });
            }

            if (!meeting.googleMeet?.recording) {
                return res.status(404).json({
                    success: false,
                    error: 'No recording available for this meeting',
                });
            }

            res.json({
                success: true,
                data: meeting.googleMeet.recording,
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                error: 'Failed to get recording',
            });
        }
    }
);

/**
 * POST /:workspaceId/meetings/:meetingId/recording/share
 * Share recording with specific users
 */
router.post(
    '/:workspaceId/meetings/:meetingId/recording/share',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { workspaceId, meetingId } = req.params;
            const { emails } = req.body;

            if (!emails || !Array.isArray(emails) || emails.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Please provide email addresses to share with',
                });
            }

            // Get user's Google tokens
            const user = await User.findById(req.user.id).select('googleTokens');

            if (!user?.googleTokens?.accessToken) {
                return res.status(400).json({
                    success: false,
                    error: 'Please connect your Google account first',
                });
            }

            const meeting = await Meeting.findOne({
                _id: meetingId,
                workspaceId,
            });

            if (!meeting?.googleMeet?.recording?.driveFileId) {
                return res.status(404).json({
                    success: false,
                    error: 'No recording available to share',
                });
            }

            await googleMeetService.shareRecording(
                {
                    access_token: user.googleTokens.accessToken,
                    refresh_token: user.googleTokens.refreshToken,
                    expiry_date: user.googleTokens.expiryDate,
                },
                meeting.googleMeet.recording.driveFileId,
                emails
            );

            res.json({
                success: true,
                message: 'Recording shared successfully',
            });
        } catch (error: any) {
            logger.error('Failed to share recording', {
                error: error.message,
                meetingId: req.params.meetingId,
            });
            res.status(500).json({
                success: false,
                error: 'Failed to share recording',
            });
        }
    }
);

/**
 * POST /:workspaceId/meetings/:meetingId/recording/status
 * Update recording status (for webhook or manual updates)
 */
router.post(
    '/:workspaceId/meetings/:meetingId/recording/status',
    authenticate,
    async (req: AuthRequest, res: Response) => {
        try {
            const { meetingId } = req.params;
            const { status, driveFileId, driveFileUrl, duration } = req.body;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    error: 'Recording status is required',
                });
            }

            await googleMeetService.updateRecordingStatus(meetingId, status, {
                driveFileId,
                driveFileUrl,
                duration,
            });

            res.json({
                success: true,
                message: 'Recording status updated',
            });
        } catch (error: any) {
            logger.error('Failed to update recording status', {
                error: error.message,
                meetingId: req.params.meetingId,
            });
            res.status(500).json({
                success: false,
                error: 'Failed to update recording status',
            });
        }
    }
);

export default router;
