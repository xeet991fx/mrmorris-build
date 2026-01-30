"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    EyeIcon,
    CheckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

interface FormField {
    name: string;
    label: string;
    type: "text" | "email" | "phone" | "textarea" | "select" | "checkbox";
    placeholder?: string;
    required: boolean;
    options?: string[];
}

interface LeadForm {
    _id: string;
    name: string;
    description?: string;
    type: "popup" | "inline" | "slide_in" | "banner";
    fields: FormField[];
    style: {
        position: string;
        theme: string;
        primaryColor: string;
        backgroundColor: string;
        textColor: string;
        borderRadius: number;
        showOverlay: boolean;
    };
    trigger: {
        type: "delay" | "scroll" | "exit_intent" | "click";
        value?: number;
        selector?: string;
    };
    headline: string;
    subheadline: string;
    submitButtonText: string;
    successMessage: string;
    redirectUrl?: string;
    active: boolean;
    showOnPages?: string[];
    hideOnPages?: string[];
    showFrequency: string;
}

export default function LeadFormEditorPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const formId = params.formId as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [form, setForm] = useState<LeadForm | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const fetchForm = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get(`/workspaces/${workspaceId}/lead-forms/${formId}`);
            if (data.success) {
                setForm(data.data);
            }
        } catch (error) {
            console.error("Error fetching form:", error);
            toast.error("Failed to load form");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, formId]);

    useEffect(() => {
        fetchForm();
    }, [fetchForm]);

    const handleSave = async () => {
        if (!form) return;
        try {
            setIsSaving(true);
            const { data } = await axios.put(`/workspaces/${workspaceId}/lead-forms/${formId}`, form);
            if (data.success) {
                toast.success("Form saved");
            }
        } catch (error) {
            console.error("Error saving form:", error);
            toast.error("Failed to save form");
        } finally {
            setIsSaving(false);
        }
    };

    const updateForm = (updates: Partial<LeadForm>) => {
        if (!form) return;
        setForm({ ...form, ...updates });
    };

    const updateField = (index: number, updates: Partial<FormField>) => {
        if (!form) return;
        const newFields = [...form.fields];
        newFields[index] = { ...newFields[index], ...updates };
        setForm({ ...form, fields: newFields });
    };

    const addField = () => {
        if (!form) return;
        const newField: FormField = {
            name: `field_${Date.now()}`,
            label: "New Field",
            type: "text",
            placeholder: "",
            required: false,
        };
        setForm({ ...form, fields: [...form.fields, newField] });
    };

    const removeField = (index: number) => {
        if (!form) return;
        const newFields = form.fields.filter((_, i) => i !== index);
        setForm({ ...form, fields: newFields });
    };

    if (isLoading || !form) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading form...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex">
            {/* Editor Panel */}
            <div className="flex-1 overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href={`/projects/${workspaceId}/lead-forms`}>
                                <button className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                    <ArrowLeftIcon className="w-5 h-5" />
                                </button>
                            </Link>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => updateForm({ name: e.target.value })}
                                className="text-xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 text-zinc-900 dark:text-zinc-100"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <EyeIcon className="w-4 h-4" />
                                Preview
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <CheckIcon className="w-4 h-4" />
                                )}
                                Save
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-8">
                    {/* Form Type & Trigger */}
                    <section>
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Display Settings</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Form Type</label>
                                <select
                                    value={form.type}
                                    onChange={(e) => updateForm({ type: e.target.value as any })}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                >
                                    <option value="popup">Popup (Center)</option>
                                    <option value="slide_in">Slide-in (Corner)</option>
                                    <option value="banner">Banner (Top/Bottom)</option>
                                    <option value="inline">Inline (Embedded)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Trigger</label>
                                <select
                                    value={form.trigger.type}
                                    onChange={(e) => updateForm({ trigger: { ...form.trigger, type: e.target.value as any } })}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                >
                                    <option value="delay">Time Delay</option>
                                    <option value="scroll">Scroll Percentage</option>
                                    <option value="exit_intent">Exit Intent</option>
                                    <option value="click">On Element Click</option>
                                </select>
                            </div>
                        </div>
                        {(form.trigger.type === "delay" || form.trigger.type === "scroll") && (
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                                    {form.trigger.type === "delay" ? "Delay (seconds)" : "Scroll percentage"}
                                </label>
                                <input
                                    type="number"
                                    value={form.trigger.value || 5}
                                    onChange={(e) => updateForm({ trigger: { ...form.trigger, value: parseInt(e.target.value) } })}
                                    className="w-24 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                    min={0}
                                    max={form.trigger.type === "scroll" ? 100 : 120}
                                />
                            </div>
                        )}
                    </section>

                    {/* Content */}
                    <section>
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Content</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Headline</label>
                                <input
                                    type="text"
                                    value={form.headline || ""}
                                    onChange={(e) => updateForm({ headline: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                    placeholder="Stay in touch"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Subheadline</label>
                                <input
                                    type="text"
                                    value={form.subheadline || ""}
                                    onChange={(e) => updateForm({ subheadline: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                    placeholder="Get the latest updates"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Button Text</label>
                                    <input
                                        type="text"
                                        value={form.submitButtonText || "Subscribe"}
                                        onChange={(e) => updateForm({ submitButtonText: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Success Message</label>
                                    <input
                                        type="text"
                                        value={form.successMessage || ""}
                                        onChange={(e) => updateForm({ successMessage: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                        placeholder="Thank you!"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Fields */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Form Fields</h3>
                            <button
                                onClick={addField}
                                className="flex items-center gap-1 text-sm text-violet-600 hover:text-violet-700"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Add Field
                            </button>
                        </div>
                        <div className="space-y-3">
                            {form.fields.map((field, index) => (
                                <div key={index} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                                    <div className="grid grid-cols-4 gap-3">
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1">Label</label>
                                            <input
                                                type="text"
                                                value={field.label}
                                                onChange={(e) => updateField(index, { label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                                className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1">Type</label>
                                            <select
                                                value={field.type}
                                                onChange={(e) => updateField(index, { type: e.target.value as any })}
                                                className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                            >
                                                <option value="text">Text</option>
                                                <option value="email">Email</option>
                                                <option value="phone">Phone</option>
                                                <option value="textarea">Textarea</option>
                                                <option value="checkbox">Checkbox</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-zinc-500 mb-1">Placeholder</label>
                                            <input
                                                type="text"
                                                value={field.placeholder || ""}
                                                onChange={(e) => updateField(index, { placeholder: e.target.value })}
                                                className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                                            />
                                        </div>
                                        <div className="flex items-end gap-2">
                                            <label className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={field.required}
                                                    onChange={(e) => updateField(index, { required: e.target.checked })}
                                                    className="rounded"
                                                />
                                                Required
                                            </label>
                                            <button
                                                onClick={() => removeField(index)}
                                                className="p-1.5 text-zinc-400 hover:text-red-500 transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Style */}
                    <section>
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Style</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Primary Color</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={form.style?.primaryColor || "#10B981"}
                                        onChange={(e) => updateForm({ style: { ...form.style, primaryColor: e.target.value } })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={form.style?.primaryColor || "#10B981"}
                                        onChange={(e) => updateForm({ style: { ...form.style, primaryColor: e.target.value } })}
                                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Background</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={form.style?.backgroundColor || "#FFFFFF"}
                                        onChange={(e) => updateForm({ style: { ...form.style, backgroundColor: e.target.value } })}
                                        className="w-10 h-10 rounded cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={form.style?.backgroundColor || "#FFFFFF"}
                                        onChange={(e) => updateForm({ style: { ...form.style, backgroundColor: e.target.value } })}
                                        className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Border Radius</label>
                                <input
                                    type="number"
                                    value={form.style?.borderRadius || 12}
                                    onChange={(e) => updateForm({ style: { ...form.style, borderRadius: parseInt(e.target.value) } })}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                    min={0}
                                    max={32}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Preview Panel */}
            {showPreview && (
                <div className="w-96 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Preview</h3>
                        <button onClick={() => setShowPreview(false)} className="text-zinc-400 hover:text-zinc-600">
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    </div>
                    <div
                        className="rounded-xl shadow-xl p-6"
                        style={{
                            backgroundColor: form.style?.backgroundColor || "#FFFFFF",
                            borderRadius: `${form.style?.borderRadius || 12}px`,
                        }}
                    >
                        <h2 className="text-xl font-bold mb-2" style={{ color: form.style?.textColor || "#18181B" }}>
                            {form.headline || "Stay in touch"}
                        </h2>
                        <p className="text-sm mb-4" style={{ color: form.style?.textColor || "#71717A" }}>
                            {form.subheadline || "Get the latest updates"}
                        </p>
                        <div className="space-y-3">
                            {form.fields.map((field, index) => (
                                <div key={index}>
                                    <label className="block text-sm font-medium mb-1" style={{ color: form.style?.textColor || "#18181B" }}>
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {field.type === "textarea" ? (
                                        <textarea
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                                            rows={3}
                                            disabled
                                        />
                                    ) : field.type === "checkbox" ? (
                                        <label className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" disabled className="rounded" />
                                            {field.placeholder || field.label}
                                        </label>
                                    ) : (
                                        <input
                                            type={field.type}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2 rounded-lg border border-zinc-200"
                                            disabled
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            className="w-full mt-4 py-2.5 rounded-lg text-white font-medium"
                            style={{ backgroundColor: form.style?.primaryColor || "#10B981" }}
                            disabled
                        >
                            {form.submitButtonText || "Subscribe"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
