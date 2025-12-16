import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Team Model
 * 
 * Represents a team within a workspace for organizing users.
 */

export interface ITeamMember {
    userId: Types.ObjectId;
    role: "owner" | "admin" | "manager" | "member";
    joinedAt: Date;
}

export interface ITeam extends Document {
    workspaceId: Types.ObjectId;
    name: string;
    description?: string;
    members: ITeamMember[];
    createdBy: Types.ObjectId;
    isDefault: boolean; // Default team for workspace
    createdAt: Date;
    updatedAt: Date;
}

const teamMemberSchema = new Schema<ITeamMember>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        role: {
            type: String,
            enum: ["owner", "admin", "manager", "member"],
            default: "member",
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

const teamSchema = new Schema<ITeam>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: [true, "Workspace ID is required"],
            index: true,
        },
        name: {
            type: String,
            required: [true, "Team name is required"],
            trim: true,
            maxlength: [100, "Team name must be less than 100 characters"],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description must be less than 500 characters"],
        },
        members: {
            type: [teamMemberSchema],
            default: [],
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
teamSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
teamSchema.index({ "members.userId": 1 });

const Team = mongoose.model<ITeam>("Team", teamSchema);

export default Team;
