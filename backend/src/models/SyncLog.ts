/**
 * Sync Log Model
 *
 * Tracks Salesforce sync operations and their results
 */

import mongoose, { Document, Schema, Types } from 'mongoose';

export type SyncOperation = 'full_sync' | 'incremental_sync' | 'manual_sync';
export type SyncObjectType = 'contact' | 'account' | 'opportunity' | 'task' | 'event';
export type SyncAction = 'create' | 'update' | 'delete' | 'skip';
export type SyncResult = 'success' | 'error' | 'partial' | 'conflict';

export interface ISyncRecord {
    objectType: SyncObjectType;
    objectId: Types.ObjectId; // CRM object ID
    salesforceId?: string;
    action: SyncAction;
    result: SyncResult;
    direction: 'to_salesforce' | 'from_salesforce';
    errorMessage?: string;
    changedFields?: string[];
    conflictData?: {
        crmData: any;
        salesforceData: any;
        resolution?: string;
    };
}

export interface ISyncLog extends Document {
    workspaceId: Types.ObjectId;
    integrationId: Types.ObjectId;

    // Sync details
    operation: SyncOperation;
    status: 'running' | 'completed' | 'failed' | 'cancelled';

    // Timing
    startedAt: Date;
    completedAt?: Date;
    duration?: number; // milliseconds

    // Sync records
    records: ISyncRecord[];

    // Summary statistics
    summary: {
        totalRecords: number;
        successful: number;
        errors: number;
        conflicts: number;
        skipped: number;
        created: number;
        updated: number;
        deleted: number;
    };

    // Object-specific counts
    objectCounts: {
        contacts: {
            total: number;
            successful: number;
            errors: number;
        };
        accounts: {
            total: number;
            successful: number;
            errors: number;
        };
        opportunities: {
            total: number;
            successful: number;
            errors: number;
        };
    };

    // Error tracking
    errors: {
        message: string;
        objectType?: SyncObjectType;
        objectId?: string;
        timestamp: Date;
        stack?: string;
    }[];

    // Metadata
    triggeredBy: 'automatic' | 'manual' | 'webhook';
    triggeredByUserId?: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

const SyncRecordSchema = new Schema<ISyncRecord>({
    objectType: {
        type: String,
        enum: ['contact', 'account', 'opportunity', 'task', 'event'],
        required: true,
    },
    objectId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    salesforceId: String,
    action: {
        type: String,
        enum: ['create', 'update', 'delete', 'skip'],
        required: true,
    },
    result: {
        type: String,
        enum: ['success', 'error', 'partial', 'conflict'],
        required: true,
    },
    direction: {
        type: String,
        enum: ['to_salesforce', 'from_salesforce'],
        required: true,
    },
    errorMessage: String,
    changedFields: [String],
    conflictData: {
        crmData: Schema.Types.Mixed,
        salesforceData: Schema.Types.Mixed,
        resolution: String,
    },
}, { _id: false });

const SyncLogSchema = new Schema<ISyncLog>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            index: true,
        },
        integrationId: {
            type: Schema.Types.ObjectId,
            ref: 'SalesforceIntegration',
            required: true,
            index: true,
        },

        // Sync details
        operation: {
            type: String,
            enum: ['full_sync', 'incremental_sync', 'manual_sync'],
            required: true,
        },
        status: {
            type: String,
            enum: ['running', 'completed', 'failed', 'cancelled'],
            default: 'running',
            index: true,
        },

        // Timing
        startedAt: {
            type: Date,
            required: true,
            default: Date.now,
        },
        completedAt: Date,
        duration: Number,

        // Sync records
        records: [SyncRecordSchema],

        // Summary statistics
        summary: {
            totalRecords: {
                type: Number,
                default: 0,
            },
            successful: {
                type: Number,
                default: 0,
            },
            errors: {
                type: Number,
                default: 0,
            },
            conflicts: {
                type: Number,
                default: 0,
            },
            skipped: {
                type: Number,
                default: 0,
            },
            created: {
                type: Number,
                default: 0,
            },
            updated: {
                type: Number,
                default: 0,
            },
            deleted: {
                type: Number,
                default: 0,
            },
        },

        // Object-specific counts
        objectCounts: {
            contacts: {
                total: { type: Number, default: 0 },
                successful: { type: Number, default: 0 },
                errors: { type: Number, default: 0 },
            },
            accounts: {
                total: { type: Number, default: 0 },
                successful: { type: Number, default: 0 },
                errors: { type: Number, default: 0 },
            },
            opportunities: {
                total: { type: Number, default: 0 },
                successful: { type: Number, default: 0 },
                errors: { type: Number, default: 0 },
            },
        },

        // Error tracking
        errors: [{
            message: {
                type: String,
                required: true,
            },
            objectType: String,
            objectId: String,
            timestamp: {
                type: Date,
                default: Date.now,
            },
            stack: String,
        }],

        // Metadata
        triggeredBy: {
            type: String,
            enum: ['automatic', 'manual', 'webhook'],
            required: true,
        },
        triggeredByUserId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
SyncLogSchema.index({ workspaceId: 1, createdAt: -1 });
SyncLogSchema.index({ integrationId: 1, status: 1 });
SyncLogSchema.index({ status: 1, startedAt: -1 });

const SyncLog = mongoose.model<ISyncLog>('SyncLog', SyncLogSchema);

export default SyncLog;
