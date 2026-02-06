import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Meeting Model
 *
 * Represents an actual booked meeting
 * Tracks scheduling, attendance, and follow-up actions
 * Includes Google Meet integration with recording support
 */

// Google Meet Data Interface
export interface IGoogleMeetData {
    meetingCode: string;           // The meet.google.com/xxx-xxxx-xxx code
    conferenceId: string;          // Google's internal conference ID
    hangoutLink: string;           // Full Google Meet URL
    entryPoints?: {
        uri: string;
        label?: string;
        entryPointType: 'video' | 'phone' | 'sip' | 'more';
    }[];
    recordingEnabled: boolean;
    recording?: {
        status: 'not_started' | 'recording' | 'completed' | 'failed';
        driveFileId?: string;      // Google Drive file ID for recording
        driveFileUrl?: string;     // Shareable link to recording
        recordedAt?: Date;
        duration?: number;          // in seconds
        transcriptFileId?: string;  // Google Drive file ID for transcript
        transcriptUrl?: string;
    };
}

export interface IMeeting extends Document {
    workspaceId: Types.ObjectId;
    schedulerId: Types.ObjectId; // Reference to MeetingScheduler
    contactId?: Types.ObjectId; // Associated contact (if created)

    // Attendee Information
    attendee: {
        name: string;
        email: string;
        phone?: string;
        timezone?: string;
    };

    // Assigned Host
    hostUserId: Types.ObjectId; // User who will host the meeting
    hostEmail?: string; // Email of the host

    // Scheduled Time
    scheduledAt: Date; // Meeting start time (UTC)
    duration: number; // Duration in minutes
    timezone: string; // Timezone in which meeting was booked

    // Location Details
    location: {
        type: 'zoom' | 'google_meet' | 'phone' | 'in_person' | 'custom';
        details: string; // Meeting link, phone number, address, etc.
    };

    // Calendar Integration
    calendarEventId?: string; // Google Calendar or Outlook event ID
    calendarProvider?: 'google' | 'outlook';

    // Google Meet Integration
    googleMeet?: IGoogleMeetData;

    // Qualification Data
    qualificationAnswers?: Record<string, any>;
    qualified?: boolean;
    qualificationScore?: number;

    // Meeting Status
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';
    cancelledAt?: Date;
    cancelledBy?: 'attendee' | 'host' | 'system';
    cancellationReason?: string;

    // Attendance
    attendeeJoined?: boolean;
    attendeeJoinedAt?: Date;
    hostJoined?: boolean;
    hostJoinedAt?: Date;
    actualDuration?: number; // Actual meeting duration in minutes

    // Reminders
    remindersSent?: {
        sentAt: Date;
        type: '24h' | '2h' | '1h' | 'custom';
        successful: boolean;
    }[];

    // Follow-up
    notes?: string; // Meeting notes
    outcome?: 'qualified' | 'disqualified' | 'needs_follow_up' | 'scheduled_next';
    nextSteps?: string;
    followUpTaskId?: Types.ObjectId;

    // Metadata
    bookedAt: Date; // When the meeting was booked
    bookingSource?: string; // URL or source where booking was made
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;

    createdAt: Date;
    updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        schedulerId: {
            type: Schema.Types.ObjectId,
            ref: "MeetingScheduler",
            required: true,
            index: true,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },

        // Attendee Information
        attendee: {
            name: {
                type: String,
                required: true,
            },
            email: {
                type: String,
                required: true,
                lowercase: true,
            },
            phone: String,
            timezone: String,
        },

        // Assigned Host
        hostUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        hostEmail: String,

        // Scheduled Time
        scheduledAt: {
            type: Date,
            required: true,
            index: true,
        },
        duration: {
            type: Number,
            required: true,
            min: 15,
        },
        timezone: {
            type: String,
            required: true,
        },

        // Location Details
        location: {
            type: {
                type: String,
                enum: ['zoom', 'google_meet', 'phone', 'in_person', 'custom'],
                required: true,
            },
            details: {
                type: String,
                required: true,
            },
        },

        // Calendar Integration
        calendarEventId: String,
        calendarProvider: {
            type: String,
            enum: ['google', 'outlook'],
        },

        // Google Meet Integration
        googleMeet: {
            meetingCode: String,
            conferenceId: String,
            hangoutLink: String,
            entryPoints: [{
                uri: String,
                label: String,
                entryPointType: {
                    type: String,
                    enum: ['video', 'phone', 'sip', 'more'],
                },
            }],
            recordingEnabled: {
                type: Boolean,
                default: false,
            },
            recording: {
                status: {
                    type: String,
                    enum: ['not_started', 'recording', 'completed', 'failed'],
                },
                driveFileId: String,
                driveFileUrl: String,
                recordedAt: Date,
                duration: Number,
                transcriptFileId: String,
                transcriptUrl: String,
            },
        },

        // Qualification Data
        qualificationAnswers: {
            type: Map,
            of: Schema.Types.Mixed,
        },
        qualified: Boolean,
        qualificationScore: {
            type: Number,
            min: 0,
            max: 100,
        },

        // Meeting Status
        status: {
            type: String,
            enum: ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'],
            default: 'scheduled',
            index: true,
        },
        cancelledAt: Date,
        cancelledBy: {
            type: String,
            enum: ['attendee', 'host', 'system'],
        },
        cancellationReason: String,

        // Attendance
        attendeeJoined: {
            type: Boolean,
            default: false,
        },
        attendeeJoinedAt: Date,
        hostJoined: {
            type: Boolean,
            default: false,
        },
        hostJoinedAt: Date,
        actualDuration: Number,

        // Reminders
        remindersSent: [
            {
                sentAt: {
                    type: Date,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ['24h', '2h', '1h', 'custom'],
                    required: true,
                },
                successful: {
                    type: Boolean,
                    required: true,
                },
            },
        ],

        // Follow-up
        notes: String,
        outcome: {
            type: String,
            enum: ['qualified', 'disqualified', 'needs_follow_up', 'scheduled_next'],
        },
        nextSteps: String,
        followUpTaskId: {
            type: Schema.Types.ObjectId,
            ref: "Task",
        },

        // Metadata
        bookedAt: {
            type: Date,
            default: Date.now,
        },
        bookingSource: String,
        utmSource: String,
        utmMedium: String,
        utmCampaign: String,
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
meetingSchema.index({ workspaceId: 1, scheduledAt: 1 });
meetingSchema.index({ workspaceId: 1, status: 1, scheduledAt: 1 });
meetingSchema.index({ hostUserId: 1, scheduledAt: 1 });
meetingSchema.index({ 'attendee.email': 1 });

// Compound index for finding conflicts
meetingSchema.index({
    hostUserId: 1,
    status: 1,
    scheduledAt: 1,
});

const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);

export default Meeting;
