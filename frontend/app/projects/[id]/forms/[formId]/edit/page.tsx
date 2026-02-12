"use client";

/**
 * Comprehensive HubSpot-Level Form Builder
 *
 * Features:
 * - 25+ Advanced Field Types
 * - Multi-Step Forms with Conditional Logic
 * - Progressive Profiling
 * - Lead Routing & Assignment Rules
 * - Automated Follow-up Actions
 * - GDPR Compliance
 * - A/B Testing
 * - Advanced Analytics
 * - Third-Party Integrations
 * - Custom Styling & Themes
 */

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    TrashIcon,
    ArrowPathIcon,
    ArrowLeftIcon,
    EyeIcon,
    CodeBracketIcon,
    CheckIcon,
    XMarkIcon,
    Cog6ToothIcon,
    Bars3Icon,
    DocumentDuplicateIcon,
    ChartBarIcon,
    BoltIcon,
    UserGroupIcon,
    PuzzlePieceIcon,
    PaintBrushIcon,
    ClipboardDocumentCheckIcon,
    SparklesIcon,
    BeakerIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    // Field type icons
    PencilIcon,
    EnvelopeIcon,
    PhoneIcon,
    HashtagIcon,
    LinkIcon,
    DocumentTextIcon,
    ChevronDownIcon,
    ListBulletIcon,
    CheckCircleIcon,
    StopIcon,
    GlobeAltIcon,
    MapPinIcon,
    CalendarIcon,
    ClockIcon,
    PaperClipIcon,
    StarIcon,
    PencilSquareIcon,
    CalculatorIcon,
    EyeSlashIcon,
    LockClosedIcon,
    EnvelopeOpenIcon,
    MinusIcon,
} from "@heroicons/react/24/outline";
import { getForm, updateForm, createForm, getFormAnalytics, type Form, type FormField, type FieldType, type FormStep, type LeadRoutingRule, type FollowUpAction, type FormAnalytics } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import GoogleSheetsFormIntegration from "@/components/forms/GoogleSheetsFormIntegration";
import CanvasFormBuilder from "@/components/forms/CanvasFormBuilder";
import { Squares2X2Icon } from "@heroicons/react/24/outline";
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

// Comprehensive Field Types (25+)
const FIELD_TYPES = [
    // Basic Input Fields
    { type: 'text', label: 'Single Line Text', Icon: PencilIcon, category: 'basic' },
    { type: 'email', label: 'Email', Icon: EnvelopeIcon, category: 'basic' },
    { type: 'phone', label: 'Phone Number', Icon: PhoneIcon, category: 'basic' },
    { type: 'number', label: 'Number', Icon: HashtagIcon, category: 'basic' },
    { type: 'url', label: 'Website URL', Icon: LinkIcon, category: 'basic' },
    { type: 'textarea', label: 'Multi-line Text', Icon: DocumentTextIcon, category: 'basic' },

    // Selection Fields
    { type: 'select', label: 'Dropdown', Icon: ChevronDownIcon, category: 'selection' },
    { type: 'multiselect', label: 'Multi-Select Dropdown', Icon: ListBulletIcon, category: 'selection' },
    { type: 'checkbox', label: 'Checkboxes', Icon: CheckCircleIcon, category: 'selection' },
    { type: 'radio', label: 'Radio Buttons', Icon: StopIcon, category: 'selection' },
    { type: 'country', label: 'Country Selector', Icon: GlobeAltIcon, category: 'selection' },
    { type: 'state', label: 'State/Province', Icon: MapPinIcon, category: 'selection' },

    // Date & Time
    { type: 'date', label: 'Date Picker', Icon: CalendarIcon, category: 'datetime' },
    { type: 'datetime', label: 'Date & Time', Icon: CalendarIcon, category: 'datetime' },
    { type: 'time', label: 'Time Picker', Icon: ClockIcon, category: 'datetime' },

    // Advanced Fields
    { type: 'file', label: 'File Upload', Icon: PaperClipIcon, category: 'advanced' },
    { type: 'richtext', label: 'Rich Text Editor', Icon: PencilSquareIcon, category: 'advanced' },
    { type: 'rating', label: 'Star Rating', Icon: StarIcon, category: 'advanced' },
    { type: 'signature', label: 'E-Signature', Icon: PencilIcon, category: 'advanced' },
    { type: 'calculation', label: 'Calculated Field', Icon: CalculatorIcon, category: 'advanced' },

    // Special Fields
    { type: 'hidden', label: 'Hidden Field', Icon: EyeSlashIcon, category: 'special' },
    { type: 'gdpr_consent', label: 'GDPR Consent', Icon: LockClosedIcon, category: 'special' },
    { type: 'marketing_consent', label: 'Marketing Opt-in', Icon: EnvelopeOpenIcon, category: 'special' },
    { type: 'divider', label: 'Section Divider', Icon: MinusIcon, category: 'special' },
    { type: 'html', label: 'Custom HTML', Icon: CodeBracketIcon, category: 'special' },
] as const;

// CRM Field Mapping Options
const CRM_FIELDS = [
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email Address' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'company', label: 'Company' },
    { value: 'jobTitle', label: 'Job Title' },
    { value: 'website', label: 'Website' },
    { value: 'address', label: 'Street Address' },
    { value: 'city', label: 'City' },
    { value: 'state', label: 'State/Province' },
    { value: 'country', label: 'Country' },
    { value: 'zip', label: 'ZIP/Postal Code' },
    { value: 'industry', label: 'Industry' },
    { value: 'revenue', label: 'Annual Revenue' },
    { value: 'employees', label: 'Number of Employees' },
    { value: 'custom', label: 'Custom Field' },
];

// Sortable Field Component
function SortableFieldItem({
    field,
    onEdit,
    onDelete,
    onDuplicate,
    currentStep,
}: {
    field: FormField;
    onEdit: () => void;
    onDelete: () => void;
    onDuplicate: () => void;
    currentStep?: string;
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

    const fieldTypeInfo = FIELD_TYPES.find(f => f.type === field.type);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "p-4 rounded-lg border bg-card hover:border-primary/50 transition-all group",
                field.width === 'half' && "w-[calc(50%-0.5rem)]",
                field.width === 'third' && "w-[calc(33.333%-0.5rem)]"
            )}
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
                    {fieldTypeInfo?.Icon && <fieldTypeInfo.Icon className="w-5 h-5 text-primary" />}
                    <div>
                        <label className="block text-sm font-medium text-foreground">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.helpText && (
                            <p className="text-xs text-muted-foreground mt-0.5">{field.helpText}</p>
                        )}
                    </div>
                    {field.conditionalLogic?.enabled && (
                        <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 text-xs rounded-full">
                            Conditional
                        </span>
                    )}
                    {field.progressive?.enabled && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-600 text-xs rounded-full">
                            Progressive
                        </span>
                    )}
                    {field.mapToField && field.mapToField !== 'custom' && (
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full">
                            CRM: {field.mapToField}
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
            <FieldPreview field={field} />
        </div>
    );
}

// Field Preview Component
function FieldPreview({ field }: { field: FormField }) {
    if (field.type === 'divider') {
        return <hr className="my-4 border-border" />;
    }

    if (field.type === 'html') {
        return (
            <div className="p-3 bg-muted/30 border border-dashed border-muted-foreground/30 rounded text-xs text-muted-foreground">
                Custom HTML Block
            </div>
        );
    }

    if (field.type === 'hidden') {
        return (
            <div className="p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
                Hidden field: {field.defaultValue || 'No default value'}
            </div>
        );
    }

    if (field.type === 'textarea' || field.type === 'richtext') {
        return (
            <textarea
                placeholder={field.placeholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                rows={field.type === 'richtext' ? 5 : 3}
                disabled
            />
        );
    }

    if (field.type === 'select' || field.type === 'multiselect' || field.type === 'country' || field.type === 'state') {
        return (
            <select
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
                multiple={field.type === 'multiselect'}
                disabled
            >
                <option>{field.placeholder || 'Select an option'}</option>
                {field.options?.map((opt, i) => (
                    <option key={i}>{opt}</option>
                ))}
                {(field.type === 'country' || field.type === 'state') && !field.options?.length && (
                    <>
                        <option>United States</option>
                        <option>Canada</option>
                        <option>United Kingdom</option>
                    </>
                )}
            </select>
        );
    }

    if (field.type === 'checkbox' || field.type === 'radio') {
        return (
            <div className="space-y-2">
                {(field.options || ['Option 1', 'Option 2']).map((opt, i) => (
                    <label key={i} className="flex items-center gap-2">
                        <input type={field.type} disabled className="rounded" />
                        <span className="text-sm text-foreground">{opt}</span>
                    </label>
                ))}
            </div>
        );
    }

    if (field.type === 'file') {
        return (
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground mt-1">
                    {field.fileSettings?.allowedTypes?.join(', ') || 'All file types'} •
                    Max {field.fileSettings?.maxSize || 10}MB
                </p>
            </div>
        );
    }

    if (field.type === 'rating') {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                    <span key={i} className="text-2xl text-gray-300">⭐</span>
                ))}
            </div>
        );
    }

    if (field.type === 'signature') {
        return (
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center bg-background">
                <p className="text-sm text-muted-foreground">✍️ Sign here</p>
            </div>
        );
    }

    if (field.type === 'gdpr_consent' || field.type === 'marketing_consent') {
        return (
            <label className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                <input type="checkbox" className="mt-1 rounded" disabled />
                <span className="text-sm text-foreground">
                    {field.gdprSettings?.consentText ||
                        (field.type === 'gdpr_consent'
                            ? 'I agree to the privacy policy and terms of service'
                            : 'I would like to receive marketing communications')}
                </span>
            </label>
        );
    }

    if (field.type === 'calculation') {
        return (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100 font-mono">
                    Formula: {field.calculation?.formula || 'field_1 + field_2'}
                </p>
            </div>
        );
    }

    // Default input fields
    return (
        <input
            type={field.type === 'datetime' ? 'datetime-local' : field.type}
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            disabled
        />
    );
}

export default function EnhancedFormBuilder() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const formId = params.formId as string;

    const [form, setForm] = useState<Form | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [activeTab, setActiveTab] = useState<'build' | 'canvas' | 'steps' | 'settings' | 'routing' | 'automations' | 'analytics' | 'integrations' | 'embed'>('build');
    const [editingField, setEditingField] = useState<FormField | null>(null);
    const [showFieldEditor, setShowFieldEditor] = useState(false);
    const [embedMode, setEmbedMode] = useState<'iframe' | 'direct'>('iframe');
    const [selectedFieldCategory, setSelectedFieldCategory] = useState<'all' | 'basic' | 'selection' | 'datetime' | 'advanced' | 'special'>('all');
    const [currentStep, setCurrentStep] = useState<string | null>(null);
    const [analytics, setAnalytics] = useState<FormAnalytics | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const frontendUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000");

    const loadAnalytics = useCallback(async () => {
        try {
            setIsLoadingAnalytics(true);
            const response = await getFormAnalytics(workspaceId, formId);
            if (response.success) {
                setAnalytics(response.data);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setIsLoadingAnalytics(false);
        }
    }, [workspaceId, formId]);

    const loadForm = useCallback(async () => {
        try {
            const response = await getForm(workspaceId, formId);
            if (response.success) {
                setForm(response.data);
                if (response.data.formType === 'multi_step' && response.data.steps?.length) {
                    setCurrentStep(response.data.steps[0].id);
                }
            }
        } catch (error) {
            console.error("Error loading form:", error);
            toast.error("Failed to load form");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, formId]);

    useEffect(() => {
        if (formId === 'new') {
            // Create new form with default values
            setForm({
                name: 'Untitled Form',
                description: '',
                status: 'draft',
                formType: 'single_step',
                fields: [],
                steps: [],
                progressiveProfilingEnabled: false,
                maxProgressiveFields: 5,
                settings: {
                    submitButtonText: 'Submit',
                    successMessage: 'Thank you for your submission!',
                    autoCreateContact: true,
                    theme: 'light',
                    primaryColor: '#3b82f6',
                    backgroundColor: '#ffffff',
                    layout: 'vertical',
                    labelPosition: 'top',
                    fieldSpacing: 'normal',
                    allowMultipleSubmissions: false,
                    requireCaptcha: false,
                    trackingEnabled: true,
                    cookieTracking: true,
                },
                followUpActions: [],
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
    }, [formId, loadForm]);

    // Load analytics when analytics tab is active
    useEffect(() => {
        if (activeTab === 'analytics' && formId !== 'new' && !analytics) {
            loadAnalytics();
        }
    }, [activeTab, formId, analytics, loadAnalytics]);

    // Set displayMode to 'canvas' when Canvas Designer tab is active
    // This ensures the form will render using canvas layout when published
    useEffect(() => {
        if (activeTab === 'canvas' && form && form.settings?.displayMode !== 'canvas') {
            // Also add default canvas data to any fields that don't have it
            const fieldsWithCanvas = form.fields.map(f => ({
                ...f,
                canvas: f.canvas || {
                    x: 50,
                    y: 50 + form.fields.indexOf(f) * 80,
                    width: 300,
                    height: 60,
                    zIndex: form.fields.indexOf(f) + 1,
                    visible: true
                }
            }));

            setForm({
                ...form,
                fields: fieldsWithCanvas,
                settings: {
                    ...form.settings,
                    displayMode: 'canvas'
                }
            });
        }
    }, [activeTab]);

    // Auto-save effect with debounce
    useEffect(() => {
        if (!form || formId === 'new' || isLoading) return;

        // Mark as having unsaved changes
        setHasUnsavedChanges(true);

        // Debounce auto-save by 2 seconds
        const autoSaveTimer = setTimeout(async () => {
            try {
                setIsSaving(true);
                const response = await updateForm(workspaceId, formId, form);
                if (response.success) {
                    setHasUnsavedChanges(false);
                    setLastSaved(new Date());
                    // Don't call setForm(response.data) here!
                    // This was causing a race condition where ongoing canvas edits
                    // would be overwritten by the server response, losing changes
                    // made while the save was in progress.
                }
            } catch (error) {
                console.error('Auto-save error:', error);
                toast.error('Failed to auto-save form');
            } finally {
                setIsSaving(false);
            }
        }, 2000);

        return () => clearTimeout(autoSaveTimer);
    }, [form, workspaceId, formId, isLoading]);





    const handleSave = async () => {
        if (!form) return;

        setIsSaving(true);
        try {
            if (formId === 'new') {
                const response = await createForm(workspaceId, form);
                if (response.success) {
                    toast.success("Form created successfully");
                    router.push(`/projects/${workspaceId}/forms/${response.data._id}/edit`);
                }
            } else {
                const response = await updateForm(workspaceId, formId, form);
                if (response.success) {
                    toast.success("Form saved successfully");
                    // Don't overwrite local form state with server response
                    // to preserve any ongoing edits (same fix as auto-save)
                    setHasUnsavedChanges(false);
                    setLastSaved(new Date());
                }
            }
        } catch (error) {
            console.error("Error saving form:", error);
            toast.error("Failed to save form");
        } finally {
            setIsSaving(false);
        }
    };

    const addField = (type: FieldType) => {
        if (!form) return;

        const fieldTypeInfo = FIELD_TYPES.find(f => f.type === type);
        const newField: FormField = {
            id: `field_${Date.now()}`,
            type,
            label: fieldTypeInfo?.label || `${type} Field`,
            required: false,
            width: 'full',
        };

        // Add default options for selection fields
        if (['select', 'multiselect', 'checkbox', 'radio'].includes(type)) {
            newField.options = ['Option 1', 'Option 2', 'Option 3'];
        }

        // Add default file settings
        if (type === 'file') {
            newField.fileSettings = {
                maxSize: 10,
                allowedTypes: ['pdf', 'doc', 'docx', 'jpg', 'png'],
                multiple: false,
            };
        }

        // Add default GDPR settings
        if (type === 'gdpr_consent') {
            newField.gdprSettings = {
                consentText: 'I agree to the privacy policy and consent to my data being processed',
                required: true,
            };
        }

        if (type === 'marketing_consent') {
            newField.gdprSettings = {
                consentText: 'I would like to receive marketing communications and updates',
                required: false,
            };
        }

        // If multi-step form, add to current step
        if (form.formType === 'multi_step' && currentStep && form.steps) {
            const updatedSteps = form.steps.map(step => {
                if (step.id === currentStep) {
                    return { ...step, fields: [...step.fields, newField.id] };
                }
                return step;
            });
            setForm({ ...form, fields: [...form.fields, newField], steps: updatedSteps });
        } else {
            setForm({ ...form, fields: [...form.fields, newField] });
        }
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

        // Remove from fields
        const updatedFields = form.fields.filter(f => f.id !== fieldId);

        // Remove from steps if multi-step
        let updatedSteps = form.steps;
        if (form.formType === 'multi_step' && form.steps) {
            updatedSteps = form.steps.map(step => ({
                ...step,
                fields: step.fields.filter(id => id !== fieldId)
            }));
        }

        setForm({ ...form, fields: updatedFields, steps: updatedSteps });
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

        // Validate before publishing
        if (form.status !== 'published') {
            if (form.fields.length === 0) {
                toast.error("Cannot publish: Form must have at least one field");
                return;
            }
            if (!form.name || form.name.trim() === '') {
                toast.error("Cannot publish: Form must have a name");
                return;
            }
        }

        const newStatus: 'draft' | 'published' | 'archived' = form.status === 'published' ? 'draft' : 'published';
        const updatedForm = { ...form, status: newStatus };

        setIsSaving(true);
        try {
            const response = await updateForm(workspaceId, formId, updatedForm);
            if (response.success) {
                // Only update the status locally, don't replace entire form
                setForm(prev => prev ? { ...prev, status: newStatus } : prev);
                toast.success(
                    newStatus === 'published'
                        ? "✅ Form published successfully!"
                        : "Form unpublished and saved as draft"
                );
            }
        } catch (error) {
            console.error("Error updating form status:", error);
            toast.error("Failed to update form status");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleFormType = () => {
        if (!form) return;

        if (form.formType === 'single_step') {
            // Convert to multi-step
            const step: FormStep = {
                id: `step_${Date.now()}`,
                name: 'Step 1',
                fields: form.fields.map(f => f.id),
            };
            setForm({ ...form, formType: 'multi_step', steps: [step] });
            setCurrentStep(step.id);
        } else {
            // Convert to single-step
            setForm({ ...form, formType: 'single_step', steps: [] });
            setCurrentStep(null);
        }
    };

    const addStep = () => {
        if (!form || form.formType !== 'multi_step') return;

        const newStep: FormStep = {
            id: `step_${Date.now()}`,
            name: `Step ${(form.steps?.length || 0) + 1}`,
            fields: [],
        };

        setForm({ ...form, steps: [...(form.steps || []), newStep] });
    };

    const getCurrentStepFields = () => {
        if (!form) return [];
        if (form.formType === 'single_step') return form.fields;
        if (!currentStep || !form.steps) return [];

        const step = form.steps.find(s => s.id === currentStep);
        if (!step) return [];

        return form.fields.filter(f => step.fields.includes(f.id));
    };

    const filteredFieldTypes = selectedFieldCategory === 'all'
        ? FIELD_TYPES
        : FIELD_TYPES.filter(f => f.category === selectedFieldCategory);

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

    const embedCode = form._id ? `<!-- MorrisB Form Embed -->
<script src="${frontendUrl}/forms/embed.js"></script>
<div data-morrisb-form="${form._id}"></div>` : '';

    const formTabs = [
        { id: 'build', label: 'Build', count: form.fields.length },
        { id: 'canvas', label: 'Canvas' },
        { id: 'steps', label: 'Steps', count: form.steps?.length },
        { id: 'settings', label: 'Settings' },
        { id: 'routing', label: 'Lead Routing' },
        { id: 'automations', label: 'Automations' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'integrations', label: 'Integrations' },
        { id: 'embed', label: 'Embed' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Top Navigation Bar — Sequences style */}
            <div className="sticky top-0 z-20 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between px-6 h-14">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/projects/${workspaceId}/forms`)}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <ArrowLeftIcon className="w-4 h-4" />
                        </button>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-sm text-zinc-500">Forms</span>
                        <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600" />
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 min-w-[120px]"
                            placeholder="Form name..."
                        />
                        <span className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium",
                            form.status === 'published'
                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}>
                            <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                form.status === 'published' ? "bg-emerald-500" : "bg-zinc-400"
                            )} />
                            {form.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                        {form.formType === 'multi_step' && (
                            <span className="px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 text-[11px] rounded-full font-medium">
                                Multi-Step
                            </span>
                        )}
                        {form.progressiveProfilingEnabled && (
                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] rounded-full font-medium flex items-center gap-1">
                                <SparklesIcon className="w-3 h-3" />
                                Progressive
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Auto-save indicator */}
                        {formId !== 'new' && (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                {isSaving ? (
                                    <>
                                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : hasUnsavedChanges ? (
                                    <>
                                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                        <span>Unsaved</span>
                                    </>
                                ) : lastSaved ? (
                                    <>
                                        <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Saved</span>
                                    </>
                                ) : null}
                            </div>
                        )}

                        {/* Publish Toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-sm text-zinc-500 font-medium">
                                {form.status === 'published' ? 'Published' : 'Publish'}
                            </span>
                            <button
                                onClick={togglePublish}
                                disabled={isSaving}
                                className={cn(
                                    "relative w-10 h-5 rounded-full transition-colors disabled:opacity-50",
                                    form.status === 'published' ? "bg-orange-500" : "bg-zinc-300 dark:bg-zinc-600"
                                )}
                            >
                                <span className={cn(
                                    "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                    form.status === 'published' ? "left-5.5 translate-x-0.5" : "left-0.5"
                                )} />
                            </button>
                        </label>

                        {/* Preview */}
                        <button
                            onClick={() => {
                                if (form._id) {
                                    window.open(`${frontendUrl}/forms/${form._id}`, '_blank');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-all shadow-sm"
                            disabled={!form._id}
                        >
                            <EyeIcon className="w-4 h-4" />
                            Preview
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-0 px-6 overflow-x-auto">
                    {formTabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-orange-500 text-orange-600 dark:text-orange-400"
                                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                                    activeTab === tab.id
                                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                                        : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex">
                {/* BUILD TAB */}
                {activeTab === 'build' && (
                    <>
                        {/* Sidebar - Field Types */}
                        <div className="w-80 border-r border-border bg-card p-4 overflow-y-auto">
                            <div className="mb-4">
                                <h3 className="font-semibold text-foreground mb-2">Add Fields</h3>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Drag or click to add fields to your form
                                </p>

                                {/* Category Filter */}
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {[
                                        { id: 'all', label: 'All' },
                                        { id: 'basic', label: 'Basic' },
                                        { id: 'selection', label: 'Selection' },
                                        { id: 'datetime', label: 'Date/Time' },
                                        { id: 'advanced', label: 'Advanced' },
                                        { id: 'special', label: 'Special' },
                                    ].map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setSelectedFieldCategory(cat.id as any)}
                                            className={cn(
                                                "px-2 py-1 text-xs rounded transition-colors",
                                                selectedFieldCategory === cat.id
                                                    ? "bg-primary text-primary-foreground"
                                                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                                            )}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {filteredFieldTypes.map(({ type, label, Icon }) => (
                                    <button
                                        key={type}
                                        onClick={() => addField(type as FieldType)}
                                        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted hover:bg-muted/70 transition-colors text-left group"
                                    >
                                        <Icon className="w-5 h-5 text-primary" />
                                        <span className="text-sm font-medium text-foreground flex-1">{label}</span>
                                        <PlusIcon className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </button>
                                ))}
                            </div>

                            {/* Progressive Profiling Toggle */}
                            <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                                <div className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        id="progressive"
                                        checked={form.progressiveProfilingEnabled}
                                        onChange={(e) => setForm({ ...form, progressiveProfilingEnabled: e.target.checked })}
                                        className="mt-1 rounded"
                                    />
                                    <div className="flex-1">
                                        <label htmlFor="progressive" className="text-sm font-medium text-foreground cursor-pointer flex items-center gap-1">
                                            <SparklesIcon className="w-4 h-4 text-blue-500" />
                                            Progressive Profiling
                                        </label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Smart forms that hide fields when data is already known
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Canvas */}
                        <div className="flex-1 p-8 overflow-y-auto bg-muted/10">
                            <div className="max-w-3xl mx-auto">
                                {/* Form Description */}
                                {form.description !== undefined && (
                                    <textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Add a form description (optional)"
                                        className="w-full px-4 py-3 mb-6 bg-card border border-border rounded-lg resize-none"
                                        rows={2}
                                    />
                                )}

                                {getCurrentStepFields().length === 0 ? (
                                    <div className="text-center py-16 border-2 border-dashed border-border rounded-lg bg-card">
                                        <PlusIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground font-medium">
                                            Click on a field type to add it to your form
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            or drag and drop fields to rearrange
                                        </p>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={getCurrentStepFields().map(f => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-4">
                                                {getCurrentStepFields().map((field) => (
                                                    <SortableFieldItem
                                                        key={field.id}
                                                        field={field}
                                                        currentStep={currentStep || undefined}
                                                        onEdit={() => {
                                                            setEditingField(field);
                                                            setShowFieldEditor(true);
                                                        }}
                                                        onDelete={() => deleteField(field.id)}
                                                        onDuplicate={() => duplicateField(field.id)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}

                                {/* Submit Button Preview */}
                                {getCurrentStepFields().length > 0 && (
                                    <div className="mt-8">
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
                                    </div>
                                )}

                                {/* Success Message Preview */}
                                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                    <p className="text-sm text-green-900 dark:text-green-100">
                                        {form.settings.successMessage}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* CANVAS DESIGNER TAB */}
                {activeTab === 'canvas' && (
                    <div className="flex-1 overflow-hidden h-[calc(100vh-140px)] flex flex-col">
                        {/* Canvas mode info banner */}
                        {form.settings?.displayMode !== 'canvas' && form.fields.length === 0 && (
                            <div className="bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
                                <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-100">
                                    <Squares2X2Icon className="w-5 h-5" />
                                    <span>
                                        <strong>Canvas Mode:</strong> Add elements and position them freely. Your form will automatically use canvas layout when rendered.
                                    </span>
                                </div>
                            </div>
                        )}
                        <CanvasFormBuilder
                            elements={form.fields.map(f => ({
                                ...f,
                                canvas: f.canvas || {
                                    x: 50,
                                    y: 50,
                                    width: 300,
                                    height: 80,
                                    zIndex: 1,
                                    visible: true
                                }
                            })) as any}
                            onChange={(elements) => {
                                // Map back to form fields, preserving canvas data
                                const updatedFields = elements.map(el => ({
                                    ...el,
                                    canvas: el.canvas // Ensure canvas data is preserved
                                } as FormField));

                                // Set displayMode to canvas so it renders correctly
                                setForm({
                                    ...form,
                                    fields: updatedFields,
                                    settings: {
                                        ...form.settings,
                                        displayMode: 'canvas'
                                    }
                                });
                            }}
                        />
                    </div>
                )}
                {activeTab === 'steps' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Multi-Step Forms</h2>
                                <p className="text-muted-foreground">
                                    Create wizard-style forms that break down complex forms into manageable steps
                                </p>
                            </div>

                            <div className="flex items-center gap-4 p-4 bg-card border border-border rounded-lg mb-6">
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="checkbox"
                                        id="multistep"
                                        checked={form.formType === 'multi_step'}
                                        onChange={toggleFormType}
                                        className="rounded"
                                    />
                                    <label htmlFor="multistep" className="text-sm font-medium text-foreground cursor-pointer">
                                        Enable Multi-Step Form
                                    </label>
                                </div>
                                {form.formType === 'multi_step' && (
                                    <button
                                        onClick={addStep}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Add Step
                                    </button>
                                )}
                            </div>

                            {form.formType === 'multi_step' && form.steps && (
                                <div className="space-y-4">
                                    {form.steps.map((step, index) => (
                                        <div key={step.id} className="p-6 bg-card border border-border rounded-lg">
                                            <div className="flex items-start gap-4">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={step.name}
                                                        onChange={(e) => {
                                                            const updatedSteps = form.steps!.map(s =>
                                                                s.id === step.id ? { ...s, name: e.target.value } : s
                                                            );
                                                            setForm({ ...form, steps: updatedSteps });
                                                        }}
                                                        className="text-lg font-semibold bg-transparent border-none focus:outline-none text-foreground mb-2"
                                                        placeholder="Step Name"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.description || ''}
                                                        onChange={(e) => {
                                                            const updatedSteps = form.steps!.map(s =>
                                                                s.id === step.id ? { ...s, description: e.target.value } : s
                                                            );
                                                            setForm({ ...form, steps: updatedSteps });
                                                        }}
                                                        className="w-full text-sm bg-transparent border-none focus:outline-none text-muted-foreground"
                                                        placeholder="Step description (optional)"
                                                    />
                                                    <div className="mt-3 text-sm text-muted-foreground">
                                                        {step.fields.length} field{step.fields.length !== 1 ? 's' : ''} in this step
                                                    </div>
                                                    <button
                                                        onClick={() => setCurrentStep(step.id)}
                                                        className="mt-2 text-sm text-primary hover:underline"
                                                    >
                                                        Edit fields in Build tab →
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (form.steps!.length > 1) {
                                                            const updatedSteps = form.steps!.filter(s => s.id !== step.id);
                                                            setForm({ ...form, steps: updatedSteps });
                                                            if (currentStep === step.id) {
                                                                setCurrentStep(updatedSteps[0]?.id || null);
                                                            }
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-500/10 rounded transition-colors"
                                                    disabled={form.steps!.length <= 1}
                                                >
                                                    <TrashIcon className="w-5 h-5 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {form.formType === 'single_step' && (
                                <div className="text-center py-12 text-muted-foreground">
                                    <ClipboardDocumentCheckIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="font-medium">Single-step form active</p>
                                    <p className="text-sm mt-2">Enable multi-step to break your form into multiple pages</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Form Settings</h2>
                                <p className="text-muted-foreground">Configure submission behavior, appearance, and compliance</p>
                            </div>

                            {/* Submission Settings */}
                            <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                                <h3 className="text-lg font-semibold text-foreground">Submission Settings</h3>

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
                                        Notification Emails
                                    </label>
                                    <input
                                        type="text"
                                        value={form.settings.notificationEmails?.join(', ') || ''}
                                        onChange={(e) => setForm({
                                            ...form,
                                            settings: {
                                                ...form.settings,
                                                notificationEmails: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                                            }
                                        })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        placeholder="sales@company.com, team@company.com"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Separate multiple emails with commas
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

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="requireCaptcha"
                                        checked={form.settings.requireCaptcha}
                                        onChange={(e) => setForm({
                                            ...form,
                                            settings: { ...form.settings, requireCaptcha: e.target.checked }
                                        })}
                                        className="rounded"
                                    />
                                    <label htmlFor="requireCaptcha" className="text-sm text-foreground">
                                        Require CAPTCHA verification
                                    </label>
                                </div>
                            </div>

                            {/* Display Mode */}
                            <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                                <h3 className="text-lg font-semibold text-foreground">Display Mode</h3>
                                <p className="text-sm text-muted-foreground">
                                    Choose how your form is displayed to users
                                </p>

                                <div className="grid grid-cols-3 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setForm({
                                            ...form,
                                            settings: { ...form.settings, displayMode: 'conversational' }
                                        })}
                                        className={cn(
                                            "p-4 rounded-lg border-2 text-left transition-all",
                                            (form.settings.displayMode || 'conversational') === 'conversational'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Conversational</div>
                                                <div className="text-xs text-muted-foreground">Typeform style</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            One question at a time with smooth animations.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setForm({
                                            ...form,
                                            settings: { ...form.settings, displayMode: 'classic' }
                                        })}
                                        className={cn(
                                            "p-4 rounded-lg border-2 text-left transition-all",
                                            form.settings.displayMode === 'classic'
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Classic</div>
                                                <div className="text-xs text-muted-foreground">Google Forms style</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            All fields visible on one page.
                                        </p>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            // Add default canvas data to fields if not present
                                            const fieldsWithCanvas = form.fields.map((f, idx) => ({
                                                ...f,
                                                canvas: f.canvas || {
                                                    x: 50,
                                                    y: 50 + idx * 80,
                                                    width: 300,
                                                    height: 60,
                                                    zIndex: idx + 1,
                                                    visible: true
                                                }
                                            }));
                                            setForm({
                                                ...form,
                                                fields: fieldsWithCanvas,
                                                settings: { ...form.settings, displayMode: 'canvas' }
                                            });
                                        }}
                                        className={cn(
                                            "p-4 rounded-lg border-2 text-left transition-all",
                                            form.settings.displayMode === 'canvas'
                                                ? "border-purple-500 bg-purple-500/5"
                                                : "border-border hover:border-muted-foreground/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                                                <Squares2X2Icon className="w-5 h-5 text-purple-500" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-foreground">Canvas (2D)</div>
                                                <div className="text-xs text-muted-foreground">Free positioning</div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Drag & drop elements anywhere on the canvas.
                                        </p>
                                        <span className="inline-block mt-2 px-2 py-0.5 bg-purple-500/10 text-purple-500 text-xs rounded-full">
                                            Dynamic Layout
                                        </span>
                                    </button>
                                </div>

                                {form.settings.displayMode === 'canvas' && (
                                    <div className="mt-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                                            <Squares2X2Icon className="w-4 h-4" />
                                            <span>
                                                <strong>Canvas Mode Active:</strong> Use the "Canvas Designer" tab to position your form elements.
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Appearance Settings */}
                            <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                                <h3 className="text-lg font-semibold text-foreground">Appearance</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Primary Color
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={form.settings.primaryColor}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: { ...form.settings, primaryColor: e.target.value }
                                                })}
                                                className="w-12 h-10 rounded border border-border"
                                            />
                                            <input
                                                type="text"
                                                value={form.settings.primaryColor}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: { ...form.settings, primaryColor: e.target.value }
                                                })}
                                                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-2">
                                            Background Color
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={form.settings.backgroundColor}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: { ...form.settings, backgroundColor: e.target.value }
                                                })}
                                                className="w-12 h-10 rounded border border-border"
                                            />
                                            <input
                                                type="text"
                                                value={form.settings.backgroundColor}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: { ...form.settings, backgroundColor: e.target.value }
                                                })}
                                                className="flex-1 px-3 py-2 bg-background border border-border rounded-lg"
                                            />
                                        </div>
                                    </div>
                                </div>


                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Layout
                                    </label>
                                    <select
                                        value={form.settings.layout || 'vertical'}
                                        onChange={(e) => setForm({
                                            ...form,
                                            settings: { ...form.settings, layout: e.target.value as any }
                                        })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        <option value="vertical">Vertical</option>
                                        <option value="horizontal">Horizontal</option>
                                        <option value="two_column">Two Column</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-2">
                                        Field Spacing
                                    </label>
                                    <select
                                        value={form.settings.fieldSpacing || 'normal'}
                                        onChange={(e) => setForm({
                                            ...form,
                                            settings: { ...form.settings, fieldSpacing: e.target.value as any }
                                        })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        <option value="compact">Compact</option>
                                        <option value="normal">Normal</option>
                                        <option value="comfortable">Comfortable</option>
                                    </select>
                                </div>
                            </div>

                            {/* GDPR Compliance */}
                            <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                                <div className="flex items-start gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="gdprEnabled"
                                        checked={form.settings.gdpr?.enabled || false}
                                        onChange={(e) => setForm({
                                            ...form,
                                            settings: {
                                                ...form.settings,
                                                gdpr: {
                                                    ...form.settings.gdpr,
                                                    enabled: e.target.checked,
                                                    consentRequired: e.target.checked,
                                                    allowDataExport: true,
                                                    allowDataDeletion: true,
                                                }
                                            }
                                        })}
                                        className="mt-1 rounded"
                                    />
                                    <div>
                                        <label htmlFor="gdprEnabled" className="text-lg font-semibold text-foreground cursor-pointer">
                                            GDPR Compliance
                                        </label>
                                        <p className="text-sm text-muted-foreground">
                                            Enable data privacy controls and consent management
                                        </p>
                                    </div>
                                </div>

                                {form.settings.gdpr?.enabled && (
                                    <div className="space-y-4 pl-7">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="consentRequired"
                                                checked={form.settings.gdpr.consentRequired}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: {
                                                        ...form.settings,
                                                        gdpr: { ...form.settings.gdpr!, consentRequired: e.target.checked }
                                                    }
                                                })}
                                                className="rounded"
                                            />
                                            <label htmlFor="consentRequired" className="text-sm text-foreground">
                                                Require explicit consent before submission
                                            </label>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-2">
                                                Data Retention (days)
                                            </label>
                                            <input
                                                type="number"
                                                value={form.settings.gdpr.dataRetentionDays || ''}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    settings: {
                                                        ...form.settings,
                                                        gdpr: { ...form.settings.gdpr!, dataRetentionDays: parseInt(e.target.value) || undefined }
                                                    }
                                                })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                placeholder="365"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Leave empty for indefinite retention
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* LEAD ROUTING TAB */}
                {activeTab === 'routing' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Lead Routing</h2>
                                <p className="text-muted-foreground">
                                    Automatically assign leads to the right team members based on form responses
                                </p>
                            </div>

                            <div className="p-6 bg-card border border-border rounded-lg space-y-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="leadRoutingEnabled"
                                        checked={form.leadRouting?.enabled || false}
                                        onChange={(e) => setForm({
                                            ...form,
                                            leadRouting: {
                                                ...form.leadRouting,
                                                enabled: e.target.checked,
                                                rules: form.leadRouting?.rules || [],
                                            }
                                        })}
                                        className="rounded"
                                    />
                                    <label htmlFor="leadRoutingEnabled" className="text-sm font-medium text-foreground">
                                        Enable Lead Routing
                                    </label>
                                </div>

                                {form.leadRouting?.enabled && (
                                    <div className="space-y-4 pt-4 border-t">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="roundRobin"
                                                checked={form.leadRouting.roundRobinEnabled || false}
                                                onChange={(e) => setForm({
                                                    ...form,
                                                    leadRouting: {
                                                        ...form.leadRouting!,
                                                        roundRobinEnabled: e.target.checked,
                                                    }
                                                })}
                                                className="rounded"
                                            />
                                            <label htmlFor="roundRobin" className="text-sm text-foreground">
                                                Enable Round-Robin Distribution
                                            </label>
                                        </div>

                                        <div className="text-center py-8 text-muted-foreground">
                                            <UserGroupIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">Lead Routing Rules</p>
                                            <p className="text-sm mt-1">
                                                Advanced routing rules builder coming soon
                                            </p>
                                            <p className="text-xs mt-2">
                                                Route leads based on form field values, geography, company size, and more
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!form.leadRouting?.enabled && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <UserGroupIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                        <p className="font-medium">Lead routing is disabled</p>
                                        <p className="text-sm mt-2">Enable it to automatically assign leads to your team</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* AUTOMATIONS TAB */}
                {activeTab === 'automations' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Follow-Up Automations</h2>
                                <p className="text-muted-foreground">
                                    Trigger automated actions when someone submits your form
                                </p>
                            </div>

                            <div className="grid gap-4">
                                {[
                                    { type: 'email', Icon: EnvelopeIcon, title: 'Send Email', desc: 'Send automated email to submitter or team', color: 'text-blue-500 bg-blue-500/10' },
                                    { type: 'task', Icon: ClipboardDocumentCheckIcon, title: 'Create Task', desc: 'Create a follow-up task for your team', color: 'text-green-500 bg-green-500/10' },
                                    { type: 'webhook', Icon: LinkIcon, title: 'Webhook', desc: 'Send data to external service via HTTP', color: 'text-purple-500 bg-purple-500/10' },
                                    { type: 'slack', Icon: HashtagIcon, title: 'Slack Notification', desc: 'Post message to Slack channel', color: 'text-orange-500 bg-orange-500/10' },
                                ].map(action => (
                                    <div key={action.type} className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
                                        <div className="flex items-start gap-4">
                                            <div className={cn("p-3 rounded-lg flex items-center justify-center", action.color)}>
                                                <action.Icon className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-foreground">{action.title}</h3>
                                                <p className="text-sm text-muted-foreground mt-1">{action.desc}</p>
                                            </div>
                                            <button className="px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                                                Configure
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                <p className="text-sm text-blue-900 dark:text-blue-100">
                                    <strong>Pro Tip:</strong> Chain multiple automations together for powerful workflows.
                                    For example: send a thank you email, create a task, and notify your team on Slack.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === 'analytics' && (
                    <div className="flex-1 p-8 overflow-y-auto bg-muted/10">
                        <div className="max-w-5xl mx-auto">
                            <div className="mb-6 flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground mb-2">Form Analytics</h2>
                                    <p className="text-muted-foreground">
                                        Track performance and optimize your form for better conversions
                                    </p>
                                </div>
                                <button
                                    onClick={loadAnalytics}
                                    disabled={isLoadingAnalytics}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <ArrowPathIcon className={cn("w-4 h-4", isLoadingAnalytics && "animate-spin")} />
                                    Refresh
                                </button>
                            </div>

                            {isLoadingAnalytics ? (
                                <div className="flex items-center justify-center h-64">
                                    <div className="text-center">
                                        <ArrowPathIcon className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
                                        <p className="text-muted-foreground">Loading analytics...</p>
                                    </div>
                                </div>
                            ) : analytics ? (
                                <>
                                    {/* Key Metrics */}
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        <div className="p-6 bg-card border border-border rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Views</p>
                                            <p className="text-3xl font-bold text-foreground">{analytics.totalViews.toLocaleString()}</p>
                                        </div>
                                        <div className="p-6 bg-card border border-border rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Submissions</p>
                                            <p className="text-3xl font-bold text-foreground">{analytics.totalSubmissions.toLocaleString()}</p>
                                        </div>
                                        <div className="p-6 bg-card border border-border rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Conversion Rate</p>
                                            <p className="text-3xl font-bold text-foreground">{analytics.conversionRate.toFixed(1)}%</p>
                                        </div>
                                        <div className="p-6 bg-card border border-border rounded-lg">
                                            <p className="text-sm text-muted-foreground mb-1">Abandonment Rate</p>
                                            <p className="text-3xl font-bold text-foreground">{analytics.abandonmentRate.toFixed(1)}%</p>
                                        </div>
                                    </div>

                                    {/* Submissions Chart */}
                                    <div className="p-6 bg-card border border-border rounded-lg mb-6">
                                        <h3 className="font-semibold text-foreground mb-4">Submissions Over Time (Last 30 Days)</h3>
                                        <div className="h-64 flex items-end gap-1 px-4">
                                            {analytics.submissionsByDay.map((day, index) => {
                                                const maxCount = Math.max(...analytics.submissionsByDay.map(d => d.count), 1);
                                                const height = (day.count / maxCount) * 100;
                                                return (
                                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                                        <div className="relative group flex-1 flex items-end w-full">
                                                            <div
                                                                className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                                                                style={{ height: `${height}%`, minHeight: day.count > 0 ? '4px' : '0' }}
                                                            >
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {day.count}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {index % 5 === 0 && (
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(day.date).getDate()}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Field Analytics */}
                                    <div className="p-6 bg-card border border-border rounded-lg">
                                        <h3 className="font-semibold text-foreground mb-4">Field Performance</h3>
                                        {analytics.fieldAnalytics.length > 0 ? (
                                            <div className="space-y-4">
                                                {analytics.fieldAnalytics.map(fieldStat => (
                                                    <div key={fieldStat.fieldId} className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm font-medium text-foreground">{fieldStat.fieldLabel}</span>
                                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                                <span>{fieldStat.totalResponses} responses</span>
                                                                <span className="font-semibold text-foreground">{fieldStat.completionRate.toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary transition-all"
                                                                style={{ width: `${fieldStat.completionRate}%` }}
                                                            />
                                                        </div>
                                                        {fieldStat.topValues && fieldStat.topValues.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {fieldStat.topValues.map((value, idx) => (
                                                                    <span key={idx} className="px-2 py-1 bg-muted text-xs rounded">
                                                                        {value.value}: {value.count}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                No field data available yet. Submissions will appear here once the form is filled out.
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 bg-card border border-border rounded-lg text-center">
                                    <ChartBarIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground mb-4">No analytics data available</p>
                                    <button
                                        onClick={loadAnalytics}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                    >
                                        Load Analytics
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* INTEGRATIONS TAB */}
                {activeTab === 'integrations' && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6">
                                <h2 className="text-2xl font-bold text-foreground mb-2">Integrations</h2>
                                <p className="text-muted-foreground">
                                    Connect your form with popular tools and platforms
                                </p>
                            </div>

                            {/* Google Sheets Integration */}
                            <GoogleSheetsFormIntegration
                                workspaceId={workspaceId}
                                formId={formId}
                                config={(form as any).googleSheetsIntegration}
                                onConfigChange={(config) => {
                                    setForm({
                                        ...form,
                                        googleSheetsIntegration: config,
                                    } as any);
                                }}
                            />

                            {/* Other Integrations (placeholders) */}
                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-foreground mb-4">More Integrations</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { name: 'Zapier', desc: 'Connect to 5000+ apps', icon: '⚡', connected: false },
                                        { name: 'Salesforce', desc: 'Sync leads to Salesforce', icon: '☁️', connected: false },
                                        { name: 'HubSpot', desc: 'Import into HubSpot CRM', icon: '🧡', connected: false },
                                        { name: 'Mailchimp', desc: 'Add to email lists', icon: '📬', connected: false },
                                        { name: 'Slack', desc: 'Post to Slack channels', icon: '💬', connected: false },
                                    ].map(integration => (
                                        <div key={integration.name} className="p-6 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors opacity-60">
                                            <div className="flex items-start gap-4 mb-4">
                                                <div className="text-3xl">{integration.icon}</div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-foreground">{integration.name}</h3>
                                                    <p className="text-sm text-muted-foreground mt-1">{integration.desc}</p>
                                                </div>
                                            </div>
                                            <button className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-lg cursor-not-allowed text-sm font-medium">
                                                Coming Soon
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* EMBED TAB */}
                {activeTab === 'embed' && form._id && (
                    <div className="flex-1 p-8 overflow-y-auto">
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div>
                                <h2 className="text-2xl font-bold text-foreground mb-2">Embed Your Form</h2>
                                <p className="text-muted-foreground">
                                    Add this form to your website, blog, or landing page
                                </p>
                            </div>

                            {/* Embed Options */}
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'iframe', name: 'Iframe Embed', desc: 'Safe for any website', recommended: true },
                                    { id: 'direct', name: 'Direct Embed', desc: 'Faster, same-domain only', recommended: false },
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => setEmbedMode(option.id as any)}
                                        className={cn(
                                            "p-4 rounded-lg border-2 transition-all text-left",
                                            embedMode === option.id
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:border-primary/50"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={cn(
                                                "w-4 h-4 rounded-full border-2",
                                                embedMode === option.id ? "border-primary bg-primary" : "border-muted-foreground"
                                            )} />
                                            <h4 className="font-semibold text-foreground">{option.name}</h4>
                                            {option.recommended && (
                                                <span className="ml-auto px-2 py-0.5 bg-green-500/10 text-green-600 text-xs rounded-full font-medium">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground pl-6">{option.desc}</p>
                                    </button>
                                ))}
                            </div>

                            {/* Embed Code */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-semibold text-foreground">Embed Code</h3>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(embedCode);
                                            toast.success('Embed code copied!');
                                        }}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                                    >
                                        <CodeBracketIcon className="w-4 h-4" />
                                        Copy Code
                                    </button>
                                </div>
                                <div className="p-4 bg-gray-900 rounded-lg">
                                    <pre className="text-green-400 text-sm overflow-x-auto">
                                        <code>{embedCode}</code>
                                    </pre>
                                </div>
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
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowFieldEditor(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-foreground">Edit Field</h3>
                                <button
                                    onClick={() => setShowFieldEditor(false)}
                                    className="p-1 hover:bg-muted rounded"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Basic Properties */}
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

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Help Text (Tooltip)
                                    </label>
                                    <input
                                        type="text"
                                        value={editingField.helpText || ''}
                                        onChange={(e) => setEditingField({ ...editingField, helpText: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        placeholder="Appears below the field label"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Field Width
                                        </label>
                                        <select
                                            value={editingField.width || 'full'}
                                            onChange={(e) => setEditingField({ ...editingField, width: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                        >
                                            <option value="full">Full Width</option>
                                            <option value="half">Half Width</option>
                                            <option value="third">One Third</option>
                                        </select>
                                    </div>

                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={editingField.required}
                                                onChange={(e) => setEditingField({ ...editingField, required: e.target.checked })}
                                                className="rounded"
                                            />
                                            <span className="text-sm text-foreground">Required field</span>
                                        </label>
                                    </div>
                                </div>

                                {/* CRM Mapping */}
                                <div className="pt-4 border-t">
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Map to CRM Field
                                    </label>
                                    <select
                                        value={editingField.mapToField || ''}
                                        onChange={(e) => setEditingField({ ...editingField, mapToField: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                    >
                                        <option value="">Don't map</option>
                                        {CRM_FIELDS.map(field => (
                                            <option key={field.value} value={field.value}>{field.label}</option>
                                        ))}
                                    </select>
                                    {editingField.mapToField === 'custom' && (
                                        <input
                                            type="text"
                                            value={editingField.customFieldName || ''}
                                            onChange={(e) => setEditingField({ ...editingField, customFieldName: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg mt-2"
                                            placeholder="Custom field name"
                                        />
                                    )}
                                </div>

                                {/* Options for select/radio/checkbox fields */}
                                {['select', 'multiselect', 'checkbox', 'radio'].includes(editingField.type) && (
                                    <div className="pt-4 border-t">
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

                                {/* Progressive Profiling */}
                                <div className="pt-4 border-t">
                                    <div className="flex items-center gap-2 mb-3">
                                        <input
                                            type="checkbox"
                                            id="progressive"
                                            checked={editingField.progressive?.enabled || false}
                                            onChange={(e) => setEditingField({
                                                ...editingField,
                                                progressive: {
                                                    enabled: e.target.checked,
                                                    hideIfKnown: e.target.checked,
                                                    priority: 0,
                                                }
                                            })}
                                            className="rounded"
                                        />
                                        <label htmlFor="progressive" className="text-sm font-medium text-foreground flex items-center gap-1">
                                            <SparklesIcon className="w-4 h-4 text-blue-500" />
                                            Progressive Profiling
                                        </label>
                                    </div>
                                    {editingField.progressive?.enabled && (
                                        <div className="pl-6">
                                            <label className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="checkbox"
                                                    checked={editingField.progressive.hideIfKnown}
                                                    onChange={(e) => setEditingField({
                                                        ...editingField,
                                                        progressive: { ...editingField.progressive!, hideIfKnown: e.target.checked }
                                                    })}
                                                    className="rounded"
                                                />
                                                <span className="text-sm text-foreground">Hide if already known</span>
                                            </label>
                                            <div>
                                                <label className="block text-xs font-medium text-foreground mb-1">
                                                    Priority (lower = higher priority)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={editingField.progressive.priority}
                                                    onChange={(e) => setEditingField({
                                                        ...editingField,
                                                        progressive: { ...editingField.progressive!, priority: parseInt(e.target.value) }
                                                    })}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                                                    min={0}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t">
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
                                        Save Changes
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
