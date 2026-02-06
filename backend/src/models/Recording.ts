import mongoose, { Document, Schema } from "mongoose";

/**
 * Recording Model
 * Stores recording metadata separately from meetings for better querying and management
 */

export interface IRecording extends Document {
    workspaceId: mongoose.Types.ObjectId;
    meetingId: mongoose.Types.ObjectId;
    schedulerId: mongoose.Types.ObjectId;
    hostUserId: mongoose.Types.ObjectId;

    // Meeting context
    meetingTitle: string;
    scheduledAt: Date;
    meetingDuration: number; // scheduled duration in minutes

    // Attendee info
    attendees: {
        name: string;
        email: string;
        joinedAt?: Date;
        leftAt?: Date;
    }[];

    // Google Drive file info
    driveFileId: string;
    driveFileUrl: string;
    fileName: string;
    mimeType: string;
    fileSize: number; // bytes

    // Recording details
    recordingDuration: number; // seconds
    recordedAt: Date;
    recordingStartTime: Date;
    recordingEndTime?: Date;

    // Status
    status: "processing" | "ready" | "failed" | "deleted";
    processingError?: string;

    // Transcript (if available)
    transcript?: {
        fileId: string;
        url: string;
        language: string;
        generatedAt: Date;
    };

    // Access control
    accessLevel: "host" | "participants" | "workspace";
    sharedWith: {
        email: string;
        role: "viewer" | "editor";
        sharedAt: Date;
        sharedBy: mongoose.Types.ObjectId;
    }[];

    // Retention
    retentionDays?: number;
    expiresAt?: Date;
    deletedAt?: Date;

    // Analytics
    viewCount: number;
    lastViewedAt?: Date;
    lastViewedBy?: mongoose.Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const RecordingSchema = new Schema<IRecording>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Workspace",
            required: true,
            index: true,
        },
        meetingId: {
            type: Schema.Types.ObjectId,
            ref: "Meeting",
            required: true,
            index: true,
        },
        schedulerId: {
            type: Schema.Types.ObjectId,
            ref: "MeetingScheduler",
            required: true,
            index: true,
        },
        hostUserId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },

        // Meeting context
        meetingTitle: {
            type: String,
            required: true,
        },
        scheduledAt: {
            type: Date,
            required: true,
            index: true,
        },
        meetingDuration: {
            type: Number,
            required: true,
        },

        // Attendees
        attendees: [
            {
                name: { type: String, required: true },
                email: { type: String, required: true },
                joinedAt: Date,
                leftAt: Date,
            },
        ],

        // Google Drive file info
        driveFileId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        driveFileUrl: {
            type: String,
            required: true,
        },
        fileName: {
            type: String,
            required: true,
        },
        mimeType: {
            type: String,
            default: "video/mp4",
        },
        fileSize: {
            type: Number,
            default: 0,
        },

        // Recording details
        recordingDuration: {
            type: Number, // seconds
            default: 0,
        },
        recordedAt: {
            type: Date,
            required: true,
            index: true,
        },
        recordingStartTime: {
            type: Date,
            required: true,
        },
        recordingEndTime: {
            type: Date,
        },

        // Status
        status: {
            type: String,
            enum: ["processing", "ready", "failed", "deleted"],
            default: "processing",
            index: true,
        },
        processingError: {
            type: String,
        },

        // Transcript
        transcript: {
            fileId: String,
            url: String,
            language: String,
            generatedAt: Date,
        },

        // Access control
        accessLevel: {
            type: String,
            enum: ["host", "participants", "workspace"],
            default: "host",
        },
        sharedWith: [
            {
                email: { type: String, required: true },
                role: {
                    type: String,
                    enum: ["viewer", "editor"],
                    default: "viewer",
                },
                sharedAt: { type: Date, default: Date.now },
                sharedBy: { type: Schema.Types.ObjectId, ref: "User" },
            },
        ],

        // Retention
        retentionDays: {
            type: Number,
        },
        expiresAt: {
            type: Date,
            index: true,
        },
        deletedAt: {
            type: Date,
        },

        // Analytics
        viewCount: {
            type: Number,
            default: 0,
        },
        lastViewedAt: {
            type: Date,
        },
        lastViewedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
RecordingSchema.index({ workspaceId: 1, status: 1, recordedAt: -1 });
RecordingSchema.index({ workspaceId: 1, hostUserId: 1 });
RecordingSchema.index({ workspaceId: 1, schedulerId: 1 });
RecordingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Text index for search
RecordingSchema.index({
    meetingTitle: "text",
    "attendees.name": "text",
    "attendees.email": "text",
});

export const Recording = mongoose.model<IRecording>("Recording", RecordingSchema);
