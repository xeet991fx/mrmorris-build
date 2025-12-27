"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    EyeIcon,
    CodeBracketIcon,
    CheckIcon,
    XMarkIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { getForm, updateForm, Form, FormField } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const FIELD_TYPES = [
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'email', label: 'Email', icon: '📧' },
    { type: 'phone', label: 'Phone', icon: '📞' },
    { type: 'textarea', label: 'Textarea', icon: '📄' },
    { type: 'select', label: 'Dropdown', icon: '📋' },
    { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { type: 'radio', label: 'Radio', icon: '🔘' },
    { type: 'number', label: 'Number', icon: '🔢' },
    { type: 'date', label: 'Date', icon: '📅' },
    { type: 'url', label: 'URL', icon: '🔗' },
] as const;

export default function FormEditorPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const formId = params.formId as string;

    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'build' | 'settings' | 'embed'>('build');
    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [showFieldEditor, setShowFieldEditor] = useState(false);
    const [embedMode, setEmbedMode] = useState<'iframe' | 'direct'>('iframe');

    // Generate embed codes dynamically
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

    const iframeEmbedCode = form?._id ? `<!-- MorrisB Form Embed (Iframe Mode) -->
<script src="${frontendUrl}/forms/embed.js"></script>
<div data-morrisb-form="${form._id}"></div>` : '';

    const directEmbedCode = form?._id ? `<!-- MorrisB Form Embed (Direct Mode) -->
<script src="${frontendUrl}/forms/embed.js"></script>
<div
  data-morrisb-form="${form._id}"
  data-morrisb-mode="direct"
  data-morrisb-workspace="${workspaceId}"
></div>` : '';

    useEffect(() => {
        if (formId === 'new') {
            // Create new form
            setForm({
                name: 'Untitled Form',
                description: '',
                status: 'draft',
                fields: [],
                settings: {
                    submitButtonText: 'Submit',
                    successMessage: 'Thank you for your submission!',
                    autoCreateContact: true,
                    theme: 'light',
                    primaryColor: '#3b82f6',
                    backgroundColor: '#ffffff',
                    allowMultipleSubmissions: false,
                    requireCaptcha: false,
                    trackingEnabled: true,
                },
                stats: {
                    views: 0,
                    submissions: 0,
                    conversionRate: 0,
                },
            } as any);
            setIsLoading(false);
        } else {
            loadForm();
        }
    }, [formId]);

    const loadForm = async () => {
        try {
            const response = await getForm(workspaceId, formId);
            if (response.success) {
                setForm(response.data);
            }
        } catch (error) {
            console.error("Error loading form:", error);
            toast.error("Failed to load form");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form) return;

        setIsSaving(true);
        try {
            const response = await updateForm(workspaceId, formId, form);
            if (response.success) {
                toast.success("Form saved successfully");
                setForm(response.data);
            }
        } catch (error) {
            console.error("Error saving form:", error);
            toast.error("Failed to save form");
        } finally {
            setIsSaving(false);
        }
    };

    const addField = (type: FormField['type']) => {
        if (!form) return;

        const newField: FormField = {
            id: `field_${Date.now()}`,
            type,
            label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
            required: false,
        };

        setForm({ ...form, fields: [...form.fields, newField] });
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
        if (!form) return;

        setForm({
            ...form,
            fields: form.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
        });
    };

    const deleteField = (fieldId: string) => {
        if (!form) return;
        setForm({ ...form, fields: form.fields.filter(f => f.id !== fieldId) });
    };

    const togglePublish = async () => {
        if (!form) return;

        const newStatus = form.status === 'published' ? 'draft' : 'published';
        setForm({ ...form, status: newStatus });

        // Auto-save when publishing
        await handleSave();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!form) {
        return <div>Form not found</div>;
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="text-xl font-bold bg-transparent border-none focus:outline-none text-foreground"
                        placeholder="Form Name"
                    />
                    <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        form.status === 'published' ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"
                    )}>
                        {form.status}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                        onClick={togglePublish}
                        className={cn(
                            "px-4 py-2 rounded-lg transition-colors",
                            form.status === 'published'
                                ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                                : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                        )}
                    >
                        {form.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-border bg-card px-6 flex gap-4">
                {(['build', 'settings', 'embed'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-4 py-3 font-medium transition-colors border-b-2 capitalize",
                            activeTab === tab
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex">
                {activeTab === 'build' && (
                    <>
                        {/* Sidebar - Field Types */}
                        <div className="w-64 border-r border-border bg-card p-4 overflow-y-auto">
                            <h3 className="font-semibold text-foreground mb-3">Add Fields</h3>
                            <div className="space-y-2">
                                {FIELD_TYPES.map(({ type, label, icon }) => (
                                    <button
                                        key={type}
                                        onClick={() => addField(type as FormField['type'])}
                                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors text-left"
                                    >
                                        <span>{icon}</span>
                                        <span className="text-sm font-medium text-foreground">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Main Canvas */}
                        <div className="flex-1 p-8 overflow-y-auto">
                            <div className="max-w-2xl mx-auto space-y-4">
                                {form.fields.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-border rounded-lg">
                                        <p className="text-muted-foreground">
                                            Click on a field type to add it to your form
                                        </p>
                                    </div>
                                ) : (
                                    form.fields.map((field, idx) => (
                                        <motion.div
                                            key={field.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-all group"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <label className="block text-sm font-medium text-foreground">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingField(field);
                                                            setShowFieldEditor(true);
                                                        }}
                                                        className="p-1 hover:bg-muted rounded"
                                                    >
                                                        <Cog6ToothIcon className="w-4 h-4 text-muted-foreground" />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteField(field.id)}
                                                        className="p-1 hover:bg-red-500/10 rounded"
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Field Preview */}
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    placeholder={field.placeholder}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                    rows={3}
                                                    disabled
                                                />
                                            ) : field.type === 'select' ? (
                                                <select className="w-full px-3 py-2 bg-background border border-border rounded-lg" disabled>
                                                    <option>{field.placeholder || 'Select an option'}</option>
                                                    {field.options?.map((opt, i) => (
                                                        <option key={i}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : field.type === 'checkbox' || field.type === 'radio' ? (
                                                <div className="space-y-2">
                                                    {(field.options || ['Option 1']).map((opt, i) => (
                                                        <label key={i} className="flex items-center gap-2">
                                                            <input type={field.type} disabled className="rounded" />
                                                            <span className="text-sm text-foreground">{opt}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                    disabled
                                                />
                                            )}
                                        </motion.div>
                                    ))
                                )}

                                {/* Submit Button Preview */}
                                {form.fields.length > 0 && (
                                    <button
                                        className="w-full px-6 py-3 rounded-lg font-medium transition-colors"
                                        style={{
                                            backgroundColor: form.settings.primaryColor,
                                            color: '#ffffff',
                                        }}
                                        disabled
                                    >
                                        {form.settings.submitButtonText}
                                    </button>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'settings' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Submit Button Text
                                </label>
                                <input
                                    type="text"
                                    value={form.settings.submitButtonText}
                                    onChange={(e) => setForm({
                                        ...form,
                                        settings: { ...form.settings, submitButtonText: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Success Message
                                </label>
                                <textarea
                                    value={form.settings.successMessage}
                                    onChange={(e) => setForm({
                                        ...form,
                                        settings: { ...form.settings, successMessage: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Redirect URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={form.settings.redirectUrl || ''}
                                    onChange={(e) => setForm({
                                        ...form,
                                        settings: { ...form.settings, redirectUrl: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    placeholder="https://yoursite.com/thank-you"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Notification Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    value={form.settings.notificationEmail || ''}
                                    onChange={(e) => setForm({
                                        ...form,
                                        settings: { ...form.settings, notificationEmail: e.target.value }
                                    })}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    placeholder="sales@yourcompany.com"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Receive an email notification when someone submits this form
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoCreateContact"
                                    checked={form.settings.autoCreateContact}
                                    onChange={(e) => setForm({
                                        ...form,
                                        settings: { ...form.settings, autoCreateContact: e.target.checked }
                                    })}
                                    className="rounded"
                                />
                                <label htmlFor="autoCreateContact" className="text-sm text-foreground">
                                    Automatically create contacts from submissions
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'embed' && form._id && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {/* Embed Mode Selector */}
                            <div>
                                <h3 className="font-semibold text-foreground mb-4">Choose Embedding Method</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setEmbedMode('iframe')}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-all text-left",
                                            embedMode === 'iframe'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2",
                                                embedMode === 'iframe' ? "border-primary bg-primary" : "border-muted-foreground"
                                            )} />
                                            <h4 className="font-semibold text-foreground">Iframe Mode</h4>
                                            <span className="ml-auto px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full font-medium">
                                                Recommended
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Cross-domain safe. Works on any website. Form renders from MorrisB servers.
                                        </p>
                                    </button>

                                    <button
                                        onClick={() => setEmbedMode('direct')}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-all text-left",
                                            embedMode === 'direct'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2",
                                                embedMode === 'direct' ? "border-primary bg-primary" : "border-muted-foreground"
                                            )} />
                                            <h4 className="font-semibold text-foreground">Direct Mode</h4>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Faster. For same-domain embedding. Requires workspace ID.
                                        </p>
                                    </button>
                                </div>
                            </div>

                            {/* Embed Code */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-foreground">Embed Code</h3>
                                    <button
                                        onClick={() => {
                                            const code = embedMode === 'iframe' ? iframeEmbedCode : directEmbedCode;
                                            navigator.clipboard.writeText(code);
                                            toast.success('Embed code copied!');
                                        }}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                    >
                                        <CodeBracketIcon className="w-4 h-4" />
                                        Copy Code
                                    </button>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Copy and paste this code into your website's HTML where you want the form to appear
                                </p>
                                <div className="p-4 bg-gray-900 rounded-lg">
                                    <pre className="text-green-400 text-sm overflow-x-auto">
                                        <code>{embedMode === 'iframe' ? iframeEmbedCode : directEmbedCode}</code>
                                    </pre>
                                </div>
                            </div>

                            {/* How It Works */}
                            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                    <CheckIcon className="w-5 h-5 text-blue-500" />
                                    How It Works
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {embedMode === 'iframe' ? (
                                        <>
                                            <li>• Form loads in a secure iframe from MorrisB servers</li>
                                            <li>• Automatically connects to visitor tracking via cookies</li>
                                            <li>• Height adjusts automatically to fit content</li>
                                            <li>• Submissions create contacts in your CRM automatically</li>
                                        </>
                                    ) : (
                                        <>
                                            <li>• Form renders directly in your page's DOM</li>
                                            <li>• Faster loading, no iframe overhead</li>
                                            <li>• Requires same domain or proper CORS setup</li>
                                            <li>• Automatically identifies visitors via tracking script</li>
                                        </>
                                    )}
                                </ul>
                            </div>

                            {/* Direct Link */}
                            <div>
                                <h3 className="font-semibold text-foreground mb-3">Direct Link</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Share this link directly or use it to test your form
                                </p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 p-3 bg-muted rounded-lg">
                                        <code className="text-sm text-foreground break-all">
                                            {frontendUrl}/forms/{form._id}
                                        </code>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${frontendUrl}/forms/${form._id}`);
                                            toast.success('Link copied!');
                                        }}
                                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70"
                                    >
                                        Copy
                                    </button>
                                    <a
                                        href={`${frontendUrl}/forms/${form._id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                        Preview
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Field Editor Modal */}
            <AnimatePresence>
                {showFieldEditor && editingField && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowFieldEditor(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-lg p-6 w-full max-w-md"
                        >
                            <h3 className="text-lg font-bold text-foreground mb-4">Edit Field</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Label
                                    </label>
                                    <input
                                        type="text"
                                        value={editingField.label}
                                        onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Placeholder
                                    </label>
                                    <input
                                        type="text"
                                        value={editingField.placeholder || ''}
                                        onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    />
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="required"
                                        checked={editingField.required}
                                        onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="required" className="text-sm text-foreground">
                                        Required field
                                    </label>
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        onClick={() => setShowFieldEditor(false)}
                                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateField(editingField.id, editingField);
                                            setShowFieldEditor(false);
                                        }}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
