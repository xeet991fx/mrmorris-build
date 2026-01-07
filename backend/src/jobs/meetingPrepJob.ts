import { Queue, Worker } from 'bullmq';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import CalendarEvent from '../models/CalendarEvent';
import { invokeAgent } from '../agents';

// Get AINotification model at runtime to avoid import issues
const getAINotificationModel = () => mongoose.model('AINotification');

/**
 * Meeting Prep Job
 * 
 * Proactively generates meeting briefings 2 hours before calendar events.
 * Uses the briefingAgent to create comprehensive preparation materials.
 */

// Create meeting prep queue
const meetingPrepQueue = new Queue('meeting-prep', defaultQueueOptions);

/**
 * Start meeting prep job scheduler
 * Runs every 15 minutes to check for upcoming meetings
 */
export const startMeetingPrepJob = async () => {
    try {
        // Remove any existing repeatable jobs first
        const repeatableJobs = await meetingPrepQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await meetingPrepQueue.removeRepeatableByKey(job.key);
        }

        // Check for upcoming meetings every 15 minutes
        await meetingPrepQueue.add(
            'check-upcoming-meetings',
            {},
            {
                repeat: {
                    pattern: '*/15 * * * *', // Every 15 minutes
                },
                removeOnComplete: {
                    count: 20,
                },
                removeOnFail: {
                    count: 50,
                },
            }
        );

        console.log('✅ Meeting prep job scheduled (every 15 minutes)');
    } catch (error) {
        console.error('❌ Failed to start meeting prep job:', error);
    }
};

/**
 * Worker to process meeting prep jobs
 */
const meetingPrepWorker = new Worker(
    'meeting-prep',
    async (job) => {
        console.log('🎯 Checking for upcoming meetings that need briefings...');

        try {
            const now = new Date();
            const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
            const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

            // Find meetings starting in 2-3 hours that haven't had briefings generated
            const upcomingMeetings = await CalendarEvent.find({
                startTime: {
                    $gte: twoHoursFromNow,
                    $lte: threeHoursFromNow,
                },
                status: 'confirmed',
                briefingGenerated: { $ne: true },
            }).populate('contactId companyId opportunityId');

            console.log(`📅 Found ${upcomingMeetings.length} meetings needing briefings`);

            let briefingsGenerated = 0;

            for (const meeting of upcomingMeetings) {
                try {
                    // Build meeting context for briefing agent
                    const attendeeNames = meeting.attendees?.map(a => a.name || a.email).join(', ') || 'Unknown attendees';
                    const prompt = `Prepare me for my meeting: "${meeting.title}" with ${attendeeNames}. The meeting is ${meeting.description ? `about: ${meeting.description}` : 'scheduled soon'}.`;

                    // Invoke async to not block
                    console.log(`🤖 Generating briefing for: ${meeting.title}`);

                    const result = await invokeAgent(
                        prompt,
                        meeting.workspaceId.toString(),
                        meeting.userId.toString(),
                        undefined,
                        25000 // 25 second timeout
                    );

                    if (result.response && !result.error) {
                        // Mark briefing as generated
                        await CalendarEvent.findByIdAndUpdate(meeting._id, {
                            briefingGenerated: true,
                            briefingGeneratedAt: new Date(),
                        });

                        // Create AI notification for the user
                        await getAINotificationModel().create({
                            workspaceId: meeting.workspaceId,
                            userId: meeting.userId,
                            type: 'meeting_prep',
                            title: `Meeting Brief: ${meeting.title}`,
                            message: result.response.substring(0, 500) + (result.response.length > 500 ? '...' : ''),
                            fullContent: result.response,
                            priority: 'high',
                            contextType: 'calendar_event',
                            contextId: meeting._id,
                            metadata: {
                                meetingTitle: meeting.title,
                                meetingTime: meeting.startTime,
                                attendees: attendeeNames,
                            },
                            expiresAt: meeting.endTime, // Expire after meeting ends
                        });

                        briefingsGenerated++;
                        console.log(`✅ Briefing generated for: ${meeting.title}`);
                    }
                } catch (meetingError: any) {
                    console.error(`❌ Failed to generate briefing for meeting ${meeting._id}:`, meetingError.message);
                }
            }

            console.log(`✅ Meeting prep complete: ${briefingsGenerated} briefings generated`);

            return {
                success: true,
                meetingsChecked: upcomingMeetings.length,
                briefingsGenerated,
                timestamp: new Date().toISOString(),
            };
        } catch (error: any) {
            console.error('❌ Meeting prep job failed:', error);
            throw new Error(`Meeting prep failed: ${error.message}`);
        }
    },
    {
        ...defaultWorkerOptions,
        concurrency: 1,
    }
);

// Event handlers
meetingPrepWorker.on('completed', (job, result) => {
    if (result.briefingsGenerated > 0) {
        console.log(`🎯 Meeting prep job completed:`, {
            jobId: job.id,
            briefingsGenerated: result.briefingsGenerated,
        });
    }
});

meetingPrepWorker.on('failed', (job, error) => {
    console.error(`❌ Meeting prep job failed:`, {
        jobId: job?.id,
        error: error.message,
    });
});

meetingPrepWorker.on('error', (error) => {
    console.error('❌ Meeting prep worker error:', error);
});

export { meetingPrepQueue, meetingPrepWorker };
