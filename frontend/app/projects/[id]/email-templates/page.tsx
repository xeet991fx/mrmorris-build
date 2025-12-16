"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    EnvelopeIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    SparklesIcon,
} from "@heroicons/react/24/outline";
import AITemplateGeneratorModal from "@/components/templates/AITemplateGeneratorModal";

// ============================================
// TYPES
// ============================================

interface EmailTemplate {
    _id: string;
    name: string;
    subject: string;
    body: string;
    category: string;
    description?: string;
    thumbnailColor?: string;
    usageCount: number;
    isDefault: boolean;
    createdAt: string;
}

// ============================================
// CATEGORY COLORS
// ============================================

const CATEGORY_COLORS: Record<string, string> = {
    welcome: "from-green-500 to-emerald-600",
    "follow-up": "from-blue-500 to-indigo-600",
    nurture: "from-purple-500 to-violet-600",
    promotion: "from-orange-500 to-red-600",
    announcement: "from-pink-500 to-rose-600",
    custom: "from-gray-500 to-slate-600",
};

const CATEGORIES = [
    { value: "welcome", label: "Welcome" },
    { value: "follow-up", label: "Follow-up" },
    { value: "nurture", label: "Nurture" },
    { value: "promotion", label: "Promotion" },
    { value: "announcement", label: "Announcement" },
    { value: "custom", label: "Custom" },
];

// ============================================
// TEMPLATE CARD
// ============================================

function TemplateCard({
    template,
    onEdit,
    onDuplicate,
    onDelete,
}: {
    template: EmailTemplate;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
}) {
    const gradientClass = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-card border border-border rounded-xl overflow-hidden hover:border-[#9ACD32]/50 hover:shadow-lg transition-all"
        >
            {/* Color Header */}
            <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />

            <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
                            <EnvelopeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {template.name}
                            </h3>
                            <p className="text-xs text-muted-foreground capitalize">
                                {template.category}
                            </p>
                        </div>
                    </div>
                    {template.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                            Default
                        </span>
                    )}
                </div>

                {/* Subject Preview */}
                <div className="mb-3 p-2 bg-muted/30 rounded-md">
                    <p className="text-xs text-muted-foreground mb-0.5">Subject:</p>
                    <p className="text-sm text-foreground line-clamp-1">{template.subject}</p>
                </div>

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {template.description}
                    </p>
                )}

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="font-medium text-foreground">{template.usageCount}</span>
                        <span>uses</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <button
                        onClick={onEdit}
                        disabled={template.isDefault}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PencilIcon className="w-4 h-4" />
                        Edit
                    </button>
                    <button
                        onClick={onDuplicate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                        Duplicate
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={template.isDefault}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// CREATE/EDIT MODAL
// ============================================

function TemplateModal({
    isOpen,
    template,
    onClose,
    onSave,
}: {
    isOpen: boolean;
    template: EmailTemplate | null;
    onClose: () => void;
    onSave: (data: any) => void;
}) {
    const [name, setName] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [category, setCategory] = useState("custom");
    const [description, setDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (template) {
            setName(template.name);
            setSubject(template.subject);
            setBody(template.body);
            setCategory(template.category);
            setDescription(template.description || "");
        } else {
            setName("");
            setSubject("");
            setBody("");
            setCategory("custom");
            setDescription("");
        }
    }, [template, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        await onSave({ name, subject, body, category, description });
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-2xl max-h-[90vh] overflow-auto bg-card border border-border rounded-xl shadow-2xl mx-4"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">
                        {template ? "Edit Template" : "Create Template"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Template Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Welcome Email"
                            required
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Category
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            {CATEGORIES.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Description
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of when to use this template"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                    </div>

                    {/* Subject */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Email Subject *
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="e.g., Welcome {{firstName}}!"
                            required
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Use {"{{firstName}}"}, {"{{company}}"}, etc. for personalization
                        </p>
                    </div>

                    {/* Body */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                            Email Body *
                        </label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Hi {{firstName}},&#10;&#10;..."
                            required
                            rows={8}
                            className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        />
                        <div className="mt-2 flex flex-wrap gap-1">
                            {["{{firstName}}", "{{lastName}}", "{{email}}", "{{company}}", "{{phone}}"].map((v) => (
                                <code
                                    key={v}
                                    className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded cursor-pointer hover:bg-primary/20"
                                    onClick={() => setBody(body + v)}
                                >
                                    {v}
                                </code>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving || !name || !subject || !body}
                            className="px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50"
                        >
                            {isSaving ? "Saving..." : template ? "Update Template" : "Create Template"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <EnvelopeIcon className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No email templates yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Create reusable email templates for your workflow automations. Save time by using
                templates instead of writing emails from scratch.
            </p>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
            >
                <PlusIcon className="w-5 h-5" />
                Create Your First Template
            </button>
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function EmailTemplatesPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);

    // Fetch templates
    useEffect(() => {
        if (workspaceId) {
            fetchTemplates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await res.json();
            if (data.success) {
                setTemplates(data.data || []);
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingTemplate(null);
        setIsModalOpen(true);
    };

    const handleEdit = (template: EmailTemplate) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const handleSave = async (data: any) => {
        try {
            const token = localStorage.getItem("token");
            const url = editingTemplate
                ? `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${editingTemplate._id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`;

            await fetch(url, {
                method: editingTemplate ? "PUT" : "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });

            setIsModalOpen(false);
            fetchTemplates();
        } catch (error) {
            console.error("Failed to save template:", error);
        }
    };

    const handleDuplicate = async (template: EmailTemplate) => {
        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${template._id}/duplicate`,
                {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            fetchTemplates();
        } catch (error) {
            console.error("Failed to duplicate template:", error);
        }
    };

    const handleDelete = async (template: EmailTemplate) => {
        if (!confirm("Are you sure you want to delete this template?")) return;

        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${template._id}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            fetchTemplates();
        } catch (error) {
            console.error("Failed to delete template:", error);
        }
    };

    // Filter templates
    const filteredTemplates = templates.filter((t) => {
        const matchesSearch =
            searchQuery === "" ||
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="min-h-screen bg-card/95">
            {/* Modal */}
            <TemplateModal
                isOpen={isModalOpen}
                template={editingTemplate}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />

            {/* AI Generator Modal */}
            <AITemplateGeneratorModal
                isOpen={isAIModalOpen}
                workspaceId={workspaceId}
                onClose={() => setIsAIModalOpen(false)}
                onSave={(data) => {
                    handleSave(data);
                    setIsAIModalOpen(false);
                }}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground">Email Templates</h1>
                    <p className="text-xs text-muted-foreground">
                        Reusable templates for your workflows
                    </p>
                </motion.div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/20"
                    >
                        <SparklesIcon className="w-5 h-5" />
                        Generate with AI
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
                    >
                        <PlusIcon className="w-5 h-5" />
                        New Template
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                        />
                    </div>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                    >
                        <option value="all">All Categories</option>
                        {CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                                {cat.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-64 rounded-xl bg-card border border-border animate-pulse"
                            />
                        ))}
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    templates.length === 0 ? (
                        <EmptyState onCreateNew={handleCreate} />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No templates match your search.</p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTemplates.map((template) => (
                            <TemplateCard
                                key={template._id}
                                template={template}
                                onEdit={() => handleEdit(template)}
                                onDuplicate={() => handleDuplicate(template)}
                                onDelete={() => handleDelete(template)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
