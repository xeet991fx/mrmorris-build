import mongoose, { Document, Schema, Types } from "mongoose";
import crypto from "crypto";

// Encryption key from env or generate a default
const ENCRYPTION_KEY = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY || process.env.EMAIL_TOKEN_ENCRYPTION_KEY || "default-32-char-key-for-dev-only!";
const IV_LENGTH = 16;

export interface ICalendarIntegration extends Document {
    userId: Types.ObjectId;
    workspaceId: Types.ObjectId;
    provider: "google" | "outlook";
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    isActive: boolean;
    lastSyncAt?: Date;
    syncError?: string;
    calendarId?: string; // Primary calendar ID
    syncEnabled: boolean;
    twoWaySync: boolean; // If true, sync from CRM to Calendar too
    createdAt: Date;
    updatedAt: Date;

    // Methods
    setTokens(accessToken: string, refreshToken: string): void;
    getAccessToken(): string;
    getRefreshToken(): string;
    isTokenExpired(): boolean;
}

// Encryption helper functions
function encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
        iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(text: string): string {
    const parts = text.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = Buffer.from(parts[1], "hex");
    const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32)),
        iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const calendarIntegrationSchema = new Schema<ICalendarIntegration>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User ID is required"],
            index: true,
        },
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        provider: {
            type: String,
            enum: ["google", "outlook"],
            required: [true, "Provider is required"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            lowercase: true,
            trim: true,
        },
        accessToken: {
            type: String,
            required: true,
            select: false,
        },
        refreshToken: {
            type: String,
            required: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastSyncAt: {
            type: Date,
        },
        syncError: {
            type: String,
        },
        calendarId: {
            type: String,
            default: "primary",
        },
        syncEnabled: {
            type: Boolean,
            default: true,
        },
        twoWaySync: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one integration per email per workspace
calendarIntegrationSchema.index(
    { workspaceId: 1, email: 1, provider: 1 },
    { unique: true }
);

// Methods
calendarIntegrationSchema.methods.setTokens = function (
    accessToken: string,
    refreshToken: string
): void {
    this.accessToken = encrypt(accessToken);
    this.refreshToken = encrypt(refreshToken);
};

calendarIntegrationSchema.methods.getAccessToken = function (): string {
    try {
        return decrypt(this.accessToken);
    } catch (error) {
        console.error("Failed to decrypt access token");
        return "";
    }
};

calendarIntegrationSchema.methods.getRefreshToken = function (): string {
    try {
        return decrypt(this.refreshToken);
    } catch (error) {
        console.error("Failed to decrypt refresh token");
        return "";
    }
};

calendarIntegrationSchema.methods.isTokenExpired = function (): boolean {
    return new Date() >= this.expiresAt;
};

const CalendarIntegration = mongoose.model<ICalendarIntegration>(
    "CalendarIntegration",
    calendarIntegrationSchema
);

export default CalendarIntegration;
