/**
 * FormSubmission Model
 *
 * Stores form submissions with field data, source tracking, and contact linking.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFormSubmission extends Document {
    workspaceId: Types.ObjectId;
    formId: Types.ObjectId;
    contactId?: Types.ObjectId; // Auto-created contact

    // Submission data
    data: Record<string, any>; // Field ID -> value mapping

    // Source tracking
    source: {
        url?: string;
        referrer?: string;
        userAgent?: string;
        ip?: string;
        utmSource?: string;
        utmMedium?: string;
        utmCampaign?: string;
    };

    // Status
    status: 'new' | 'contacted' | 'qualified' | 'spam' | 'archived';
    notes?: string;

    // Processing
    contactCreated: boolean;
    processedAt?: Date;
    processingError?: string;

    // Google Sheets sync tracking
    googleSheetSync?: {
        synced: boolean;
        syncedAt?: Date;
        spreadsheetId?: string;
        sheetName?: string;
        error?: string;
    };

    createdAt: Date;
    updatedAt: Date;
}

const formSubmissionSchema = new Schema<IFormSubmission>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        formId: {
            type: Schema.Types.ObjectId,
            ref: "Form",
            required: true,
            index: true,
        },
        contactId: {
            type: Schema.Types.ObjectId,
            ref: "Contact",
            index: true,
        },

        data: {
            type: Schema.Types.Mixed,
            required: true,
        },

        source: {
            url: { type: String },
            referrer: { type: String },
            userAgent: { type: String },
            ip: { type: String },
            utmSource: { type: String },
            utmMedium: { type: String },
            utmCampaign: { type: String },
        },

        status: {
            type: String,
            enum: ['new', 'contacted', 'qualified', 'spam', 'archived'],
            default: 'new',
            index: true,
        },
        notes: { type: String },

        contactCreated: { type: Boolean, default: false },
        processedAt: { type: Date },
        processingError: { type: String },

        // Google Sheets sync tracking
        googleSheetSync: {
            synced: { type: Boolean, default: false },
            syncedAt: { type: Date },
            spreadsheetId: { type: String },
            sheetName: { type: String },
            error: { type: String },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
formSubmissionSchema.index({ workspaceId: 1, formId: 1, createdAt: -1 });
formSubmissionSchema.index({ workspaceId: 1, status: 1 });
formSubmissionSchema.index({ workspaceId: 1, contactId: 1 });

const FormSubmission = mongoose.model<IFormSubmission>("FormSubmission", formSubmissionSchema);

export default FormSubmission;
