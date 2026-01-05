/**
 * Meeting Scheduler Service
 *
 * Core booking logic for meeting scheduling
 * - Find available slots
 * - Create bookings with qualification
 * - Round-robin team assignment
 * - Send confirmations and reminders
 */

import { Types } from 'mongoose';
import MeetingScheduler from '../models/MeetingScheduler';
import Meeting from '../models/Meeting';
import Contact from '../models/Contact';
import { calendarService } from './CalendarService';
import emailService from './email';
import getRedisClient from '../config/redis';
import { dayjs, toTimezone, formatForDisplay } from '../utils/timezone';

interface BookingRequest {
    schedulerSlug: string;
    workspaceId: string;
    selectedSlot: {
        start: Date;
        end: Date;
    };
    attendee: {
        name: string;
        email: string;
        phone?: string;
        timezone?: string;
    };
    qualificationAnswers?: Record<string, any>;
    utmParams?: {
        source?: string;
        medium?: string;
        campaign?: string;
    };
}

interface AvailableSlot {
    start: Date;
    end: Date;
    hostUserId: string;
    hostName: string;
}

export class MeetingSchedulerService {
    private readonly ROUND_ROBIN_KEY_PREFIX = 'meeting:roundrobin:';

    /**
     * Get available time slots for a scheduler
     */
    async getAvailableSlots(
        schedulerId: string,
        startDate: Date,
        endDate: Date,
        attendeeTimezone?: string
    ): Promise<AvailableSlot[]> {
        const scheduler = await MeetingScheduler.findById(schedulerId).populate('assignedUsers specificUser');

        if (!scheduler || !scheduler.isActive) {
            throw new Error('Scheduler not found or inactive');
        }

        // Get host users based on assignment type
        const hostUsers = this.getHostUsers(scheduler);

        if (hostUsers.length === 0) {
            throw new Error('No hosts available for this scheduler');
        }

        const allSlots: AvailableSlot[] = [];

        // For each host, get their available slots
        for (const host of hostUsers) {
            try {
                // Check if calendar integration is enabled
                if (scheduler.calendarIntegration?.checkConflicts && scheduler.calendarIntegration.accountId) {
                    const calendarSlots = await calendarService.getAvailableSlots(
                        scheduler.calendarIntegration.accountId.toString(),
                        startDate,
                        endDate,
                        scheduler.duration,
                        scheduler.availabilityWindows.map(w => ({
                            start: w.startTime,
                            end: w.endTime
                        }))
                    );

                    // Add host info to slots
                    const slotsWithHost = calendarSlots.map(slot => ({
                        ...slot,
                        hostUserId: host._id.toString(),
                        hostName: host.name,
                    }));

                    allSlots.push(...slotsWithHost);
                } else {
                    // Generate slots based on availability windows without calendar check
                    const generatedSlots = this.generateSlotsFromWindows(
                        startDate,
                        endDate,
                        scheduler.availabilityWindows,
                        scheduler.duration,
                        scheduler.timezone
                    );

                    const slotsWithHost = generatedSlots.map(slot => ({
                        ...slot,
                        hostUserId: host._id.toString(),
                        hostName: host.name,
                    }));

                    allSlots.push(...slotsWithHost);
                }
            } catch (error: any) {
                console.error(`Error getting slots for host ${host._id}:`, error.message);
                // Continue with other hosts
            }
        }

        // Filter out slots that don't meet minimum notice
        const now = new Date();
        const minNoticeMs = (scheduler.minNotice || 0) * 60 * 60 * 1000;

        const filteredSlots = allSlots.filter(slot => {
            const timeUntilSlot = slot.start.getTime() - now.getTime();
            return timeUntilSlot >= minNoticeMs;
        });

        // Filter out slots beyond max advance booking
        if (scheduler.maxAdvanceBooking) {
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + scheduler.maxAdvanceBooking);

            return filteredSlots.filter(slot => slot.start <= maxDate);
        }

        return filteredSlots;
    }

    /**
     * Create a new meeting booking
     */
    async createBooking(request: BookingRequest): Promise<{ meeting: any; message: string }> {
        // Get scheduler
        const scheduler = await MeetingScheduler.findOne({
            workspaceId: request.workspaceId,
            slug: request.schedulerSlug,
            isActive: true,
        }).populate('assignedUsers specificUser');

        if (!scheduler) {
            throw new Error('Scheduler not found or inactive');
        }

        // Validate time slot
        await this.validateTimeSlot(scheduler, request.selectedSlot);

        // Check qualification if enabled
        let qualified = true;
        let qualificationScore = 100;

        if (scheduler.enableQualification && scheduler.qualificationQuestions) {
            const qualResult = this.checkQualification(
                scheduler.qualificationQuestions,
                request.qualificationAnswers || {}
            );

            qualified = qualResult.qualified;
            qualificationScore = qualResult.score;

            if (!qualified && scheduler.autoDisqualify) {
                throw new Error('Thank you for your interest. Based on your responses, this may not be the best fit at this time.');
            }
        }

        // Assign host (round-robin or specific)
        const hostUserId = await this.assignHost(scheduler);

        // Create or update contact
        let contactId: Types.ObjectId | undefined;
        try {
            const existingContact = await Contact.findOne({
                workspaceId: scheduler.workspaceId,
                email: request.attendee.email,
            });

            if (existingContact) {
                contactId = existingContact._id as Types.ObjectId;
                // Update contact with latest info
                await Contact.findByIdAndUpdate(contactId, {
                    $set: {
                        firstName: request.attendee.name.split(' ')[0],
                        lastName: request.attendee.name.split(' ').slice(1).join(' '),
                        phone: request.attendee.phone,
                        status: 'prospect',
                    },
                });
            } else {
                const contact = await Contact.create({
                    workspaceId: scheduler.workspaceId,
                    userId: scheduler.userId,
                    firstName: request.attendee.name.split(' ')[0],
                    lastName: request.attendee.name.split(' ').slice(1).join(' '),
                    email: request.attendee.email,
                    phone: request.attendee.phone,
                    source: 'meeting_scheduler',
                    status: 'prospect',
                });
                contactId = contact._id as Types.ObjectId;
            }
        } catch (error: any) {
            console.error('Error creating/updating contact:', error.message);
        }

        // Create calendar event if integration enabled
        let calendarEventId: string | undefined;
        let meetLink: string | undefined;

        if (scheduler.calendarIntegration?.accountId) {
            try {
                const result = await calendarService.createEvent(
                    scheduler.calendarIntegration.accountId.toString(),
                    {
                        summary: `${scheduler.name} - ${request.attendee.name}`,
                        description: scheduler.description || `Meeting scheduled via ${scheduler.name}`,
                        start: {
                            dateTime: request.selectedSlot.start.toISOString(),
                            timeZone: scheduler.timezone,
                        },
                        end: {
                            dateTime: request.selectedSlot.end.toISOString(),
                            timeZone: scheduler.timezone,
                        },
                        attendees: [
                            {
                                email: request.attendee.email,
                                displayName: request.attendee.name,
                            },
                        ],
                    },
                    scheduler.location.type === 'google_meet'
                );

                calendarEventId = result.eventId;
                meetLink = result.meetLink;
            } catch (error: any) {
                console.error('Error creating calendar event:', error.message);
                // Continue without calendar event
            }
        }

        // Determine meeting location
        let locationDetails = scheduler.location.details || '';
        if (scheduler.location.type === 'google_meet' && meetLink) {
            locationDetails = meetLink;
        }

        // Create meeting record
        const meeting = await Meeting.create({
            workspaceId: scheduler.workspaceId,
            schedulerId: scheduler._id,
            contactId,
            attendee: {
                name: request.attendee.name,
                email: request.attendee.email,
                phone: request.attendee.phone,
                timezone: request.attendee.timezone || scheduler.timezone,
            },
            hostUserId,
            scheduledAt: request.selectedSlot.start,
            duration: scheduler.duration,
            timezone: scheduler.timezone,
            location: {
                type: scheduler.location.type,
                details: locationDetails,
            },
            calendarEventId,
            calendarProvider: scheduler.calendarIntegration?.provider,
            qualificationAnswers: request.qualificationAnswers,
            qualified,
            qualificationScore,
            status: 'scheduled',
            bookedAt: new Date(),
            utmSource: request.utmParams?.source,
            utmMedium: request.utmParams?.medium,
            utmCampaign: request.utmParams?.campaign,
        });

        // Update scheduler stats
        await MeetingScheduler.findByIdAndUpdate(scheduler._id, {
            $inc: { 'stats.totalBookings': 1 },
        });

        // Send confirmation email
        if (scheduler.confirmationEmail.enabled) {
            await this.sendConfirmationEmail(meeting, scheduler, request.attendee.timezone);
        }

        console.log(`✅ Meeting booked: ${meeting._id} for ${request.attendee.email}`);

        return {
            meeting,
            message: scheduler.thankYouMessage || 'Meeting scheduled successfully! You will receive a confirmation email shortly.',
        };
    }

    /**
     * Cancel a meeting
     */
    async cancelMeeting(
        meetingId: string,
        cancelledBy: 'attendee' | 'host' | 'system',
        reason?: string
    ): Promise<void> {
        const meeting = await Meeting.findById(meetingId).populate('schedulerId');

        if (!meeting) {
            throw new Error('Meeting not found');
        }

        if (meeting.status !== 'scheduled') {
            throw new Error('Meeting cannot be cancelled (already completed or cancelled)');
        }

        // Cancel calendar event
        if (meeting.calendarEventId && meeting.calendarProvider === 'google') {
            const scheduler = meeting.schedulerId as any;
            if (scheduler.calendarIntegration?.accountId) {
                try {
                    await calendarService.cancelEvent(
                        scheduler.calendarIntegration.accountId.toString(),
                        meeting.calendarEventId
                    );
                } catch (error: any) {
                    console.error('Error cancelling calendar event:', error.message);
                }
            }
        }

        // Update meeting
        await Meeting.findByIdAndUpdate(meetingId, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy,
            cancellationReason: reason,
        });

        // Update scheduler stats
        await MeetingScheduler.findByIdAndUpdate(meeting.schedulerId, {
            $inc: { 'stats.cancelledMeetings': 1 },
        });

        console.log(`✅ Meeting cancelled: ${meetingId}`);
    }

    /**
     * Private helper methods
     */

    private getHostUsers(scheduler: any): any[] {
        if (scheduler.assignmentType === 'specific_user' && scheduler.specificUser) {
            return [scheduler.specificUser];
        }

        if (scheduler.assignmentType === 'round_robin' && scheduler.assignedUsers && scheduler.assignedUsers.length > 0) {
            return scheduler.assignedUsers;
        }

        if (scheduler.assignmentType === 'user_choice' && scheduler.assignedUsers && scheduler.assignedUsers.length > 0) {
            return scheduler.assignedUsers;
        }

        return [];
    }

    private async assignHost(scheduler: any): Promise<Types.ObjectId> {
        if (scheduler.assignmentType === 'specific_user' && scheduler.specificUser) {
            return scheduler.specificUser._id;
        }

        if (scheduler.assignmentType === 'round_robin' && scheduler.assignedUsers && scheduler.assignedUsers.length > 0) {
            // Use Redis for round-robin
            try {
                const redis = getRedisClient();
                const key = `${this.ROUND_ROBIN_KEY_PREFIX}${scheduler._id}`;
                const counter = await redis.incr(key);
                const index = (counter - 1) % scheduler.assignedUsers.length;
                return scheduler.assignedUsers[index]._id;
            } catch (error) {
                // Fallback to first user
                return scheduler.assignedUsers[0]._id;
            }
        }

        // Fallback to owner
        return scheduler.userId;
    }

    private checkQualification(
        questions: any[],
        answers: Record<string, any>
    ): { qualified: boolean; score: number } {
        let totalQuestions = questions.filter(q => q.required).length;
        let disqualified = false;
        let answeredCount = 0;

        for (const question of questions) {
            const answer = answers[question.id];

            if (question.required && !answer) {
                continue;
            }

            if (answer) {
                answeredCount++;

                // Check for disqualification value
                if (question.disqualifyValue && answer === question.disqualifyValue) {
                    disqualified = true;
                }
            }
        }

        const score = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100;

        return {
            qualified: !disqualified && score >= 50,
            score,
        };
    }

    private async validateTimeSlot(scheduler: any, slot: { start: Date; end: Date }): Promise<void> {
        // Check if slot is in the future
        const now = new Date();
        if (slot.start <= now) {
            throw new Error('Selected time slot is in the past');
        }

        // Check minimum notice
        if (scheduler.minNotice) {
            const minNoticeMs = scheduler.minNotice * 60 * 60 * 1000;
            const timeUntilSlot = slot.start.getTime() - now.getTime();
            if (timeUntilSlot < minNoticeMs) {
                throw new Error(`Minimum ${scheduler.minNotice} hours notice required`);
            }
        }

        // Check if slot is already booked
        const existingBooking = await Meeting.findOne({
            schedulerId: scheduler._id,
            scheduledAt: slot.start,
            status: { $in: ['scheduled', 'rescheduled'] },
        });

        if (existingBooking) {
            throw new Error('This time slot is no longer available');
        }
    }

    private generateSlotsFromWindows(
        startDate: Date,
        endDate: Date,
        windows: any[],
        duration: number,
        timezone: string
    ): { start: Date; end: Date }[] {
        const slots: { start: Date; end: Date }[] = [];
        let currentDate = new Date(startDate);

        while (currentDate < endDate) {
            const dayOfWeek = currentDate.getDay();

            // Find windows for this day
            const dayWindows = windows.filter(w => w.dayOfWeek === dayOfWeek);

            for (const window of dayWindows) {
                const [startHour, startMinute] = window.startTime.split(':').map(Number);
                const [endHour, endMinute] = window.endTime.split(':').map(Number);

                let slotStart = new Date(currentDate);
                slotStart.setHours(startHour, startMinute, 0, 0);

                const windowEnd = new Date(currentDate);
                windowEnd.setHours(endHour, endMinute, 0, 0);

                while (slotStart < windowEnd) {
                    const slotEnd = new Date(slotStart);
                    slotEnd.setMinutes(slotEnd.getMinutes() + duration);

                    if (slotEnd <= windowEnd) {
                        slots.push({
                            start: new Date(slotStart),
                            end: new Date(slotEnd),
                        });
                    }

                    slotStart.setMinutes(slotStart.getMinutes() + duration);
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return slots;
    }

    private async sendConfirmationEmail(meeting: any, scheduler: any, attendeeTimezone?: string): Promise<void> {
        try {
            const tz = attendeeTimezone || scheduler.timezone;
            const formattedDate = formatForDisplay(meeting.scheduledAt, tz);

            const subject = scheduler.confirmationEmail.subject || `Meeting Confirmed: ${scheduler.name}`;
            const body = scheduler.confirmationEmail.body ||
                `Your meeting has been confirmed!\n\nDate & Time: ${formattedDate}\nDuration: ${scheduler.duration} minutes\nLocation: ${meeting.location.details}`;

            await emailService.sendEmail({
                to: meeting.attendee.email,
                subject,
                text: body,
                html: body.replace(/\n/g, '<br>'),
            });

            console.log(`✅ Confirmation email sent to ${meeting.attendee.email}`);
        } catch (error: any) {
            console.error('Error sending confirmation email:', error.message);
        }
    }
}

export const meetingSchedulerService = new MeetingSchedulerService();
