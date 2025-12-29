/**
 * Enhanced Form Model - HubSpot Level
 *
 * Advanced form builder with multi-step forms, progressive profiling,
 * lead routing, follow-up actions, GDPR compliance, and A/B testing.
 */

import mongoose, { Document, Schema, Types } from "mongoose";

// Advanced field types
export type FieldType =
    | 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'radio'
    | 'number' | 'date' | 'datetime' | 'time' | 'url' | 'file'
    | 'multiselect' | 'country' | 'state' | 'hidden' | 'richtext'
    | 'rating' | 'signature' | 'gdpr_consent' | 'marketing_consent'
    | 'divider' | 'html' | 'calculation';

export interface IFormField {
    id: string;
    type: FieldType;
    label: string;
    placeholder?: string;
    helpText?: string; // Tooltip/help text
    required: boolean;
    options?: string[]; // for select, radio, checkbox, multiselect
    defaultValue?: string;

    // Validation
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
        customValidation?: string; // JavaScript function as string
    };

    // CRM Mapping
    mapToField?: 'firstName' | 'lastName' | 'email' | 'phone' | 'company' |
                 'jobTitle' | 'website' | 'address' | 'city' | 'state' |
                 'country' | 'zip' | 'industry' | 'revenue' | 'employees' | 'custom';
    customFieldName?: string;

    // Conditional Logic
    conditionalLogic?: {
        enabled: boolean;
        rules: Array<{
            fieldId: string;
            operator: 'equals' | 'notEquals' | 'contains' | 'notContains' |
                      'isEmpty' | 'isNotEmpty' | 'greaterThan' | 'lessThan';
            value: string;
        }>;
        logicType: 'AND' | 'OR'; // How to combine multiple rules
    };

    // Progressive Profiling
    progressive?: {
        enabled: boolean;
        hideIfKnown: boolean; // Hide if contact already has this info
        priority: number; // Lower number = higher priority
    };

    // Styling
    width?: 'full' | 'half' | 'third'; // Field width
    cssClass?: string;

    // For calculation fields
    calculation?: {
        formula: string; // e.g., "field_1 + field_2 * 0.1"
        format?: 'number' | 'currency' | 'percentage';
    };

    // For file uploads
    fileSettings?: {
        maxSize: number; // MB
        allowedTypes: string[]; // ['pdf', 'doc', 'docx', 'jpg', 'png']
        multiple: boolean;
    };

    // For GDPR consent
    gdprSettings?: {
        consentText: string;
        privacyPolicyUrl?: string;
        required: boolean;
    };
}

// Multi-step form support
export interface IFormStep {
    id: string;
    name: string;
    description?: string;
    fields: string[]; // Array of field IDs
    conditionalLogic?: {
        enabled: boolean;
        showIf: {
            fieldId: string;
            operator: string;
            value: string;
        };
    };
}

// Lead routing rules
export interface ILeadRoutingRule {
    id: string;
    name: string;
    enabled: boolean;
    priority: number; // Lower = higher priority
    conditions: Array<{
        fieldId: string;
        operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan';
        value: string;
    }>;
    action: {
        type: 'assign' | 'tag' | 'notify';
        assignTo?: string; // User ID
        tags?: string[];
        notifyEmails?: string[];
    };
}

// Follow-up actions
export interface IFollowUpAction {
    id: string;
    type: 'email' | 'task' | 'webhook' | 'slack' | 'salesforce';
    enabled: boolean;

    // Email action
    emailConfig?: {
        to: string; // Can use field IDs like {field_email}
        from?: string;
        subject: string;
        body: string; // Supports template variables
        cc?: string[];
        bcc?: string[];
    };

    // Task action
    taskConfig?: {
        assignTo?: string; // User ID or {owner}
        title: string;
        description?: string;
        dueInDays?: number;
        priority: 'low' | 'medium' | 'high';
    };

    // Webhook action
    webhookConfig?: {
        url: string;
        method: 'GET' | 'POST' | 'PUT';
        headers?: Record<string, string>;
        body?: string; // JSON template
    };

    // Conditional trigger
    triggerConditions?: Array<{
        fieldId: string;
        operator: string;
        value: string;
    }>;
}

// A/B Testing variant
export interface IFormVariant {
    id: string;
    name: string;
    traffic: number; // Percentage (0-100)
    fields: IFormField[];
    settings: {
        submitButtonText: string;
        successMessage: string;
        primaryColor?: string;
    };
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
    };
}

export interface IForm extends Document {
    workspaceId: Types.ObjectId;
    userId: Types.ObjectId;

    // Basic info
    name: string;
    description?: string;
    status: 'draft' | 'published' | 'archived';

    // Form type
    formType: 'single_step' | 'multi_step';

    // Form structure
    fields: IFormField[];
    steps?: IFormStep[]; // For multi-step forms

    // Advanced Features
    progressiveProfilingEnabled: boolean;
    maxProgressiveFields?: number; // Max fields to show at once

    // Settings
    settings: {
        // Submission
        submitButtonText: string;
        successMessage: string;
        redirectUrl?: string;
        notificationEmails?: string[]; // Multiple notification recipients
        autoCreateContact: boolean;

        // Double Opt-in
        doubleOptIn?: {
            enabled: boolean;
            confirmationEmail?: {
                subject: string;
                body: string;
            };
        };

        // Appearance
        theme: 'light' | 'dark' | 'custom';
        primaryColor?: string;
        backgroundColor?: string;
        fontFamily?: string;
        customCss?: string;

        // Layout
        layout?: 'vertical' | 'horizontal' | 'two_column';
        labelPosition?: 'top' | 'left' | 'inside';
        fieldSpacing?: 'compact' | 'normal' | 'comfortable';

        // Advanced
        allowMultipleSubmissions: boolean;
        requireCaptcha: boolean;
        trackingEnabled: boolean;
        cookieTracking: boolean;

        // Submission limits
        maxSubmissions?: number;
        maxSubmissionsPerUser?: number;
        maxSubmissionsPerDay?: number;

        // Scheduling
        schedule?: {
            enabled: boolean;
            startDate?: Date;
            endDate?: Date;
            messageWhenClosed?: string;
        };

        // GDPR Compliance
        gdpr?: {
            enabled: boolean;
            consentRequired: boolean;
            dataRetentionDays?: number;
            allowDataExport: boolean;
            allowDataDeletion: boolean;
        };
    };

    // Lead Routing
    leadRouting?: {
        enabled: boolean;
        defaultAssignee?: string; // User ID
        rules: ILeadRoutingRule[];
        roundRobinEnabled?: boolean;
        roundRobinUsers?: string[];
    };

    // Follow-up Actions
    followUpActions: IFollowUpAction[];

    // A/B Testing
    abTesting?: {
        enabled: boolean;
        variants: IFormVariant[];
    };

    // Analytics
    stats: {
        views: number;
        submissions: number;
        conversionRate: number;
        averageTimeToComplete?: number; // seconds
        abandonmentRate?: number;
        lastSubmittedAt?: Date;

        // Field-level analytics
        fieldStats?: Array<{
            fieldId: string;
            completionRate: number;
            averageTime: number;
        }>;
    };

    // Integrations
    integrations?: {
        zapier?: { enabled: boolean; webhookUrl?: string };
        salesforce?: { enabled: boolean; objectType?: string };
        hubspot?: { enabled: boolean; formId?: string };
        mailchimp?: { enabled: boolean; listId?: string };
        slack?: { enabled: boolean; webhookUrl?: string; channel?: string };
    };

    // Embed
    embedCode?: string;

    createdAt: Date;
    updatedAt: Date;
}

// Field Schema
const formFieldSchema = new Schema<IFormField>({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'email', 'phone', 'textarea', 'select', 'checkbox', 'radio',
               'number', 'date', 'datetime', 'time', 'url', 'file', 'multiselect',
               'country', 'state', 'hidden', 'richtext', 'rating', 'signature',
               'gdpr_consent', 'marketing_consent', 'divider', 'html', 'calculation'],
        required: true,
    },
    label: { type: String, required: true },
    placeholder: { type: String },
    helpText: { type: String },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    defaultValue: { type: String },
    validation: {
        min: { type: Number },
        max: { type: Number },
        pattern: { type: String },
        message: { type: String },
        customValidation: { type: String },
    },
    mapToField: {
        type: String,
        enum: ['firstName', 'lastName', 'email', 'phone', 'company', 'jobTitle',
               'website', 'address', 'city', 'state', 'country', 'zip', 'industry',
               'revenue', 'employees', 'custom'],
    },
    customFieldName: { type: String },
    conditionalLogic: {
        enabled: { type: Boolean, default: false },
        rules: [{
            fieldId: { type: String },
            operator: { type: String },
            value: { type: String },
        }],
        logicType: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    },
    progressive: {
        enabled: { type: Boolean, default: false },
        hideIfKnown: { type: Boolean, default: false },
        priority: { type: Number, default: 0 },
    },
    width: { type: String, enum: ['full', 'half', 'third'], default: 'full' },
    cssClass: { type: String },
    calculation: {
        formula: { type: String },
        format: { type: String, enum: ['number', 'currency', 'percentage'] },
    },
    fileSettings: {
        maxSize: { type: Number, default: 10 },
        allowedTypes: [{ type: String }],
        multiple: { type: Boolean, default: false },
    },
    gdprSettings: {
        consentText: { type: String },
        privacyPolicyUrl: { type: String },
        required: { type: Boolean, default: true },
    },
}, { _id: false });

// Step Schema (for multi-step forms)
const formStepSchema = new Schema<IFormStep>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    fields: [{ type: String }],
    conditionalLogic: {
        enabled: { type: Boolean, default: false },
        showIf: {
            fieldId: { type: String },
            operator: { type: String },
            value: { type: String },
        },
    },
}, { _id: false });

// Lead Routing Rule Schema
const leadRoutingRuleSchema = new Schema<ILeadRoutingRule>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    conditions: [{
        fieldId: { type: String },
        operator: { type: String },
        value: { type: String },
    }],
    action: {
        type: { type: String, enum: ['assign', 'tag', 'notify'] },
        assignTo: { type: String },
        tags: [{ type: String }],
        notifyEmails: [{ type: String }],
    },
}, { _id: false });

// Follow-up Action Schema
const followUpActionSchema = new Schema<IFollowUpAction>({
    id: { type: String, required: true },
    type: { type: String, enum: ['email', 'task', 'webhook', 'slack', 'salesforce'], required: true },
    enabled: { type: Boolean, default: true },
    emailConfig: {
        to: { type: String },
        from: { type: String },
        subject: { type: String },
        body: { type: String },
        cc: [{ type: String }],
        bcc: [{ type: String }],
    },
    taskConfig: {
        assignTo: { type: String },
        title: { type: String },
        description: { type: String },
        dueInDays: { type: Number },
        priority: { type: String, enum: ['low', 'medium', 'high'] },
    },
    webhookConfig: {
        url: { type: String },
        method: { type: String, enum: ['GET', 'POST', 'PUT'] },
        headers: { type: Schema.Types.Mixed },
        body: { type: String },
    },
    triggerConditions: [{
        fieldId: { type: String },
        operator: { type: String },
        value: { type: String },
    }],
}, { _id: false });

// Form Variant Schema (for A/B testing)
const formVariantSchema = new Schema<IFormVariant>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    traffic: { type: Number, default: 50, min: 0, max: 100 },
    fields: [formFieldSchema],
    settings: {
        submitButtonText: { type: String, default: 'Submit' },
        successMessage: { type: String, default: 'Thank you!' },
        primaryColor: { type: String },
    },
    stats: {
        views: { type: Number, default: 0 },
        submissions: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
    },
}, { _id: false });

// Main Form Schema
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

        formType: {
            type: String,
            enum: ['single_step', 'multi_step'],
            default: 'single_step',
        },

        fields: [formFieldSchema],
        steps: [formStepSchema],

        progressiveProfilingEnabled: { type: Boolean, default: false },
        maxProgressiveFields: { type: Number, default: 5 },

        settings: {
            submitButtonText: { type: String, default: 'Submit' },
            successMessage: { type: String, default: 'Thank you for your submission!' },
            redirectUrl: { type: String },
            notificationEmails: [{ type: String }],
            autoCreateContact: { type: Boolean, default: true },

            doubleOptIn: {
                enabled: { type: Boolean, default: false },
                confirmationEmail: {
                    subject: { type: String },
                    body: { type: String },
                },
            },

            theme: {
                type: String,
                enum: ['light', 'dark', 'custom'],
                default: 'light',
            },
            primaryColor: { type: String, default: '#3b82f6' },
            backgroundColor: { type: String, default: '#ffffff' },
            fontFamily: { type: String },
            customCss: { type: String },

            layout: { type: String, enum: ['vertical', 'horizontal', 'two_column'], default: 'vertical' },
            labelPosition: { type: String, enum: ['top', 'left', 'inside'], default: 'top' },
            fieldSpacing: { type: String, enum: ['compact', 'normal', 'comfortable'], default: 'normal' },

            allowMultipleSubmissions: { type: Boolean, default: false },
            requireCaptcha: { type: Boolean, default: false },
            trackingEnabled: { type: Boolean, default: true },
            cookieTracking: { type: Boolean, default: true },

            maxSubmissions: { type: Number },
            maxSubmissionsPerUser: { type: Number },
            maxSubmissionsPerDay: { type: Number },

            schedule: {
                enabled: { type: Boolean, default: false },
                startDate: { type: Date },
                endDate: { type: Date },
                messageWhenClosed: { type: String },
            },

            gdpr: {
                enabled: { type: Boolean, default: false },
                consentRequired: { type: Boolean, default: false },
                dataRetentionDays: { type: Number },
                allowDataExport: { type: Boolean, default: true },
                allowDataDeletion: { type: Boolean, default: true },
            },
        },

        leadRouting: {
            enabled: { type: Boolean, default: false },
            defaultAssignee: { type: String },
            rules: [leadRoutingRuleSchema],
            roundRobinEnabled: { type: Boolean, default: false },
            roundRobinUsers: [{ type: String }],
        },

        followUpActions: [followUpActionSchema],

        abTesting: {
            enabled: { type: Boolean, default: false },
            variants: [formVariantSchema],
        },

        stats: {
            views: { type: Number, default: 0 },
            submissions: { type: Number, default: 0 },
            conversionRate: { type: Number, default: 0 },
            averageTimeToComplete: { type: Number },
            abandonmentRate: { type: Number },
            lastSubmittedAt: { type: Date },
            fieldStats: [{
                fieldId: { type: String },
                completionRate: { type: Number },
                averageTime: { type: Number },
            }],
        },

        integrations: {
            zapier: { enabled: { type: Boolean, default: false }, webhookUrl: { type: String } },
            salesforce: { enabled: { type: Boolean, default: false }, objectType: { type: String } },
            hubspot: { enabled: { type: Boolean, default: false }, formId: { type: String } },
            mailchimp: { enabled: { type: Boolean, default: false }, listId: { type: String } },
            slack: {
                enabled: { type: Boolean, default: false },
                webhookUrl: { type: String },
                channel: { type: String },
            },
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
formSchema.index({ 'stats.conversionRate': -1 });

// Generate embed code on save
formSchema.pre('save', function(next) {
    if (this.isModified('_id') || !this.embedCode) {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        this.embedCode = `<script src="${baseUrl}/forms/embed.js"></script>\n<div data-morrisb-form="${this._id}"></div>`;
    }
    next();
});

// Update conversion rate when stats change
formSchema.pre('save', function(next) {
    if (this.stats.views > 0) {
        this.stats.conversionRate = (this.stats.submissions / this.stats.views) * 100;
    }

    // Update A/B testing variant stats
    if (this.abTesting?.enabled && this.abTesting.variants) {
        this.abTesting.variants.forEach(variant => {
            if (variant.stats.views > 0) {
                variant.stats.conversionRate = (variant.stats.submissions / variant.stats.views) * 100;
            }
        });
    }

    next();
});

const Form = mongoose.model<IForm>("Form", formSchema);

export default Form;
