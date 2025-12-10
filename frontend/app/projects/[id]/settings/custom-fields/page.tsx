"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowPathIcon,
    PlusIcon,
    PencilIcon,
    TrashIcon,
    Cog6ToothIcon,
    UserIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    CheckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
    getCustomFields,
    createCustomField,
    updateCustomField,
    deleteCustomField,
} from "@/lib/api/customField";

interface CustomField {
    _id: string;
    name: string;
    label: string;
    type: "text" | "number" | "date" | "select" | "boolean" | "email" | "phone";
    entityType: "contact" | "company" | "deal";
    options?: string[];
    required: boolean;
    isActive: boolean;
}

const ENTITY_ICONS = {
    contact: UserIcon,
    company: BuildingOfficeIcon,
    deal: CurrencyDollarIcon,
};

const FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "boolean", label: "Yes/No" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
];

export default function CustomFieldsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [fields, setFields] = useState<CustomField[]>([]);
    const [activeEntity, setActiveEntity] = useState<"contact" | "company" | "deal">("contact");
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        label: "",
        type: "text" as CustomField["type"],
        options: "",
        required: false,
    });

    const fetchFields = useCallback(async () => {
        try {
            const response = await getCustomFields(workspaceId, activeEntity);
            if (response.success && response.fields) {
                setFields(response.fields as CustomField[]);
            }
        } catch (err) {
            console.error("Failed to fetch custom fields:", err);
            toast.error("Failed to load custom fields");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, activeEntity]);

    useEffect(() => {
        fetchFields();
    }, [fetchFields]);

    const handleCreate = async () => {
        if (!formData.name || !formData.label) {
            toast.error("Name and label are required");
            return;
        }

        try {
            const response = await createCustomField(workspaceId, {
                name: formData.name.toLowerCase().replace(/\s+/g, "_"),
                label: formData.label,
                type: formData.type,
                entityType: activeEntity,
                options: formData.type === "select" ? formData.options.split(",").map(s => s.trim()) : undefined,
                required: formData.required,
            });

            if (response.success) {
                toast.success("Custom field created!");
                setIsCreating(false);
                setFormData({ name: "", label: "", type: "text", options: "", required: false });
                fetchFields();
            } else {
                toast.error(response.error || "Failed to create field");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create field");
        }
    };

    const handleDelete = async (fieldId: string) => {
        if (!confirm("Are you sure you want to delete this custom field?")) return;

        try {
            const response = await deleteCustomField(workspaceId, fieldId);
            if (response.success) {
                toast.success("Field deleted");
                fetchFields();
            } else {
                toast.error(response.error || "Failed to delete field");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to delete field");
        }
    };

    const getFieldTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            text: "bg-blue-500/20 text-blue-400",
            number: "bg-purple-500/20 text-purple-400",
            date: "bg-green-500/20 text-green-400",
            select: "bg-yellow-500/20 text-yellow-400",
            boolean: "bg-pink-500/20 text-pink-400",
            email: "bg-cyan-500/20 text-cyan-400",
            phone: "bg-orange-500/20 text-orange-400",
        };
        return colors[type] || "bg-gray-500/20 text-gray-400";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <ArrowPathIcon className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Cog6ToothIcon className="w-7 h-7 text-primary" />
                        Custom Fields
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Define custom fields for contacts, companies, and deals
                    </p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusIcon className="w-5 h-5" />
                    Add Field
                </button>
            </div>

            {/* Entity Tabs */}
            <div className="flex items-center gap-4 border-b border-border">
                {(["contact", "company", "deal"] as const).map((entity) => {
                    const Icon = ENTITY_ICONS[entity];
                    return (
                        <button
                            key={entity}
                            onClick={() => setActiveEntity(entity)}
                            className={`pb-3 px-1 text-sm font-medium transition-colors flex items-center gap-2 ${activeEntity === entity
                                    ? "text-primary border-b-2 border-primary"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {entity.charAt(0).toUpperCase() + entity.slice(1)}s
                        </button>
                    );
                })}
            </div>

            {/* Create Form */}
            {isCreating && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4">New Custom Field</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Label</label>
                            <input
                                type="text"
                                value={formData.label}
                                onChange={(e) => setFormData({ ...formData, label: e.target.value, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                                placeholder="e.g., Department"
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Field Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as CustomField["type"] })}
                                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {FIELD_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>
                        {formData.type === "select" && (
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Options (comma-separated)</label>
                                <input
                                    type="text"
                                    value={formData.options}
                                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                                    placeholder="e.g., Sales, Marketing, Engineering"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        )}
                        <div className="flex items-end gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.required}
                                    onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                                    className="w-4 h-4 rounded border-border"
                                />
                                <span className="text-sm text-foreground">Required</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <CheckIcon className="w-4 h-4" />
                            Create Field
                        </button>
                        <button
                            onClick={() => setIsCreating(false)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                            Cancel
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Fields Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Label</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Field Name</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Type</th>
                            <th className="text-left text-sm font-medium text-muted-foreground py-3 px-4">Required</th>
                            <th className="text-right text-sm font-medium text-muted-foreground py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {fields.map((field) => (
                            <motion.tr
                                key={field._id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="hover:bg-muted/30 transition-colors"
                            >
                                <td className="py-3 px-4 font-medium text-foreground">{field.label}</td>
                                <td className="py-3 px-4 text-muted-foreground font-mono text-sm">{field.name}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${getFieldTypeBadge(field.type)}`}>
                                        {field.type}
                                    </span>
                                    {field.options && field.options.length > 0 && (
                                        <span className="text-xs text-muted-foreground ml-2">
                                            ({field.options.length} options)
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 px-4">
                                    {field.required ? (
                                        <span className="text-green-400 text-sm">Yes</span>
                                    ) : (
                                        <span className="text-muted-foreground text-sm">No</span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button
                                        onClick={() => handleDelete(field._id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </td>
                            </motion.tr>
                        ))}
                        {fields.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                    No custom fields for {activeEntity}s yet. Click Add Field to create one.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
