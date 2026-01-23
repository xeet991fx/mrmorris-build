/**
 * Integration Credential Model
 *
 * Stores encrypted credentials for third-party integrations (Slack, Google Sheets, Notion, etc.)
 * Uses AES-256-GCM encryption with workspace-specific key derivation
 */

import mongoose, { Document, Schema, Types } from 'mongoose';
import { encryptCredentials, decryptCredentials } from '../utils/encryption';

export type IntegrationType = 'slack' | 'google_sheets' | 'notion' | 'gmail' | 'calendar' | 'linkedin';

export interface IIntegrationCredential extends Document {
    workspaceId: Types.ObjectId;
    type: IntegrationType;
    name: string; // User-friendly name (e.g., "My Slack Workspace", "Personal Google Account")
    encryptedData: string; // Encrypted credential data (tokens, API keys, etc.)
    createdAt: Date;
    updatedAt: Date;
    lastValidated?: Date;
    isValid: boolean;
    validationError?: string;
    // LinkedIn rate limiting (stored outside encrypted data for atomic $inc updates)
    linkedinSentToday?: number;
    linkedinLastSentDate?: Date;

    // Methods
    setCredentialData(data: any): void;
    getCredentialData(): any;
    validateCredential(): Promise<boolean>;
}

const integrationCredentialSchema = new Schema<IIntegrationCredential>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Project',
            required: [true, 'Workspace ID is required'],
            index: true,
        },
        type: {
            type: String,
            enum: ['slack', 'google_sheets', 'notion', 'gmail', 'calendar', 'linkedin'],
            required: [true, 'Integration type is required'],
        },
        name: {
            type: String,
            required: [true, 'Credential name is required'],
            trim: true,
        },
        encryptedData: {
            type: String,
            required: true,
            select: false, // Don't return encrypted data by default for security
        },
        lastValidated: {
            type: Date,
        },
        isValid: {
            type: Boolean,
            default: true,
        },
        validationError: {
            type: String,
        },
        // Rate limiting fields for LinkedIn (stored outside encrypted data for atomic updates)
        linkedinSentToday: {
            type: Number,
            default: 0,
        },
        linkedinLastSentDate: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index to ensure unique credential names per workspace/type
integrationCredentialSchema.index(
    { workspaceId: 1, type: 1, name: 1 },
    { unique: true }
);

/**
 * Set credential data (encrypt before storing)
 * @param data - Credential data object (varies by integration type)
 *   - Slack: { botToken: string, appToken?: string }
 *   - Google Sheets: { access_token: string, refresh_token: string, expiry_date: number }
 *   - Notion: { access_token: string }
 */
integrationCredentialSchema.methods.setCredentialData = function (data: any): void {
    const workspaceId = this.workspaceId.toString();
    this.encryptedData = encryptCredentials(data, workspaceId);
};

/**
 * Get decrypted credential data
 * @returns Decrypted credential object
 */
integrationCredentialSchema.methods.getCredentialData = function (): any {
    try {
        const workspaceId = this.workspaceId.toString();
        return decryptCredentials(this.encryptedData, workspaceId);
    } catch (error: any) {
        console.error('Failed to decrypt credential data:', error.message);
        throw new Error('Failed to decrypt credential data');
    }
};

/**
 * Validate credential by attempting to use it
 * (Implementation depends on integration type)
 * @returns True if credential is valid
 */
integrationCredentialSchema.methods.validateCredential = async function (): Promise<boolean> {
    try {
        const data = this.getCredentialData();

        switch (this.type) {
            case 'slack':
                // Test Slack bot token by calling auth.test
                const { WebClient } = await import('@slack/web-api');
                const slackClient = new WebClient(data.botToken);
                await slackClient.auth.test();
                break;

            case 'google_sheets':
                // Test Google token by making a simple API call
                const { google } = await import('googleapis');
                const auth = new google.auth.OAuth2();
                auth.setCredentials({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expiry_date: data.expiry_date,
                });
                const drive = google.drive({ version: 'v3', auth });
                await drive.files.list({ pageSize: 1 });
                break;

            case 'notion':
                // Test Notion token by listing users
                const { Client } = await import('@notionhq/client');
                const notionClient = new Client({ auth: data.access_token });
                await notionClient.users.list({ page_size: 1 });
                break;

            case 'gmail':
                // Test Gmail token by getting user profile
                const { google: gmailGoogle } = await import('googleapis');
                const gmailAuth = new gmailGoogle.auth.OAuth2();
                gmailAuth.setCredentials({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expiry_date: data.expiry_date,
                });
                const gmail = gmailGoogle.gmail({ version: 'v1', auth: gmailAuth });
                await gmail.users.getProfile({ userId: 'me' });
                break;

            case 'linkedin':
                // Test LinkedIn token by getting user profile
                const axios = (await import('axios')).default;
                await axios.get('https://api.linkedin.com/v2/me', {
                    headers: {
                        'Authorization': `Bearer ${data.access_token}`,
                        'X-Restli-Protocol-Version': '2.0.0',
                    },
                });
                break;

            case 'calendar':
                // Test Calendar token by listing calendars
                const { google: calendarGoogle } = await import('googleapis');
                const calendarAuth = new calendarGoogle.auth.OAuth2();
                calendarAuth.setCredentials({
                    access_token: data.access_token,
                    refresh_token: data.refresh_token,
                    expiry_date: data.expiry_date,
                });
                const calendar = calendarGoogle.calendar({ version: 'v3', auth: calendarAuth });
                await calendar.calendarList.list({ maxResults: 1 });
                break;

            default:
                throw new Error(`Validation not implemented for type: ${this.type}`);
        }

        this.isValid = true;
        this.lastValidated = new Date();
        this.validationError = undefined;
        await this.save();

        return true;
    } catch (error: any) {
        this.isValid = false;
        this.validationError = error.message;
        await this.save();

        console.error(`Credential validation failed for ${this.type}:`, error.message);
        return false;
    }
};

const IntegrationCredential = mongoose.model<IIntegrationCredential>(
    'IntegrationCredential',
    integrationCredentialSchema
);

export default IntegrationCredential;
