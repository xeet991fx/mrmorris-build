import mongoose, { Document, Schema, Types } from "mongoose";
import crypto from "crypto";

// Encryption key from env or generate a default (should be set in production)
const ENCRYPTION_KEY = process.env.EMAIL_TOKEN_ENCRYPTION_KEY || "default-32-char-key-for-dev-only!";
const IV_LENGTH = 16;

export interface IEmailIntegration extends Document {
    userId: Types.ObjectId;
    workspaceId: Types.ObjectId;
    provider: "gmail" | "outlook" | "apollo";
    email: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    isActive: boolean;
    lastSyncAt?: Date;
    syncError?: string;

    // Apollo-specific fields
    apolloApiKey?: string;
    apolloEnabled?: boolean;
    apolloAutoEnrich?: boolean;
    apolloCreditsUsed?: number;

    createdAt: Date;
    updatedAt: Date;

    // Methods
    setTokens(accessToken: string, refreshToken: string): void;
    getAccessToken(): string;
    getRefreshToken(): string;
    isTokenExpired(): boolean;
    setApolloApiKey?(apiKey: string): void;
    getApolloApiKey?(): string;
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

const emailIntegrationSchema = new Schema<IEmailIntegration>(
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
            enum: ["gmail", "outlook", "apollo"],
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
            select: false, // Don't return tokens by default
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
        // Apollo-specific fields
        apolloApiKey: {
            type: String,
            select: false, // Don't return API key by default
        },
        apolloEnabled: {
            type: Boolean,
            default: false,
        },
        apolloAutoEnrich: {
            type: Boolean,
            default: false,
        },
        apolloCreditsUsed: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure one integration per email per workspace
emailIntegrationSchema.index(
    { workspaceId: 1, email: 1, provider: 1 },
    { unique: true }
);

// Methods
emailIntegrationSchema.methods.setTokens = function (
    accessToken: string,
    refreshToken: string
): void {
    this.accessToken = encrypt(accessToken);
    this.refreshToken = encrypt(refreshToken);
};

emailIntegrationSchema.methods.getAccessToken = function (): string {
    try {
        return decrypt(this.accessToken);
    } catch (error) {
        console.error("Failed to decrypt access token");
        return "";
    }
};

emailIntegrationSchema.methods.getRefreshToken = function (): string {
    try {
        return decrypt(this.refreshToken);
    } catch (error) {
        console.error("Failed to decrypt refresh token");
        return "";
    }
};

emailIntegrationSchema.methods.isTokenExpired = function (): boolean {
    return new Date() >= this.expiresAt;
};

emailIntegrationSchema.methods.setApolloApiKey = function (apiKey: string): void {
    this.apolloApiKey = encrypt(apiKey);
};

emailIntegrationSchema.methods.getApolloApiKey = function (): string {
    try {
        return this.apolloApiKey ? decrypt(this.apolloApiKey) : "";
    } catch (error) {
        console.error("Failed to decrypt Apollo API key");
        return "";
    }
};

const EmailIntegration = mongoose.model<IEmailIntegration>(
    "EmailIntegration",
    emailIntegrationSchema
);

export default EmailIntegration;
