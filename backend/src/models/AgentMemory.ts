import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Story 1.5: AgentMemoryData Model
 * 
 * Stores actual memory values during agent execution.
 * Supports workspace isolation, TTL-based expiration, and key uniqueness.
 */

export interface IAgentMemoryData extends Document {
    workspace: Types.ObjectId;
    agent: Types.ObjectId;
    key: string;           // Variable name
    value: any;            // Current value
    expiresAt?: Date;      // TTL for auto-deletion (null = forever)
    createdAt: Date;
    updatedAt: Date;
}

const AgentMemoryDataSchema = new Schema<IAgentMemoryData>(
    {
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Project',  // Matches existing workspace pattern
            required: [true, 'Workspace is required']
        },
        agent: {
            type: Schema.Types.ObjectId,
            ref: 'Agent',
            required: [true, 'Agent is required']
        },
        key: {
            type: String,
            required: [true, 'Memory key is required'],
            validate: {
                validator: (v: string) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v),
                message: 'Memory key must be a valid identifier (alphanumeric + underscore, starting with letter or underscore)'
            }
        },
        value: {
            type: Schema.Types.Mixed,
            required: [true, 'Memory value is required']
        },
        expiresAt: {
            type: Date,
            index: { expireAfterSeconds: 0 }  // MongoDB TTL index - documents deleted when expiresAt is reached
        }
    },
    {
        timestamps: true
    }
);

// Compound index for workspace isolation and uniqueness
// Ensures one value per key per agent per workspace
AgentMemoryDataSchema.index({ workspace: 1, agent: 1, key: 1 }, { unique: true });

// Query performance indexes
AgentMemoryDataSchema.index({ workspace: 1, agent: 1 });
AgentMemoryDataSchema.index({ workspace: 1, expiresAt: 1 });

// CRITICAL: Workspace isolation middleware - prevents cross-workspace data leaks
AgentMemoryDataSchema.pre('find', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData find queries');
    }
});

AgentMemoryDataSchema.pre('findOne', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData findOne queries');
    }
});

AgentMemoryDataSchema.pre('findOneAndUpdate', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData findOneAndUpdate queries');
    }
});

AgentMemoryDataSchema.pre('deleteOne', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData deleteOne queries');
    }
});

AgentMemoryDataSchema.pre('deleteMany', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData deleteMany queries');
    }
});

AgentMemoryDataSchema.pre('updateMany', function () {
    if (!this.getQuery().workspace) {
        throw new Error('SECURITY: Workspace filter required for AgentMemoryData updateMany queries');
    }
});

const AgentMemoryData = mongoose.model<IAgentMemoryData>('AgentMemoryData', AgentMemoryDataSchema);

export default AgentMemoryData;
