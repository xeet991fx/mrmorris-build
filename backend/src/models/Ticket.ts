import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// INTERFACES
// ============================================

export type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "support" | "billing" | "technical" | "feature_request" | "bug" | "other";

export interface ITicketComment extends Document {
    userId: Types.ObjectId;
    message: string;
    isInternal: boolean; // Internal notes not visible to customer
    attachments?: string[];
    createdAt: Date;
}

export interface ITicket extends Document {
    workspaceId: Types.ObjectId;
    ticketNumber: string; // Auto-generated like "TKT-001"

    // Basic info
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;

    // Requester (can be contact or external)
    requesterId?: Types.ObjectId; // Contact reference
    requesterEmail: string;
    requesterName?: string;

    // Assignment
    assignedTo?: Types.ObjectId;
    assignedTeam?: string;

    // Related entities
    relatedContactId?: Types.ObjectId;
    relatedCompanyId?: Types.ObjectId;

    // SLA tracking
    dueDate?: Date;
    firstResponseAt?: Date;
    resolvedAt?: Date;
    slaBreached: boolean;

    // Comments/Thread
    comments: ITicketComment[];

    // Tags
    tags?: string[];

    // Source
    source: "email" | "web" | "chat" | "phone" | "api";

    // Metrics
    responseTimeMinutes?: number;
    resolutionTimeMinutes?: number;

    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================
// SCHEMAS
// ============================================

const ticketCommentSchema = new Schema<ITicketComment>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        message: {
            type: String,
            required: true,
            maxlength: 10000,
        },
        isInternal: {
            type: Boolean,
            default: false,
        },
        attachments: [{
            type: String,
        }],
    },
    {
        timestamps: true,
    }
);

const ticketSchema = new Schema<ITicket>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        ticketNumber: {
            type: String,
            required: true,
            unique: true,
        },

        // Basic info
        subject: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        description: {
            type: String,
            required: true,
            maxlength: 10000,
        },
        status: {
            type: String,
            enum: ["open", "in_progress", "waiting_on_customer", "resolved", "closed"],
            default: "open",
            index: true,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
            index: true,
        },
        category: {
            type: String,
            enum: ["support", "billing", "technical", "feature_request", "bug", "other"],
            default: "support",
        },

        // Requester
        requesterId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
        },
        requesterEmail: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },
        requesterName: {
            type: String,
            trim: true,
        },

        // Assignment
        assignedTo: {
            type: Schema.Types.ObjectId,
            ref: "User",
            index: true,
        },
        assignedTeam: {
            type: String,
        },

        // Related entities
        relatedContactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
        },
        relatedCompanyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
        },

        // SLA tracking
        dueDate: {
            type: Date,
            index: true,
        },
        firstResponseAt: {
            type: Date,
        },
        resolvedAt: {
            type: Date,
        },
        slaBreached: {
            type: Boolean,
            default: false,
        },

        // Comments
        comments: [ticketCommentSchema],

        // Tags
        tags: [{
            type: String,
            trim: true,
        }],

        // Source
        source: {
            type: String,
            enum: ["email", "web", "chat", "phone", "api"],
            default: "web",
        },

        // Metrics
        responseTimeMinutes: Number,
        resolutionTimeMinutes: Number,

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes
ticketSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
ticketSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
ticketSchema.index({ workspaceId: 1, priority: 1, status: 1 });
ticketSchema.index({ workspaceId: 1, requesterEmail: 1 });

// Auto-generate ticket number
ticketSchema.pre("save", async function (next) {
    if (this.isNew && !this.ticketNumber) {
        const count = await mongoose.model("Ticket").countDocuments({ workspaceId: this.workspaceId });
        this.ticketNumber = `TKT-${String(count + 1).padStart(4, "0")}`;
    }
    next();
});

// ============================================
// MODEL
// ============================================

const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema);
export default Ticket;
