import mongoose, { Schema, Document } from "mongoose";

export interface ILeadFormField {
    name: string;
    label: string;
    type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
    placeholder?: string;
    required: boolean;
    options?: string[]; // for select fields
}

export interface ILeadFormTrigger {
    type: "delay" | "scroll" | "exit_intent" | "click";
    value?: number; // delay in seconds, or scroll percentage
    selector?: string; // for click trigger
}

export interface ILeadFormStyle {
    position: "center" | "bottom-right" | "bottom-left" | "top-right" | "top-left";
    theme: "light" | "dark" | "custom";
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
    borderRadius?: number;
    showOverlay?: boolean;
}

export interface ILeadForm extends Document {
    workspaceId: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    type: "popup" | "inline" | "slide_in" | "banner";
    fields: ILeadFormField[];
    style: ILeadFormStyle;
    trigger: ILeadFormTrigger;
    headline?: string;
    subheadline?: string;
    submitButtonText?: string;
    successMessage?: string;
    redirectUrl?: string;
    active: boolean;
    showOnPages?: string[]; // URL patterns to show on
    hideOnPages?: string[]; // URL patterns to hide from
    showFrequency: "always" | "once_per_session" | "once_per_visitor";
    views: number;
    submissions: number;
    createdAt: Date;
    updatedAt: Date;
}

const LeadFormFieldSchema = new Schema<ILeadFormField>({
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        enum: ["text", "email", "phone", "textarea", "select", "checkbox"],
        default: "text"
    },
    placeholder: { type: String },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
}, { _id: false });

const LeadFormTriggerSchema = new Schema<ILeadFormTrigger>({
    type: {
        type: String,
        enum: ["delay", "scroll", "exit_intent", "click"],
        default: "delay"
    },
    value: { type: Number, default: 5 },
    selector: { type: String },
}, { _id: false });

const LeadFormStyleSchema = new Schema<ILeadFormStyle>({
    position: {
        type: String,
        enum: ["center", "bottom-right", "bottom-left", "top-right", "top-left"],
        default: "center"
    },
    theme: { type: String, enum: ["light", "dark", "custom"], default: "light" },
    primaryColor: { type: String, default: "#10B981" },
    backgroundColor: { type: String, default: "#FFFFFF" },
    textColor: { type: String, default: "#18181B" },
    borderRadius: { type: Number, default: 12 },
    showOverlay: { type: Boolean, default: true },
}, { _id: false });

const LeadFormSchema = new Schema<ILeadForm>(
    {
        workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
        name: { type: String, required: true },
        description: { type: String },
        type: {
            type: String,
            enum: ["popup", "inline", "slide_in", "banner"],
            default: "popup"
        },
        fields: { type: [LeadFormFieldSchema], default: [] },
        style: { type: LeadFormStyleSchema, default: () => ({}) },
        trigger: { type: LeadFormTriggerSchema, default: () => ({}) },
        headline: { type: String, default: "Stay in touch" },
        subheadline: { type: String, default: "Get the latest updates delivered to your inbox." },
        submitButtonText: { type: String, default: "Subscribe" },
        successMessage: { type: String, default: "Thank you for subscribing!" },
        redirectUrl: { type: String },
        active: { type: Boolean, default: false, index: true },
        showOnPages: [{ type: String }],
        hideOnPages: [{ type: String }],
        showFrequency: {
            type: String,
            enum: ["always", "once_per_session", "once_per_visitor"],
            default: "once_per_session"
        },
        views: { type: Number, default: 0 },
        submissions: { type: Number, default: 0 },
    },
    { timestamps: true }
);

// Compound index for fetching active forms
LeadFormSchema.index({ workspaceId: 1, active: 1 });

export default mongoose.model<ILeadForm>("LeadForm", LeadFormSchema);
