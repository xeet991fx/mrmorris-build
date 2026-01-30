import { Queue, Worker } from 'bullmq';
import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { defaultQueueOptions, defaultWorkerOptions } from '../events/queue/queue.config';
import CalendarEvent from '../models/CalendarEvent';
import { invokeAgentV2 as invokeAgent } from '../agents';

// Get AINotification model at runtime to avoid import issues
const getAINotificationModel = () => mongoose.model('AINotification');

/**
 * Meeting Prep Job
 *
 * Proactively generates meeting briefings 2 hours before calendar events.
 * Uses the briefingAgent to create comprehensive preparation materials.
 * Creates individual briefing jobs per meeting for better parallelization.
 */

// Create meeting prep queue
const meetingPrepQueue = new Queue('meeting-prep', defaultQueueOptions);

/**
 * Start meeting prep job scheduler
 * Creates individual briefing jobs for each upcoming meeting every 15 minutes
 */
export const startMeetingPrepJob = async () => {
    try {
        // Remove any existing repeatable jobs first
        const repeatableJobs = await meetingPrepQueue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await meetingPrepQueue.removeRepeatableByKey(job.key);
        }

        // Scheduler checks for upcoming meetings every 15 minutes
        await meetingPrepQueue.add(
            'schedule-meeting-briefings',
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

        console.log('✅ Meeting prep job scheduler started (creates per-meeting briefing jobs every 15 minutes)');
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
        // Handle scheduler job - creates individual briefing jobs per meeting
        if (job.name === 'schedule-meeting-briefings') {
            console.log('🎯 Scheduling per-meeting briefing jobs...');

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

                if (upcomingMeetings.length === 0) {
                    return {
                        success: true,
                        briefingsScheduled: 0,
                        timestamp: new Date().toISOString(),
                    };
                }

                // Create individual briefing job for each meeting
                const jobPromises = upcomingMeetings.map((meeting) => {
                    const attendeeNames = meeting.attendees?.map(a => a.name || a.email).join(', ') || 'Unknown attendees';

                    return meetingPrepQueue.add(
                        `generate-briefing-${meeting._id}`,
                        {
                            meetingId: meeting._id.toString(),
                            meetingTitle: meeting.title,
                            workspaceId: meeting.workspaceId.toString(),
                            userId: meeting.userId.toString(),
                            attendees: attendeeNames,
                            description: meeting.description,
                            startTime: meeting.startTime,
                            endTime: meeting.endTime,
                        },
                        {
                            removeOnComplete: {
                                count: 5, // Keep last 5 completed briefings per meeting
                            },
                            removeOnFail: {
                                count: 10, // Keep last 10 failed briefings for debugging
                            },
                            attempts: 2, // Retry once if failed
                            backoff: {
                                type: 'exponential',
                                delay: 5000, // 5 seconds
                            },
                        }
                    );
                });

                await Promise.all(jobPromises);

                console.log(`✅ Created ${upcomingMeetings.length} individual briefing job(s)`);

                return {
                    success: true,
                    briefingsScheduled: upcomingMeetings.length,
                    timestamp: new Date().toISOString(),
                };
            } catch (error: any) {
                console.error('❌ Failed to schedule meeting briefings:', error);
                throw new Error(`Failed to schedule meeting briefings: ${error.message}`);
            }
        }

        // Handle individual meeting briefing job
        if (job.name.startsWith('generate-briefing-')) {
            const { meetingId, meetingTitle, workspaceId, userId, attendees, description, endTime } = job.data;

            console.log(`🤖 Generating briefing for: ${meetingTitle}`);

            try {
                // Build meeting context for briefing agent
                const prompt = `Prepare me for my meeting: "${meetingTitle}" with ${attendees}. The meeting is ${description ? `about: ${description}` : 'scheduled soon'}.`;

                const result = await invokeAgent(
                    prompt,
                    workspaceId,
                    userId,
                    undefined,
                    25000 // 25 second timeout
                );

                if (result.response && !result.error) {
                    // Mark briefing as generated
                    await CalendarEvent.findByIdAndUpdate(meetingId, {
                        briefingGenerated: true,
                        briefingGeneratedAt: new Date(),
                    });

                    // Create AI notification for the user
                    await getAINotificationModel().create({
                        workspaceId,
                        userId,
                        type: 'meeting_prep',
                        title: `Meeting Brief: ${meetingTitle}`,
                        message: result.response.substring(0, 500) + (result.response.length > 500 ? '...' : ''),
                        fullContent: result.response,
                        priority: 'high',
                        contextType: 'calendar_event',
                        contextId: meetingId,
                        metadata: {
                            meetingTitle,
                            meetingTime: job.data.startTime,
                            attendees,
                        },
                        expiresAt: endTime, // Expire after meeting ends
                    });

                    console.log(`✅ Briefing generated for: ${meetingTitle}`);

                    return {
                        success: true,
                        meetingId,
                        meetingTitle,
                        briefingGenerated: true,
                        timestamp: new Date().toISOString(),
                    };
                } else {
                    throw new Error(result.error || 'AI agent returned no response');
                }
            } catch (error: any) {
                console.error(`❌ Failed to generate briefing for meeting ${meetingTitle}:`, error.message);
                throw new Error(`Briefing generation failed for ${meetingTitle}: ${error.message}`);
            }
        }

        // Unknown job type
        throw new Error(`Unknown job type: ${job.name}`);
    },
    {
        ...defaultWorkerOptions,
        concurrency: 5, // Process up to 5 briefings simultaneously (AI calls can be slow)
    }
);

// Event handlers
meetingPrepWorker.on('completed', (job, result) => {
    if (job.name === 'schedule-meeting-briefings') {
        if (result.briefingsScheduled > 0) {
            console.log(`🎯 Meeting briefing scheduler completed:`, {
                jobId: job.id,
                briefingsScheduled: result.briefingsScheduled,
            });
        }
    } else if (job.name.startsWith('generate-briefing-')) {
        console.log(`✅ Meeting briefing completed:`, {
            jobId: job.id,
            meetingTitle: result.meetingTitle,
        });
    }
});

meetingPrepWorker.on('failed', (job, error) => {
    if (job?.name === 'schedule-meeting-briefings') {
        console.error(`❌ Meeting briefing scheduler failed:`, {
            jobId: job?.id,
            error: error.message,
        });
    } else if (job?.name.startsWith('generate-briefing-')) {
        console.error(`❌ Meeting briefing failed:`, {
            jobId: job?.id,
            meetingTitle: job?.data?.meetingTitle,
            error: error.message,
        });
    }
});

meetingPrepWorker.on('error', (error) => {
    console.error('❌ Meeting prep worker error:', error);
});

export { meetingPrepQueue, meetingPrepWorker };
