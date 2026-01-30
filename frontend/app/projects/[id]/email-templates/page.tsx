"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    DocumentDuplicateIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    SparklesIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Mail, FileText, Copy, Trash2 } from "lucide-react";
import AITemplateGeneratorModal from "@/components/templates/AITemplateGeneratorModal";
import CreateTemplateModal from "@/components/templates/CreateTemplateModal";
import { cn } from "@/lib/utils";

// Types
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

// Category colors (subtle)
const CATEGORY_COLORS: Record<string, string> = {
    welcome: "text-emerald-500",
    "follow-up": "text-blue-500",
    nurture: "text-purple-500",
    promotion: "text-orange-500",
    announcement: "text-pink-500",
    custom: "text-zinc-500",
};

const CATEGORIES = [
    { value: "welcome", label: "Welcome" },
    { value: "follow-up", label: "Follow-up" },
    { value: "nurture", label: "Nurture" },
    { value: "promotion", label: "Promotion" },
    { value: "announcement", label: "Announcement" },
    { value: "custom", label: "Custom" },
];

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

// Template Card Component
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
    const colorClass = CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom;

    return (
        <motion.div
            variants={itemVariants}
            className="group rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-md transition-all"
        >
            <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Mail className={cn("w-5 h-5", colorClass)} />
                        <div>
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                {template.name}
                            </h3>
                            <p className="text-xs text-zinc-500 capitalize">{template.category}</p>
                        </div>
                    </div>
                    {template.isDefault && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                            Default
                        </span>
                    )}
                </div>

                {/* Subject */}
                <div className="mb-3 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                    <p className="text-xs text-zinc-400 mb-0.5">Subject</p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-1">{template.subject}</p>
                </div>

                {/* Description */}
                {(template.description || template.body) && (
                    <p className="text-sm text-zinc-500 mb-3 line-clamp-2">
                        {template.description || template.body.replace(/<[^>]*>/g, '').substring(0, 80)}...
                    </p>
                )}

                {/* Stats */}
                <div className="text-xs text-zinc-400 mb-3">
                    <span className="font-medium text-zinc-600 dark:text-zinc-300">{template.usageCount}</span> uses
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    >
                        <PencilIcon className="w-3.5 h-3.5" />
                        {template.isDefault ? "View" : "Edit"}
                    </button>
                    <button
                        onClick={onDuplicate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                    </button>
                    <button
                        onClick={onDelete}
                        disabled={template.isDefault}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors ml-auto disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// Template Modal
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
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {template ? "Edit Template" : "Create Template"}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                            <XMarkIcon className="w-5 h-5 text-zinc-500" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Template Name *
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Welcome Email"
                                required
                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            >
                                {CATEGORIES.map((cat) => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Description
                            </label>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="When to use this template"
                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Subject *
                            </label>
                            <input
                                type="text"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="e.g., Welcome {{firstName}}!"
                                required
                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-xs text-zinc-400 mt-1">Use {"{{firstName}}"}, {"{{company}}"}, etc.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                                Body *
                            </label>
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Hi {{firstName}},&#10;&#10;..."
                                required
                                rows={6}
                                className="w-full px-3 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                            />
                            <div className="mt-2 flex flex-wrap gap-1">
                                {["{{firstName}}", "{{lastName}}", "{{email}}", "{{company}}"].map((v) => (
                                    <code
                                        key={v}
                                        className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded cursor-pointer hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                                        onClick={() => setBody(body + v)}
                                    >
                                        {v}
                                    </code>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSaving || !name || !subject || !body}
                                className="px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                {isSaving ? "Saving..." : template ? "Update" : "Create"}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

export default function EmailTemplatesPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    useEffect(() => {
        if (workspaceId) fetchTemplates();
    }, [workspaceId]);

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await res.json();
            if (data.success) {
                // Ensure templates is always an array
                const templatesData = Array.isArray(data.data) ? data.data : [];
                setTemplates(templatesData);
            }
        } catch (error) {
            console.error("Failed to fetch templates:", error);
            setTemplates([]); // Reset to empty array on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => setIsCreateModalOpen(true);

    const handleEdit = (template: EmailTemplate) => {
        router.push(`/projects/${workspaceId}/email-templates/${template._id}/builder`);
    };

    const handleSave = async (data: any) => {
        try {
            const token = localStorage.getItem("token");
            const url = editingTemplate
                ? `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${editingTemplate._id}`
                : `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates`;

            await fetch(url, {
                method: editingTemplate ? "PUT" : "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            fetchTemplates();
        } catch (error) {
            console.error("Failed to duplicate:", error);
        }
    };

    const handleDelete = async (template: EmailTemplate) => {
        if (!confirm("Delete this template?")) return;
        try {
            const token = localStorage.getItem("token");
            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/email-templates/${template._id}`,
                { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
            );
            fetchTemplates();
        } catch (error) {
            console.error("Failed to delete:", error);
        }
    };

    const filteredTemplates = (templates || []).filter((t) => {
        const matchesSearch = searchQuery === "" ||
            t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.subject?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Modals */}
            <TemplateModal
                isOpen={isModalOpen}
                template={editingTemplate}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
            />
            <CreateTemplateModal
                isOpen={isCreateModalOpen}
                workspaceId={workspaceId}
                onClose={() => setIsCreateModalOpen(false)}
            />
            <AITemplateGeneratorModal
                isOpen={isAIModalOpen}
                workspaceId={workspaceId}
                onClose={() => setIsAIModalOpen(false)}
                onSave={(data) => { handleSave(data); setIsAIModalOpen(false); }}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0"
            >
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-violet-500" />
                        Email Templates
                    </h1>
                    <p className="text-sm text-zinc-500 mt-0.5">Reusable templates for your workflows</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchTemplates}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                    >
                        <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => setIsAIModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-full transition-all"
                    >
                        <SparklesIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Generate with AI</span>
                    </button>
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">New Template</span>
                    </button>
                </div>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Category Filter Pills */}
                    <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
                        <button
                            onClick={() => setCategoryFilter("all")}
                            className={cn(
                                "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                categoryFilter === "all"
                                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            All
                        </button>
                        {CATEGORIES.slice(0, 4).map((cat) => (
                            <button
                                key={cat.value}
                                onClick={() => setCategoryFilter(cat.value)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all hidden sm:block",
                                    categoryFilter === cat.value
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Templates Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm text-zinc-500">Loading templates...</p>
                        </div>
                    </div>
                ) : filteredTemplates.length === 0 ? (
                    templates.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <Mail className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No templates yet</h3>
                            <p className="text-sm text-zinc-500 max-w-md mb-6">
                                Create reusable email templates for your workflow automations.
                            </p>
                            <button
                                onClick={handleCreate}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-all"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Your First Template
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-zinc-500">No templates match your search.</p>
                        </div>
                    )
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                        {filteredTemplates.map((template) => (
                            <TemplateCard
                                key={template._id}
                                template={template}
                                onEdit={() => handleEdit(template)}
                                onDuplicate={() => handleDuplicate(template)}
                                onDelete={() => handleDelete(template)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
