import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Meeting Type Model
 * 
 * Defines reusable meeting types with public booking links.
 * Similar to Calendly meeting types.
 */

export interface IAvailabilitySlot {
    day: number; // 0-6 (Sunday-Saturday)
    startTime: string; // "09:00"
    endTime: string; // "17:00"
}

export interface IMeetingType extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;

    // Core fields
    name: string;
    description?: string;
    duration: number; // in minutes
    color: string;

    // Booking link
    slug: string; // public URL slug
    isActive: boolean;

    // Location settings
    locationType: "in_person" | "video" | "phone" | "custom";
    location?: string;
    conferenceProvider?: "zoom" | "google_meet" | "teams";

    // Availability
    availability: IAvailabilitySlot[];
    timezone: string;
    bufferBefore: number; // minutes before meeting
    bufferAfter: number; // minutes after meeting
    minNotice: number; // minimum hours before booking
    maxFutureDays: number; // how far in advance can book

    // Customization
    questions?: Array<{
        question: string;
        required: boolean;
        type: "text" | "textarea" | "select";
        options?: string[];
    }>;

    // Confirmation settings
    confirmationMessage?: string;
    redirectUrl?: string;

    // Stats
    totalBookings: number;

    createdAt: Date;
    updatedAt: Date;
}

const availabilitySlotSchema = new Schema<IAvailabilitySlot>(
    {
        day: {
            type: Number,
            min: 0,
            max: 6,
            required: true,
        },
        startTime: {
            type: String,
            required: true,
        },
        endTime: {
            type: String,
            required: true,
        },
    },
    { _id: false }
);

const meetingTypeSchema = new Schema<IMeetingType>(
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

        // Core fields
        name: {
            type: String,
            required: [true, "Meeting type name is required"],
            trim: true,
            maxlength: [100, "Name must be less than 100 characters"],
        },
        description: {
            type: String,
            maxlength: [500, "Description must be less than 500 characters"],
        },
        duration: {
            type: Number,
            required: true,
            min: 5,
            default: 30,
        },
        color: {
            type: String,
            default: "#6366f1", // Indigo
        },

        // Booking link
        slug: {
            type: String,
            required: [true, "URL slug is required"],
            lowercase: true,
            trim: true,
            match: [/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"],
        },
        isActive: {
            type: Boolean,
            default: true,
        },

        // Location settings
        locationType: {
            type: String,
            enum: ["in_person", "video", "phone", "custom"],
            default: "video",
        },
        location: String,
        conferenceProvider: {
            type: String,
            enum: ["zoom", "google_meet", "teams"],
        },

        // Availability
        availability: {
            type: [availabilitySlotSchema],
            default: [
                { day: 1, startTime: "09:00", endTime: "17:00" }, // Monday
                { day: 2, startTime: "09:00", endTime: "17:00" }, // Tuesday
                { day: 3, startTime: "09:00", endTime: "17:00" }, // Wednesday
                { day: 4, startTime: "09:00", endTime: "17:00" }, // Thursday
                { day: 5, startTime: "09:00", endTime: "17:00" }, // Friday
            ],
        },
        timezone: {
            type: String,
            default: "America/New_York",
        },
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
            default: 4, // 4 hours
            min: 0,
        },
        maxFutureDays: {
            type: Number,
            default: 60,
            min: 1,
        },

        // Custom questions
        questions: [{
            question: { type: String, required: true },
            required: { type: Boolean, default: false },
            type: { type: String, enum: ["text", "textarea", "select"], default: "text" },
            options: [String],
        }],

        // Confirmation
        confirmationMessage: String,
        redirectUrl: String,

        // Stats
        totalBookings: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound unique index for slug per workspace
meetingTypeSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });

const MeetingType = mongoose.model<IMeetingType>("MeetingType", meetingTypeSchema);

export default MeetingType;
