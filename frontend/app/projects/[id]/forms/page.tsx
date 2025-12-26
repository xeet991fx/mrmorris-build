"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    ChartBarIcon,
    CodeBracketIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { getForms, deleteForm, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function FormsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [forms, setForms] = useState<Form[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

    const loadForms = async () => {
        setIsLoading(true);
        try {
            const response = await getForms(
                workspaceId,
                selectedStatus === 'all' ? undefined : selectedStatus
            );
            if (response.success) {
                setForms(response.data);
            }
        } catch (error) {
            console.error("Error loading forms:", error);
            toast.error("Failed to load forms");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadForms();
    }, [workspaceId, selectedStatus]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
            return;
        }

        try {
            await deleteForm(workspaceId, id);
            toast.success("Form deleted successfully");
            loadForms();
        } catch (error) {
            console.error("Error deleting form:", error);
            toast.error("Failed to delete form");
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'draft': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            case 'archived': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
            default: return 'bg-muted text-muted-foreground';
        }
    };

    const filteredForms = selectedStatus === 'all' ? forms : forms.filter(f => f.status === selectedStatus);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Forms</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create forms to capture leads from your website
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadForms}
                        disabled={isLoading}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                    >
                        <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    <Link
                        href={`/projects/${workspaceId}/forms/new`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create Form
                    </Link>
                </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
                {(['all', 'published', 'draft', 'archived'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium transition-colors capitalize",
                            selectedStatus === status
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                        )}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Forms Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredForms.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <DocumentTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                        {selectedStatus === 'all' ? 'No forms yet' : `No ${selectedStatus} forms`}
                    </p>
                    <Link
                        href={`/projects/${workspaceId}/forms/new`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create Your First Form
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredForms.map((form) => (
                        <motion.div
                            key={form._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                                        {form.name}
                                    </h3>
                                    {form.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {form.description}
                                        </p>
                                    )}
                                </div>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                                    getStatusColor(form.status)
                                )}>
                                    {form.status}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Views</p>
                                    <p className="text-lg font-bold text-foreground">{form.stats.views}</p>
                                </div>
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Submits</p>
                                    <p className="text-lg font-bold text-foreground">{form.stats.submissions}</p>
                                </div>
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Rate</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {form.stats.conversionRate.toFixed(0)}%
                                    </p>
                                </div>
                            </div>

                            {/* Fields Count */}
                            <div className="text-xs text-muted-foreground mb-4">
                                {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href={`/projects/${workspaceId}/forms/${form._id}/edit`}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </Link>
                                <Link
                                    href={`/projects/${workspaceId}/forms/${form._id}/submissions`}
                                    className="flex items-center justify-center px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                                    title="View Submissions"
                                >
                                    <ChartBarIcon className="w-4 h-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(form._id)}
                                    className="flex items-center justify-center px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                                    title="Delete"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
