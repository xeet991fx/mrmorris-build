import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Email Template Model
 * 
 * Stores reusable email templates for workflow automation.
 * Templates can be used in workflow email actions.
 */

export interface IEmailTemplate extends Document {
    workspaceId: Types.ObjectId;
    createdBy: Types.ObjectId;
    name: string;
    subject: string;
    body: string;                    // Legacy HTML content (for backward compatibility)

    // NEW: Email Builder Fields
    builderJson?: any;               // Unlayer design JSON for editing
    htmlContent?: string;            // Compiled HTML for email sending
    thumbnailUrl?: string;           // Preview image URL
    isPredesigned: boolean;          // Template library flag
    version: number;                 // Version tracking

    category: string;                // "welcome", "follow-up", "nurture", "promotion", "custom"
    description?: string;
    isDefault: boolean;              // System templates vs user templates
    variables: string[];             // Detected variables like "firstName", "company"
    thumbnailColor?: string;         // For visual preview
    usageCount: number;              // Track how often template is used
    lastUsedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const emailTemplateSchema = new Schema<IEmailTemplate>(
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
            required: [true, "Creator ID is required"],
        },
        name: {
            type: String,
            required: [true, "Template name is required"],
            trim: true,
            maxlength: [100, "Template name cannot exceed 100 characters"],
        },
        subject: {
            type: String,
            required: [true, "Email subject is required"],
            trim: true,
            maxlength: [200, "Subject cannot exceed 200 characters"],
        },
        body: {
            type: String,
            required: false, // Made optional for builder-created templates
        },

        // NEW: Email Builder Fields
        builderJson: {
            type: Schema.Types.Mixed,
            required: false,
        },
        htmlContent: {
            type: String,
            required: false,
        },
        thumbnailUrl: {
            type: String,
            required: false,
        },
        isPredesigned: {
            type: Boolean,
            default: false,
            index: true,
        },
        version: {
            type: Number,
            default: 1,
        },

        category: {
            type: String,
            enum: ["welcome", "follow-up", "nurture", "promotion", "announcement", "custom"],
            default: "custom",
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, "Description cannot exceed 500 characters"],
        },
        isDefault: {
            type: Boolean,
            default: false,
        },
        variables: {
            type: [String],
            default: [],
        },
        thumbnailColor: {
            type: String,
            default: "#6366f1", // Default indigo color
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        lastUsedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient queries
emailTemplateSchema.index({ workspaceId: 1, category: 1 });
emailTemplateSchema.index({ workspaceId: 1, name: 1 });
emailTemplateSchema.index({ workspaceId: 1, isPredesigned: 1 });

// Static method to extract variables from content
emailTemplateSchema.statics.extractVariables = function (content: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }
    return variables;
};

// Virtual getter for backward compatibility
emailTemplateSchema.virtual('bodyContent').get(function() {
    return this.htmlContent || this.body;
});

// Pre-save hook to extract variables automatically
emailTemplateSchema.pre("save", function (next) {
    // Extract variables from subject, body, and htmlContent
    const content = `${this.subject} ${this.body || ''} ${this.htmlContent || ''}`;
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (!variables.includes(match[1])) {
            variables.push(match[1]);
        }
    }
    this.variables = variables;
    next();
});

const EmailTemplate = mongoose.model<IEmailTemplate>("EmailTemplate", emailTemplateSchema);

export default EmailTemplate;
