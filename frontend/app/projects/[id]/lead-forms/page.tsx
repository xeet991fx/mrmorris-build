"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    PlusIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    PlayIcon,
    PauseIcon,
    ClipboardDocumentIcon,
    ChartBarIcon,
    BoltIcon,
} from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface LeadForm {
    _id: string;
    name: string;
    description?: string;
    type: "popup" | "inline" | "slide_in" | "banner";
    active: boolean;
    views: number;
    submissions: number;
    conversionRate: string;
    createdAt: string;
    headline?: string;
    trigger: {
        type: string;
        value?: number;
    };
}

export default function LeadFormsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [forms, setForms] = useState<LeadForm[]>([]);

    const fetchForms = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data } = await axios.get(`/workspaces/${workspaceId}/lead-forms`);
            if (data.success) {
                setForms(data.data);
            }
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to load forms");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchForms();
    }, [fetchForms]);

    const handleCreateForm = async () => {
        try {
            const { data } = await axios.post(`/workspaces/${workspaceId}/lead-forms`, {
                name: "New Lead Form",
                type: "popup",
                fields: [
                    { name: "email", label: "Email", type: "email", placeholder: "your@email.com", required: true },
                ],
            });
            if (data.success) {
                router.push(`/projects/${workspaceId}/lead-forms/${data.data._id}`);
            }
        } catch (error) {
            console.error("Error creating form:", error);
            toast.error("Failed to create form");
        }
    };

    const handleToggleActive = async (formId: string) => {
        try {
            const { data } = await axios.patch(`/workspaces/${workspaceId}/lead-forms/${formId}/toggle`);
            if (data.success) {
                setForms(forms.map(f => f._id === formId ? { ...f, active: data.data.active } : f));
                toast.success(data.message);
            }
        } catch (error) {
            console.error("Error toggling form:", error);
            toast.error("Failed to update form");
        }
    };

    const handleDelete = async (formId: string) => {
        if (!confirm("Are you sure you want to delete this form?")) return;
        try {
            const { data } = await axios.delete(`/workspaces/${workspaceId}/lead-forms/${formId}`);
            if (data.success) {
                setForms(forms.filter(f => f._id !== formId));
                toast.success("Form deleted");
            }
        } catch (error) {
            console.error("Error deleting form:", error);
            toast.error("Failed to delete form");
        }
    };

    const copyEmbedCode = (form: LeadForm) => {
        const code = `<!-- Clianta Lead Form: ${form.name} -->
<script src="${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.clianta.online'}/track.js"></script>
<script>
  clianta('${workspaceId}');
</script>`;
        navigator.clipboard.writeText(code);
        toast.success("Embed code copied!");
    };

    const typeLabels: Record<string, string> = {
        popup: "Popup",
        inline: "Inline",
        slide_in: "Slide-in",
        banner: "Banner",
    };

    const triggerLabels: Record<string, string> = {
        delay: "Time delay",
        scroll: "Scroll %",
        exit_intent: "Exit intent",
        click: "On click",
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading forms...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <BoltIcon className="w-8 h-8 text-violet-500" />
                            Lead Forms
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Create popups and forms that auto-load via your tracking SDK
                        </p>
                    </div>
                    <button
                        onClick={handleCreateForm}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        New Form
                    </button>
                </div>
            </div>

            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Forms Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-6">
                {forms.length === 0 ? (
                    <div className="text-center py-12">
                        <DocumentTextIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No forms yet</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                            Create your first lead capture form to start collecting leads
                        </p>
                        <button
                            onClick={handleCreateForm}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Form
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {forms.map((form, index) => (
                            <motion.div
                                key={form._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    form.active
                                        ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10"
                                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                                )}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{form.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full",
                                                form.active
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                                                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                            )}>
                                                {form.active ? "Active" : "Draft"}
                                            </span>
                                            <span className="text-xs text-zinc-500">{typeLabels[form.type]}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(form._id)}
                                        className={cn(
                                            "p-2 rounded-lg transition-colors",
                                            form.active
                                                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                                : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                                        )}
                                        title={form.active ? "Deactivate" : "Activate"}
                                    >
                                        {form.active ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2 py-3 border-y border-zinc-100 dark:border-zinc-800">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{form.views}</p>
                                        <p className="text-xs text-zinc-500">Views</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{form.submissions}</p>
                                        <p className="text-xs text-zinc-500">Submissions</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-emerald-600">{form.conversionRate}%</p>
                                        <p className="text-xs text-zinc-500">Conversion</p>
                                    </div>
                                </div>

                                {/* Trigger info */}
                                <div className="py-2 text-xs text-zinc-500">
                                    Trigger: {triggerLabels[form.trigger?.type] || "Delay"}
                                    {form.trigger?.value && ` (${form.trigger.value}${form.trigger.type === "scroll" ? "%" : "s"})`}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-1">
                                        <Link href={`/projects/${workspaceId}/lead-forms/${form._id}`}>
                                            <button className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Edit">
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => copyEmbedCode(form)}
                                            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                            title="Copy embed code"
                                        >
                                            <ClipboardDocumentIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(form._id)}
                                            className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
