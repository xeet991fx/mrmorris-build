/**
 * Salesforce Integration Model
 *
 * Stores Salesforce OAuth credentials and sync configuration
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export type SyncDirection = 'salesforce_to_crm' | 'crm_to_salesforce' | 'bidirectional';
export type SyncStatus = 'active' | 'paused' | 'error' | 'disconnected';

export interface ISalesforceIntegration extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // OAuth credentials (encrypted)
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
    tokenExpiry?: Date;

    // Salesforce organization info
    organizationId: string;
    organizationName?: string;
    userEmail?: string;
    userId_sf?: string; // Salesforce user ID

    // Sync configuration
    syncDirection: SyncDirection;
    syncStatus: SyncStatus;
    syncFrequency: number; // minutes
    lastSyncAt?: Date;
    nextSyncAt?: Date;

    // Sync settings
    syncContacts: boolean;
    syncAccounts: boolean; // Companies in Salesforce
    syncOpportunities: boolean;
    syncTasks: boolean;
    syncEvents: boolean;

    // Conflict resolution
    conflictResolution: 'salesforce_wins' | 'crm_wins' | 'manual' | 'newest_wins';

    // Sync filters
    filters: {
        contactFilter?: string; // SOQL WHERE clause
        accountFilter?: string;
        opportunityFilter?: string;
    };

    // Statistics
    stats: {
        totalSynced: number;
        lastSyncDuration?: number; // milliseconds
        syncErrors: number;
        contactsSynced: number;
        accountsSynced: number;
        opportunitiesSynced: number;
    };

    // Error tracking
    lastError?: {
        message: string;
        timestamp: Date;
        details?: any;
    };

    createdAt: Date;
    updatedAt: Date;
}

const SalesforceIntegrationSchema = new Schema<ISalesforceIntegration>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            // Note: Indexed via schema.index() below with unique constraint
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // OAuth credentials
        accessToken: {
            type: String,
            required: true,
        },
        refreshToken: {
            type: String,
            required: true,
        },
        instanceUrl: {
            type: String,
            required: true,
        },
        tokenExpiry: Date,

        // Salesforce org info
        organizationId: {
            type: String,
            required: true,
            index: true,
        },
        organizationName: String,
        userEmail: String,
        userId_sf: String,

        // Sync configuration
        syncDirection: {
            type: String,
            enum: ['salesforce_to_crm', 'crm_to_salesforce', 'bidirectional'],
            default: 'bidirectional',
        },
        syncStatus: {
            type: String,
            enum: ['active', 'paused', 'error', 'disconnected'],
            default: 'active',
        },
        syncFrequency: {
            type: Number,
            default: 15, // 15 minutes
        },
        lastSyncAt: Date,
        nextSyncAt: Date,

        // Sync settings
        syncContacts: {
            type: Boolean,
            default: true,
        },
        syncAccounts: {
            type: Boolean,
            default: true,
        },
        syncOpportunities: {
            type: Boolean,
            default: true,
        },
        syncTasks: {
            type: Boolean,
            default: false,
        },
        syncEvents: {
            type: Boolean,
            default: false,
        },

        // Conflict resolution
        conflictResolution: {
            type: String,
            enum: ['salesforce_wins', 'crm_wins', 'manual', 'newest_wins'],
            default: 'newest_wins',
        },

        // Sync filters
        filters: {
            contactFilter: String,
            accountFilter: String,
            opportunityFilter: String,
        },

        // Statistics
        stats: {
            totalSynced: {
                type: Number,
                default: 0,
            },
            lastSyncDuration: Number,
            syncErrors: {
                type: Number,
                default: 0,
            },
            contactsSynced: {
                type: Number,
                default: 0,
            },
            accountsSynced: {
                type: Number,
                default: 0,
            },
            opportunitiesSynced: {
                type: Number,
                default: 0,
            },
        },

        // Error tracking
        lastError: {
            message: String,
            timestamp: Date,
            details: Schema.Types.Mixed,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
SalesforceIntegrationSchema.index({ workspaceId: 1 }, { unique: true });
SalesforceIntegrationSchema.index({ syncStatus: 1, nextSyncAt: 1 });

const SalesforceIntegration = mongoose.model<ISalesforceIntegration>(
    'SalesforceIntegration',
    SalesforceIntegrationSchema
);

export default SalesforceIntegration;
