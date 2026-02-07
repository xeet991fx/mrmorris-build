import { Queue, Worker } from 'bullmq';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import { google } from 'googleapis';
import User from '../models/User';
import Meeting from '../models/Meeting';
import { Recording } from '../models/Recording';
import { logger } from '../utils/logger';

/**
 * Recording Sync Job
 * Automatically syncs Google Meet recordings from Google Drive
 * Runs every 5 minutes to check for new recordings
 */

// Create recording sync queue
const recordingSyncQueue = new Queue('recording-sync', defaultQueueOptions);

// Track last sync time per user to avoid re-processing
const MEET_RECORDINGS_FOLDER_NAME = 'Meet Recordings';

/**
 * Start recording sync job scheduler
 */
export const startRecordingSyncJob = async () => {
    try {
        // Remove any existing repeatable jobs
        const repeatableJobs = await recordingSyncQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await recordingSyncQueue.removeRepeatableByKey(job.key);
        }

        // Add scheduler job that runs every 5 minutes
        await recordingSyncQueue.add(
            'schedule-recording-syncs',
            {},
            {
                repeat: {
                    pattern: '*/5 * * * *', // Every 5 minutes
                },
                removeOnComplete: { count: 10 },
                removeOnFail: { count: 50 },
            }
        );

        console.log('✅ Recording sync job scheduler started (syncs new recordings every 5 minutes)');
    } catch (error) {
        console.error('❌ Failed to start recording sync job:', error);
    }
};

/**
 * Find the Meet Recordings folder in a user's Google Drive
 */
async function findMeetRecordingsFolder(drive: any): Promise<string | null> {
    try {
        const response = await drive.files.list({
            q: `name = '${MEET_RECORDINGS_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (response.data.files && response.data.files.length > 0) {
            return response.data.files[0].id;
        }
        return null;
    } catch (error) {
        logger.error('Failed to find Meet Recordings folder', { error });
        return null;
    }
}

/**
 * Get new recording files from the Meet Recordings folder
 */
async function getNewRecordingFiles(
    drive: any,
    folderId: string,
    sinceTime: Date
): Promise<any[]> {
    try {
        const response = await drive.files.list({
            q: `'${folderId}' in parents and mimeType contains 'video/' and createdTime > '${sinceTime.toISOString()}' and trashed = false`,
            fields: 'files(id, name, mimeType, size, webViewLink, createdTime, videoMediaMetadata)',
            orderBy: 'createdTime desc',
        });

        return response.data.files || [];
    } catch (error) {
        logger.error('Failed to list recording files', { error });
        return [];
    }
}

/**
 * Match a recording file to a meeting by timestamp
 */
async function matchRecordingToMeeting(
    workspaceId: string,
    fileCreatedTime: Date,
    fileName: string
): Promise<any | null> {
    // Look for meetings that occurred around the time the recording was created
    // Meeting could have started up to 3 hours before the recording was saved
    const meetingSearchStart = new Date(fileCreatedTime.getTime() - 3 * 60 * 60 * 1000);
    const meetingSearchEnd = new Date(fileCreatedTime.getTime() + 30 * 60 * 1000);

    const meetings = await Meeting.find({
        'schedulerId.workspaceId': workspaceId,
        scheduledAt: {
            $gte: meetingSearchStart,
            $lte: meetingSearchEnd,
        },
        'googleMeet.meetingUri': { $exists: true },
        'googleMeet.recording.status': { $ne: 'completed' },
    }).populate('schedulerId');

    if (meetings.length === 0) {
        return null;
    }

    // If only one meeting, return it
    if (meetings.length === 1) {
        return meetings[0];
    }

    // Try to match by name if multiple meetings
    const fileNameLower = fileName.toLowerCase();
    for (const meeting of meetings) {
        const scheduler = meeting.schedulerId as any;
        if (scheduler?.name && fileNameLower.includes(scheduler.name.toLowerCase())) {
            return meeting;
        }
        if (meeting.attendee?.name && fileNameLower.includes(meeting.attendee.name.toLowerCase())) {
            return meeting;
        }
    }

    // Default to the closest meeting by time
    return meetings[0];
}

/**
 * Sync a single recording file to the database
 */
async function syncRecordingFile(
    user: any,
    file: any,
    meeting: any
): Promise<boolean> {
    try {
        // Check if recording already exists
        const existingRecording = await Recording.findOne({
            driveFileId: file.id,
        });

        if (existingRecording) {
            return false; // Already synced
        }

        const scheduler = meeting.schedulerId as any;
        const recordingDuration = file.videoMediaMetadata?.durationMillis
            ? Math.floor(file.videoMediaMetadata.durationMillis / 1000)
            : 0;

        // Create recording
        const recording = new Recording({
            workspaceId: scheduler.workspaceId,
            meetingId: meeting._id,
            schedulerId: scheduler._id,
            hostUserId: meeting.hostUserId || user._id,
            meetingTitle: `${scheduler.name} - ${meeting.attendee?.name || 'Meeting'}`,
            scheduledAt: meeting.scheduledAt,
            meetingDuration: meeting.duration,
            attendees: meeting.attendee ? [{
                name: meeting.attendee.name,
                email: meeting.attendee.email,
            }] : [],
            driveFileId: file.id,
            driveFileUrl: file.webViewLink,
            fileName: file.name,
            mimeType: file.mimeType || 'video/mp4',
            fileSize: parseInt(file.size || '0'),
            recordingDuration,
            recordedAt: new Date(file.createdTime),
            recordingStartTime: new Date(file.createdTime),
            status: 'ready',
            accessLevel: scheduler.recordingSettings?.accessLevel || 'host',
        });

        await recording.save();

        // Update meeting with recording info
        await Meeting.findByIdAndUpdate(meeting._id, {
            'googleMeet.recording.status': 'completed',
            'googleMeet.recording.driveFileId': file.id,
            'googleMeet.recording.driveFileUrl': file.webViewLink,
            'googleMeet.recording.duration': recordingDuration,
        });

        logger.info('Recording auto-synced from Drive', {
            recordingId: recording._id,
            meetingId: meeting._id,
            fileName: file.name,
        });

        return true;
    } catch (error) {
        logger.error('Failed to sync recording file', {
            fileId: file.id,
            meetingId: meeting?._id,
            error,
        });
        return false;
    }
}

/**
 * Sync recordings for a single user
 */
async function syncRecordingsForUser(userId: string, workspaceId: string): Promise<number> {
    const user = await User.findById(userId).select('+googleTokens');

    if (!user?.googleTokens?.accessToken) {
        return 0;
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({
        access_token: user.googleTokens.accessToken,
        refresh_token: user.googleTokens.refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Find Meet Recordings folder
    const folderId = await findMeetRecordingsFolder(drive);
    if (!folderId) {
        return 0;
    }

    // Get recordings from last 24 hours (to avoid re-processing old ones)
    const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const files = await getNewRecordingFiles(drive, folderId, sinceTime);

    let syncedCount = 0;

    for (const file of files) {
        // Check if already in database
        const existing = await Recording.findOne({ driveFileId: file.id });
        if (existing) {
            continue;
        }

        // Try to match to a meeting
        const meeting = await matchRecordingToMeeting(
            workspaceId,
            new Date(file.createdTime),
            file.name
        );

        if (meeting) {
            const synced = await syncRecordingFile(user, file, meeting);
            if (synced) {
                syncedCount++;
            }
        }
    }

    return syncedCount;
}

/**
 * Worker to process recording sync jobs
 */
const recordingSyncWorker = new Worker(
    'recording-sync',
    async (job) => {
        if (job.name === 'schedule-recording-syncs') {
            console.log('🔄 Scanning for new Meet recordings...');

            try {
                // Find all users with Google accounts connected
                const users = await User.find({
                    'googleTokens.accessToken': { $exists: true, $ne: null },
                }).select('_id email workspaceId');

                console.log(`📊 Found ${users.length} user(s) with Google connected`);

                if (users.length === 0) {
                    return {
                        success: true,
                        message: 'No users with Google connected',
                        timestamp: new Date().toISOString(),
                    };
                }

                // Create individual sync jobs per user
                const jobPromises = users.map((user) =>
                    recordingSyncQueue.add(
                        `sync-user-recordings-${user._id}`,
                        {
                            userId: user._id.toString(),
                            email: user.email,
                            workspaceId: (user as any).workspaceId?.toString(),
                        },
                        {
                            removeOnComplete: { count: 5 },
                            removeOnFail: { count: 10 },
                            attempts: 2,
                            backoff: {
                                type: 'exponential',
                                delay: 5000,
                            },
                        }
                    )
                );

                await Promise.all(jobPromises);

                console.log(`✅ Created ${users.length} recording sync job(s)`);

                return {
                    success: true,
                    usersScheduled: users.length,
                    timestamp: new Date().toISOString(),
                };
            } catch (error: any) {
                console.error('❌ Failed to schedule recording syncs:', error);
                throw new Error(`Failed to schedule recording syncs: ${error.message}`);
            }
        }

        // Handle individual user sync job
        if (job.name.startsWith('sync-user-recordings-')) {
            const { userId, email, workspaceId } = job.data;

            console.log(`🔄 Syncing recordings for user: ${email}`);

            try {
                const syncedCount = await syncRecordingsForUser(userId, workspaceId);

                console.log(`✅ Recording sync complete for ${email}: ${syncedCount} recordings synced`);

                return {
                    success: true,
                    userId,
                    email,
                    syncedCount,
                    timestamp: new Date().toISOString(),
                };
            } catch (error: any) {
                console.error(`❌ Recording sync failed for ${email}:`, error);
                throw new Error(`Recording sync failed for ${email}: ${error.message}`);
            }
        }

        throw new Error(`Unknown job type: ${job.name}`);
    },
    {
        ...defaultWorkerOptions,
        concurrency: 5, // Process up to 5 user syncs simultaneously
    }
);

// Event handlers
recordingSyncWorker.on('completed', (job, result) => {
    if (job.name === 'schedule-recording-syncs') {
        console.log('✅ Recording sync scheduler completed:', {
            jobId: job.id,
            usersScheduled: result.usersScheduled,
        });
    } else if (job.name.startsWith('sync-user-recordings-')) {
        if (result.syncedCount > 0) {
            console.log('✅ User recording sync completed:', {
                jobId: job.id,
                email: result.email,
                syncedCount: result.syncedCount,
            });
        }
    }
});

recordingSyncWorker.on('failed', (job, error) => {
    console.error(`❌ Recording sync job failed:`, {
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
    });
});

recordingSyncWorker.on('error', (error) => {
    console.error('❌ Recording sync worker error:', error);
});

export { recordingSyncQueue, recordingSyncWorker };
