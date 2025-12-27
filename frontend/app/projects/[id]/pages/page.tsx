"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    ArrowPathIcon,
    DocumentTextIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    ChartBarIcon,
    GlobeAltIcon,
    QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { getLandingPages, deleteLandingPage, LandingPage } from "@/lib/api/landingPage";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

export default function LandingPagesListPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedStatus, setSelectedStatus] = useState<'all' | 'draft' | 'published' | 'archived'>('all');

    const loadPages = async () => {
        setIsLoading(true);
        try {
            const response = await getLandingPages(
                workspaceId,
                selectedStatus === 'all' ? undefined : selectedStatus
            );
            if (response.success) {
                setPages(response.data);
            }
        } catch (error) {
            console.error("Error loading pages:", error);
            toast.error("Failed to load landing pages");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPages();
    }, [workspaceId, selectedStatus]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this landing page? This cannot be undone.")) return;

        try {
            await deleteLandingPage(workspaceId, id);
            toast.success("Landing page deleted");
            loadPages();
        } catch (error) {
            console.error("Error deleting page:", error);
            toast.error("Failed to delete page");
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

    const filteredPages = selectedStatus === 'all' ? pages : pages.filter(p => p.status === selectedStatus);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Landing Pages</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create beautiful landing pages to convert visitors into leads
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link
                        href={`/projects/${workspaceId}/pages/help`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                        title="View Guide"
                    >
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Help</span>
                    </Link>
                    <button
                        onClick={loadPages}
                        disabled={isLoading}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                    >
                        <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    <Link
                        href={`/projects/${workspaceId}/pages/new`}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create Page
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

            {/* Pages Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-12">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredPages.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-lg">
                    <GlobeAltIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                        {selectedStatus === 'all' ? 'No landing pages yet' : `No ${selectedStatus} pages`}
                    </p>
                    <Link
                        href={`/projects/${workspaceId}/pages/new`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors mt-4"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Create Your First Page
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPages.map((page) => (
                        <motion.div
                            key={page._id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-foreground line-clamp-1 mb-1">
                                        {page.name}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        /{page.slug}
                                    </p>
                                </div>
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-xs font-medium border capitalize",
                                    getStatusColor(page.status)
                                )}>
                                    {page.status}
                                </span>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Views</p>
                                    <p className="text-lg font-bold text-foreground">{page.stats.views}</p>
                                </div>
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Visitors</p>
                                    <p className="text-lg font-bold text-foreground">{page.stats.uniqueVisitors}</p>
                                </div>
                                <div className="text-center p-2 rounded bg-muted/30">
                                    <p className="text-xs text-muted-foreground">Rate</p>
                                    <p className="text-lg font-bold text-foreground">
                                        {page.stats.conversionRate.toFixed(0)}%
                                    </p>
                                </div>
                            </div>

                            {/* Sections Count */}
                            <div className="text-xs text-muted-foreground mb-4">
                                {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link
                                    href={`/projects/${workspaceId}/pages/${page._id}/edit`}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    Edit
                                </Link>
                                {page.status === 'published' && (
                                    <a
                                        href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || window.location.origin}/p/${page.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center px-3 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                                        title="View Live"
                                    >
                                        <EyeIcon className="w-4 h-4" />
                                    </a>
                                )}
                                <button
                                    onClick={() => handleDelete(page._id)}
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
