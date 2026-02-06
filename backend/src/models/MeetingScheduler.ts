import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * MeetingScheduler Model
 *
 * Represents a meeting booking page (like Calendly)
 * Defines availability, duration, team members, and qualification questions
 */

export interface IAvailabilityWindow {
    dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday
    startTime: string; // "09:00" format (24-hour)
    endTime: string; // "17:00" format (24-hour)
}

export interface IQualificationQuestion {
    id: string;
    question: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'multiselect';
    options?: string[]; // For select/multiselect
    required: boolean;
    disqualifyValue?: string; // If answer matches this, disqualify the lead
}

// Recording Settings for Google Meet
export interface IRecordingSettings {
    enabled: boolean;               // Enable recording for this scheduler
    autoStart: boolean;             // Automatically start recording when host joins
    notifyParticipants: boolean;    // Notify participants that meeting is being recorded
    accessLevel: 'host' | 'participants' | 'workspace'; // Who can access recordings
    retentionDays?: number;         // Auto-delete recordings after X days
}

export interface IMeetingScheduler extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId; // Owner of the scheduler

    // Basic Information
    name: string; // "Demo Call", "Sales Discovery", etc.
    slug: string; // URL-friendly identifier: workspace.com/meet/demo-call
    description?: string;
    isActive: boolean;

    // Meeting Details
    duration: number; // Duration in minutes (15, 30, 45, 60, etc.)
    location: {
        type: 'zoom' | 'google_meet' | 'phone' | 'in_person' | 'custom';
        details?: string; // Zoom link, phone number, address, etc.
    };

    // Availability
    timezone: string; // IANA timezone
    availabilityWindows: IAvailabilityWindow[];
    bufferBefore?: number; // Minutes of buffer before meeting
    bufferAfter?: number; // Minutes of buffer after meeting
    minNotice?: number; // Minimum hours of notice required
    maxAdvanceBooking?: number; // Maximum days in advance (e.g., 60 days)

    // Team Assignment
    assignmentType: 'round_robin' | 'specific_user' | 'user_choice';
    assignedUsers?: Types.ObjectId[]; // For round_robin or user_choice
    specificUser?: Types.ObjectId; // For specific_user

    // Calendar Integration
    calendarIntegration?: {
        provider: 'google' | 'outlook';
        accountId: Types.ObjectId; // Reference to connected calendar account
        checkConflicts: boolean; // Check for conflicts before booking
    };

    // Google Meet Recording Settings
    recordingSettings?: IRecordingSettings;

    // Google Calendar Integration for Google Meet
    googleCalendarIntegration?: {
        enabled: boolean;
        calendarId?: string;           // Specific calendar to use (default: primary)
    };

    // Lead Qualification
    enableQualification: boolean;
    qualificationQuestions?: IQualificationQuestion[];
    autoDisqualify: boolean; // Automatically disqualify if answers don't match

    // Confirmation & Reminders
    confirmationEmail: {
        enabled: boolean;
        subject?: string;
        body?: string; // Can use variables like {{name}}, {{date}}, {{time}}
    };
    reminderEmails: {
        enabled: boolean;
        hoursBeforeMeeting: number[]; // e.g., [24, 2] for 24h and 2h reminders
    };

    // Customization
    brandColor?: string;
    logoUrl?: string;
    thankYouMessage?: string;

    // Analytics
    stats: {
        totalBookings: number;
        completedMeetings: number;
        cancelledMeetings: number;
        noShows: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const meetingSchedulerSchema = new Schema<IMeetingScheduler>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Basic Information
        name: {
            type: String,
            required: true,
            maxlength: 100,
        },
        slug: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            match: /^[a-z0-9-]+$/,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // Meeting Details
        duration: {
            type: Number,
            required: true,
            min: 15,
            max: 240, // Up to 4 hours
        },
        location: {
            type: {
                type: String,
                enum: ['zoom', 'google_meet', 'phone', 'in_person', 'custom'],
                required: true,
            },
            details: String,
        },

        // Availability
        timezone: {
            type: String,
            required: true,
            default: 'America/New_York',
        },
        availabilityWindows: [
            {
                dayOfWeek: {
                    type: Number,
                    min: 0,
                    max: 6,
                    required: true,
                },
                startTime: {
                    type: String,
                    required: true,
                    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                },
                endTime: {
                    type: String,
                    required: true,
                    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
                },
            },
        ],
        bufferBefore: {
            type: Number,
            default: 0,
            min: 0,
        },
        bufferAfter: {
            type: Number,
            default: 0,
            min: 0,
        },
        minNotice: {
            type: Number,
            default: 2, // 2 hours minimum notice
            min: 0,
        },
        maxAdvanceBooking: {
            type: Number,
            default: 60, // 60 days max
            min: 1,
        },

        // Team Assignment
        assignmentType: {
            type: String,
            enum: ['round_robin', 'specific_user', 'user_choice'],
            default: 'specific_user',
        },
        assignedUsers: [{
            type: Schema.Types.ObjectId,
            ref: "User",
        }],
        specificUser: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },

        // Calendar Integration
        calendarIntegration: {
            provider: {
                type: String,
                enum: ['google', 'outlook'],
            },
            accountId: {
                type: Schema.Types.ObjectId,
                ref: "EmailAccount",
            },
            checkConflicts: {
                type: Boolean,
                default: true,
            },
        },

        // Google Meet Recording Settings
        recordingSettings: {
            enabled: {
                type: Boolean,
                default: false,
            },
            autoStart: {
                type: Boolean,
                default: false,
            },
            notifyParticipants: {
                type: Boolean,
                default: true,
            },
            accessLevel: {
                type: String,
                enum: ['host', 'participants', 'workspace'],
                default: 'host',
            },
            retentionDays: {
                type: Number,
                min: 1,
            },
        },

        // Google Calendar Integration
        googleCalendarIntegration: {
            enabled: {
                type: Boolean,
                default: false,
            },
            calendarId: String,
        },

        // Lead Qualification
        enableQualification: {
            type: Boolean,
            default: false,
        },
        qualificationQuestions: [
            {
                id: {
                    type: String,
                    required: true,
                },
                question: {
                    type: String,
                    required: true,
                },
                type: {
                    type: String,
                    enum: ['text', 'email', 'phone', 'select', 'multiselect'],
                    required: true,
                },
                options: [String],
                required: {
                    type: Boolean,
                    default: true,
                },
                disqualifyValue: String,
            },
        ],
        autoDisqualify: {
            type: Boolean,
            default: false,
        },

        // Confirmation & Reminders
        confirmationEmail: {
            enabled: {
                type: Boolean,
                default: true,
            },
            subject: String,
            body: String,
        },
        reminderEmails: {
            enabled: {
                type: Boolean,
                default: true,
            },
            hoursBeforeMeeting: {
                type: [Number],
                default: [24, 2],
            },
        },

        // Customization
        brandColor: String,
        logoUrl: String,
        thankYouMessage: String,

        // Analytics
        stats: {
            totalBookings: {
                type: Number,
                default: 0,
            },
            completedMeetings: {
                type: Number,
                default: 0,
            },
            cancelledMeetings: {
                type: Number,
                default: 0,
            },
            noShows: {
                type: Number,
                default: 0,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
meetingSchedulerSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
meetingSchedulerSchema.index({ workspaceId: 1, isActive: 1 });

const MeetingScheduler = mongoose.model<IMeetingScheduler>("MeetingScheduler", meetingSchedulerSchema);

export default MeetingScheduler;
