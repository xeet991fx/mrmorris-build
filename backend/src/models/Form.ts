/**
 * Form Model
 *
 * Stores form definitions with fields, validation rules, and settings.
 * Used for lead generation forms and landing pages.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFormField {
    id: string;
    type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'number' | 'date' | 'url';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[]; // for select, radio, checkbox
    defaultValue?: string;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
    mapToField?: 'firstName' | 'lastName' | 'email' | 'phone' | 'company' | 'jobTitle' | 'website' | 'custom';
    customFieldName?: string;
}

export interface IForm extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Basic info
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';

    // Form fields
    fields: IFormField[];

    // Settings
    settings: {
        // Submission
        submitButtonText: string;
        successMessage: string;
        redirectUrl?: string;
        notificationEmail?: string;
        autoCreateContact: boolean;

        // Appearance
        theme: 'light' | 'dark' | 'custom';
        primaryColor?: string;
        backgroundColor?: string;

        // Advanced
        allowMultipleSubmissions: boolean;
        requireCaptcha: boolean;
        trackingEnabled: boolean;
    };

    // Analytics
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
        lastSubmittedAt?: Date;
    };

    // Embed
    embedCode?: string;

    createdAt: Date;
    updatedAt: Date;
}

const formFieldSchema = new Schema<IFormField>({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio', 'number', 'date', 'url'],
        required: true,
    },
    label: { type: String, required: true },
    placeholder: { type: String },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    defaultValue: { type: String },
    validation: {
        min: { type: Number },
        max: { type: Number },
        pattern: { type: String },
        message: { type: String },
    },
    mapToField: {
        type: String,
        enum: ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle', 'website', 'custom'],
    },
    customFieldName: { type: String },
}, { _id: false });

const formSchema = new Schema<IForm>(
    {
        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: [200, "Name must be less than 200 characters"],
        },
        description: { type: String },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
            index: true,
        },

        fields: [formFieldSchema],

        settings: {
            submitButtonText: { type: String, default: 'Submit' },
            successMessage: { type: String, default: 'Thank you for your submission!' },
            redirectUrl: { type: String },
            notificationEmail: { type: String },
            autoCreateContact: { type: Boolean, default: true },
            theme: {
                type: String,
                enum: ['light', 'dark', 'custom'],
                default: 'light',
            },
            primaryColor: { type: String, default: '#3b82f6' },
            backgroundColor: { type: String, default: '#ffffff' },
            allowMultipleSubmissions: { type: Boolean, default: false },
            requireCaptcha: { type: Boolean, default: false },
            trackingEnabled: { type: Boolean, default: true },
        },

        stats: {
            views: { type: Number, default: 0 },
            submissions: { type: Number, default: 0 },
            conversionRate: { type: Number, default: 0 },
            lastSubmittedAt: { type: Date },
        },

        embedCode: { type: String },
    },
    {
        timestamps: true,
    }
);

// Indexes
formSchema.index({ workspaceId: 1, status: 1 });
formSchema.index({ workspaceId: 1, createdAt: -1 });

// Generate embed code on save
formSchema.pre('save', function(next) {
    if (this.isModified('_id') || !this.embedCode) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        this.embedCode = `<script src="${baseUrl}/forms/embed.js"></script>\n<div data-form-id="${this._id}"></div>`;
    }
    next();
});

// Update conversion rate when stats change
formSchema.pre('save', function(next) {
    if (this.stats.views > 0) {
        this.stats.conversionRate = (this.stats.submissions / this.stats.views) * 100;
    }
    next();
});

const Form = mongoose.model<IForm>("Form", formSchema);

export default Form;
