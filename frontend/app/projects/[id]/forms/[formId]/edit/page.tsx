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
    Bars3Icon,
    DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { getForm, updateForm, Form, FormField } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    { type: 'file', label: 'File Upload', icon: '📎' },
] as const;

// Sortable Field Component
function SortableFieldItem({
    field,
    onEdit,
    onDelete,
    onDuplicate
}: {
    field: FormField;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-all group"
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-1">
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <Bars3Icon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <label className="block text-sm font-medium text-foreground">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.conditionalLogic?.enabled && (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 text-xs rounded-full">
                            Conditional
                        </span>
                    )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onDuplicate}
                        className="p-1 hover:bg-muted rounded"
                        title="Duplicate field"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-1 hover:bg-muted rounded"
                        title="Edit field"
                    >
                        <Cog6ToothIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1 hover:bg-red-500/10 rounded"
                        title="Delete field"
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
            ) : field.type === 'file' ? (
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">{field.placeholder || 'Max file size: 10MB'}</p>
                </div>
            ) : (
                <input
                    type={field.type === 'file' ? 'text' : field.type}
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                    disabled
                />
            )}
        </div>
    );
}

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

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    const duplicateField = (fieldId: string) => {
        if (!form) return;
        const fieldToDuplicate = form.fields.find(f => f.id === fieldId);
        if (!fieldToDuplicate) return;

        const newField = {
            ...fieldToDuplicate,
            id: `field_${Date.now()}`,
            label: `${fieldToDuplicate.label} (Copy)`,
        };

        const fieldIndex = form.fields.findIndex(f => f.id === fieldId);
        const newFields = [...form.fields];
        newFields.splice(fieldIndex + 1, 0, newField);

        setForm({ ...form, fields: newFields });
        toast.success('Field duplicated');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || !form) return;

        if (active.id !== over.id) {
            const oldIndex = form.fields.findIndex((f) => f.id === active.id);
            const newIndex = form.fields.findIndex((f) => f.id === over.id);

            const newFields = arrayMove(form.fields, oldIndex, newIndex);
            setForm({ ...form, fields: newFields });
        }
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
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={form.fields.map(f => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {form.fields.map((field) => (
                                                <SortableFieldItem
                                                    key={field.id}
                                                    field={field}
                                                    onEdit={() => {
                                                        setEditingField(field);
                                                        setShowFieldEditor(true);
                                                    }}
                                                    onDelete={() => deleteField(field.id)}
                                                    onDuplicate={() => duplicateField(field.id)}
                                                />
                                            ))}
                                        </SortableContext>
                                    </DndContext>
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

                            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
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

                                {/* Options for select, checkbox, radio */}
                                {(editingField.type === 'select' || editingField.type === 'checkbox' || editingField.type === 'radio') && (
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Options (one per line)
                                        </label>
                                        <textarea
                                            value={(editingField.options || []).join('\n')}
                                            onChange={(e) => setEditingField({
                                                ...editingField,
                                                options: e.target.value.split('\n').filter(o => o.trim())
                                            })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                            rows={5}
                                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                                        />
                                    </div>
                                )}

                                {/* File upload settings */}
                                {editingField.type === 'file' && (
                                    <>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Max File Size (MB)
                                            </label>
                                            <input
                                                type="number"
                                                value={editingField.validation?.max || 10}
                                                onChange={(e) => setEditingField({
                                                    ...editingField,
                                                    validation: { ...editingField.validation, max: parseInt(e.target.value) }
                                                })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                min={1}
                                                max={100}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Allowed File Types
                                            </label>
                                            <input
                                                type="text"
                                                value={editingField.validation?.pattern || ''}
                                                onChange={(e) => setEditingField({
                                                    ...editingField,
                                                    validation: { ...editingField.validation, pattern: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                placeholder=".pdf,.doc,.docx,.jpg,.png"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Leave empty to allow all file types
                                            </p>
                                        </div>
                                    </>
                                )}

                                {/* Conditional Logic */}
                                <div className="border-t border-border pt-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="conditionalLogic"
                                            checked={editingField.conditionalLogic?.enabled || false}
                                            onChange={(e) => setEditingField({
                                                ...editingField,
                                                conditionalLogic: {
                                                    enabled: e.target.checked,
                                                    showIf: editingField.conditionalLogic?.showIf || {
                                                        fieldId: '',
                                                        operator: 'equals',
                                                        value: ''
                                                    }
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <label htmlFor="conditionalLogic" className="text-sm font-medium text-foreground">
                                            Conditional Logic
                                        </label>
                                    </div>

                                    {editingField.conditionalLogic?.enabled && (
                                        <div className="space-y-3 pl-6">
                                            <p className="text-xs text-muted-foreground">
                                                Show this field only if:
                                            </p>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    Field
                                                </label>
                                                <select
                                                    value={editingField.conditionalLogic?.showIf?.fieldId || ''}
                                                    onChange={(e) => setEditingField({
                                                        ...editingField,
                                                        conditionalLogic: {
                                                            ...editingField.conditionalLogic!,
                                                            showIf: {
                                                                ...editingField.conditionalLogic!.showIf,
                                                                fieldId: e.target.value
                                                            }
                                                        }
                                                    })}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                                >
                                                    <option value="">Select a field...</option>
                                                    {form?.fields.filter(f => f.id !== editingField.id).map(field => (
                                                        <option key={field.id} value={field.id}>{field.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    Condition
                                                </label>
                                                <select
                                                    value={editingField.conditionalLogic?.showIf?.operator || 'equals'}
                                                    onChange={(e) => setEditingField({
                                                        ...editingField,
                                                        conditionalLogic: {
                                                            ...editingField.conditionalLogic!,
                                                            showIf: {
                                                                ...editingField.conditionalLogic!.showIf,
                                                                operator: e.target.value as any
                                                            }
                                                        }
                                                    })}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                                >
                                                    <option value="equals">Equals</option>
                                                    <option value="notEquals">Not Equals</option>
                                                    <option value="contains">Contains</option>
                                                    <option value="isEmpty">Is Empty</option>
                                                    <option value="isNotEmpty">Is Not Empty</option>
                                                </select>
                                            </div>
                                            {editingField.conditionalLogic?.showIf?.operator !== 'isEmpty' &&
                                             editingField.conditionalLogic?.showIf?.operator !== 'isNotEmpty' && (
                                                <div>
                                                    <label className="block text-xs font-medium text-foreground mb-1">
                                                        Value
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editingField.conditionalLogic?.showIf?.value || ''}
                                                        onChange={(e) => setEditingField({
                                                            ...editingField,
                                                            conditionalLogic: {
                                                                ...editingField.conditionalLogic!,
                                                                showIf: {
                                                                    ...editingField.conditionalLogic!.showIf,
                                                                    value: e.target.value
                                                                }
                                                            }
                                                        })}
                                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                                                        placeholder="Enter value..."
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-border">
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
