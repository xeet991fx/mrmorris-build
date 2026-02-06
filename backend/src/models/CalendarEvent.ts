/**
 * CalendarEvent Model
 * 
 * Synced calendar events for scheduling coordination.
 * Used by schedulingAgent for availability and meeting management.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICalendarEvent extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // External sync
    externalId?: string;  // Google/Outlook event ID
    provider?: "google" | "outlook" | "internal";
    calendarId?: string;

    // Event details
    title: string;
    description?: string;
    location?: string;
    meetingLink?: string;

    // Timing
    startTime: Date;
    endTime: Date;
    timezone: string;
    isAllDay?: boolean;

    // Recurrence
    isRecurring?: boolean;
    recurrenceRule?: string;  // RRULE format

    // Attendees
    attendees?: {
        email: string;
        name?: string;
        status: "pending" | "accepted" | "declined" | "tentative";
        contactId?: Types.ObjectId;
    }[];
    organizer?: {
        email: string;
        name?: string;
    };

    // CRM Integration
    contactId?: Types.ObjectId;
    opportunityId?: Types.ObjectId;
    companyId?: Types.ObjectId;

    // Status
    status: "confirmed" | "tentative" | "cancelled";

    // Reminders
    reminders?: {
        method: "email" | "popup" | "notification";
        minutesBefore: number;
    }[];

    // Meeting prep
    briefingGenerated?: boolean;
    briefingGeneratedAt?: Date;

    // Metadata
    lastSyncedAt?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const attendeeSchema = new Schema({
    email: { type: String, required: true },
    name: { type: String },
    status: {
        type: String,
        enum: ["pending", "accepted", "declined", "tentative"],
        default: "pending",
    },
    contactId: {
        type: Schema.Types.ObjectId,
        ref: "Contact",
    },
}, { _id: false });

const reminderSchema = new Schema({
    method: {
        type: String,
        enum: ["email", "popup", "notification"],
        default: "notification",
    },
    minutesBefore: { type: Number, required: true },
}, { _id: false });

const calendarEventSchema = new Schema<ICalendarEvent>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },

        externalId: { type: String },
        provider: {
            type: String,
            enum: ["google", "outlook", "internal"],
            default: "internal",
        },
        calendarId: { type: String },

        title: {
            type: String,
            required: [true, "Title is required"],
            trim: true,
            maxlength: [200, "Title must be less than 200 characters"],
        },
        description: { type: String },
        location: { type: String },
        meetingLink: { type: String },

        startTime: {
            type: Date,
            required: [true, "Start time is required"],
            index: true,
        },
        endTime: {
            type: Date,
            required: [true, "End time is required"],
        },
        timezone: {
            type: String,
            default: "UTC",
        },
        isAllDay: { type: Boolean, default: false },

        isRecurring: { type: Boolean, default: false },
        recurrenceRule: { type: String },

        attendees: [attendeeSchema],
        organizer: {
            email: { type: String },
            name: { type: String },
        },

        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },
        opportunityId: {
            type: Schema.Types.ObjectId,
            ref: "Opportunity",
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
        },

        status: {
            type: String,
            enum: ["confirmed", "tentative", "cancelled"],
            default: "confirmed",
        },

        reminders: [reminderSchema],

        briefingGenerated: { type: Boolean, default: false },
        briefingGeneratedAt: { type: Date },

        lastSyncedAt: { type: Date },
    },
    {
        timestamps: true,
    }
);

// Indexes
calendarEventSchema.index({ workspaceId: 1, startTime: 1, endTime: 1 });
calendarEventSchema.index({ userId: 1, startTime: 1 });
calendarEventSchema.index({ externalId: 1, provider: 1 }, { sparse: true });
calendarEventSchema.index({ workspaceId: 1, contactId: 1 });

// Text search
calendarEventSchema.index({
    title: "text",
    description: "text",
});

const CalendarEvent = mongoose.model<ICalendarEvent>("CalendarEvent", calendarEventSchema);

export default CalendarEvent;
