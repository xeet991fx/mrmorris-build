import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Meeting Model
 * 
 * Represents scheduled meetings in the CRM.
 */

export type MeetingStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface IMeetingAttendee {
    type: "user" | "contact";
    userId?: Types.ObjectId;
    contactId?: Types.ObjectId;
    email: string;
    name: string;
    status: "pending" | "accepted" | "declined" | "tentative";
}

export interface IMeeting extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;
    meetingTypeId?: Types.ObjectId;

    // Core fields
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    duration: number; // in minutes
    timezone?: string;

    // Location
    location?: string;
    meetingUrl?: string; // For virtual meetings
    conferenceProvider?: "zoom" | "google_meet" | "teams" | "custom";

    // Attendees
    attendees: IMeetingAttendee[];

    // Status
    status: MeetingStatus;

    // Linked entities
    contactId?: Types.ObjectId;
    companyId?: Types.ObjectId;
    opportunityId?: Types.ObjectId;

    // Reminders
    reminders: Array<{
        reminderAt: Date;
        sent: boolean;
        type: "email" | "in_app";
    }>;

    // Notes
    notes?: string;
    outcome?: string; // Post-meeting notes

    // Calendar integration
    externalCalendarId?: string;
    externalEventId?: string;
    calendarEventId?: string;
    calendarEventLink?: string;

    createdAt: Date;
    updatedAt: Date;
}

const meetingAttendeeSchema = new Schema<IMeetingAttendee>(
    {
        type: {
            type: String,
            enum: ["user", "contact"],
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
        },
        email: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "declined", "tentative"],
            default: "pending",
        },
    },
    { _id: false }
);

const meetingSchema = new Schema<IMeeting>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        meetingTypeId: {
            type: Schema.Types.ObjectId,
            ref: "MeetingType",
        },

        // Core fields
        title: {
            type: String,
            required: [true, "Meeting title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        description: {
            type: String,
            maxlength: [2000, "Description must be less than 2000 characters"],
        },
        startTime: {
            type: Date,
            required: [true, "Start time is required"],
            index: true,
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        duration: {
            type: Number,
            required: true,
            min: 5,
        },
        timezone: {
            type: String,
            default: "UTC",
        },

        // Location
        location: String,
        meetingUrl: String,
        conferenceProvider: {
            type: String,
            enum: ["zoom", "google_meet", "teams", "custom"],
        },

        // Attendees
        attendees: {
            type: [meetingAttendeeSchema],
            default: [],
        },

        // Status
        status: {
            type: String,
            enum: ["scheduled", "confirmed", "completed", "cancelled", "no_show"],
            default: "scheduled",
            index: true,
        },

        // Linked entities
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
        },
        opportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
        },

        // Reminders
        reminders: [{
            reminderAt: { type: Date, required: true },
            sent: { type: Boolean, default: false },
            type: { type: String, enum: ["email", "in_app"], default: "in_app" },
        }],

        // Notes
        notes: String,
        outcome: String,

        // Calendar integration
        externalCalendarId: String,
        externalEventId: String,
        calendarEventId: String,
        calendarEventLink: String,
    },
    {
        timestamps: true,
    }
);

// Compound indexes
meetingSchema.index({ workspaceId: 1, startTime: 1 });
meetingSchema.index({ workspaceId: 1, createdBy: 1, startTime: 1 });
meetingSchema.index({ "attendees.email": 1 });
meetingSchema.index({ "reminders.reminderAt": 1, "reminders.sent": 1 });

const Meeting = mongoose.model<IMeeting>("Meeting", meetingSchema);

export default Meeting;
