"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    TrashIcon,
    PencilIcon,
    EyeIcon,
    GlobeAltIcon,
    MagnifyingGlassIcon,
    ChevronRightIcon,
    CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { getLandingPages, deleteLandingPage, LandingPage } from "@/lib/api/landingPage";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

// Status indicator colors
const STATUS_COLORS: Record<string, string> = {
    published: "bg-emerald-500",
    draft: "bg-zinc-400",
    archived: "bg-zinc-300",
};

// Page row component - matching campaign row style
function PageRow({ page, workspaceId, onDelete }: {
    page: LandingPage;
    workspaceId: string;
    onDelete: (id: string) => void;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
        >
            <Link href={`/projects/${workspaceId}/pages/${page._id}/edit`} className="flex items-center gap-4 flex-1 min-w-0">
                {/* Status indicator */}
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[page.status] || STATUS_COLORS.draft)} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {page.name}
                        </p>
                        <span className="text-xs text-zinc-400 capitalize">{page.status}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                            /{page.slug}
                        </p>
                        <p className="text-xs text-zinc-400">
                            {page.sections.length} section{page.sections.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-xs text-zinc-500">
                    <div className="text-center">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{page.stats.views}</p>
                        <p>views</p>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{page.stats.uniqueVisitors}</p>
                        <p>visitors</p>
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-emerald-500">{page.stats.conversionRate.toFixed(0)}%</p>
                        <p>rate</p>
                    </div>
                </div>
            </Link>

            {/* Actions - hover revealed */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                <Link href={`/projects/${workspaceId}/pages/${page._id}/edit`}>
                    <button
                        className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                </Link>
                {page.status === 'published' && (
                    <a
                        href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/p/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <button
                            className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                            title="View Live"
                        >
                            <EyeIcon className="w-4 h-4" />
                        </button>
                    </a>
                )}
                <button
                    onClick={() => onDelete(page._id)}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>

            <ChevronRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </motion.div>
    );
}

export default function LandingPagesListPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [pages, setPages] = useState<LandingPage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    const loadPages = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getLandingPages(workspaceId);
            if (response.success) {
                setPages(response.data);
            }
        } catch (error) {
            console.error("Error loading pages:", error);
            toast.error("Failed to load landing pages");
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadPages();
    }, [loadPages]);

    const handleDelete = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        try {
            await deleteLandingPage(workspaceId, deleteConfirmId);
            toast.success("Landing page deleted");
            loadPages();
        } catch (error) {
            console.error("Error deleting page:", error);
            toast.error("Failed to delete page");
        } finally {
            setDeleteConfirmId(null);
        }
    };

    // Filter pages
    const filteredPages = pages.filter((p) => {
        const matchesSearch =
            searchQuery === "" ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const publishedCount = pages.filter(p => p.status === "published").length;
    const draftCount = pages.filter(p => p.status === "draft").length;
    const archivedCount = pages.filter(p => p.status === "archived").length;

    // Loading state
    if (isLoading) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Landing Pages
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Create and manage landing pages to convert visitors
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href={`/projects/${workspaceId}/pages/new`}>
                            <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm">
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">New Page</span>
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-4 flex items-center gap-6"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pages.length}</span>
                        <span className="text-sm text-zinc-500">total</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-500">{publishedCount}</span>
                        <span className="text-sm text-zinc-500">published</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="text-2xl font-bold text-zinc-500">{draftCount}</span>
                        <span className="text-sm text-zinc-500">draft</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-300" />
                        <span className="text-2xl font-bold text-zinc-400">{archivedCount}</span>
                        <span className="text-sm text-zinc-500">archived</span>
                    </div>
                </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Search & Filter */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search pages..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "published", "draft", "archived"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                    statusFilter === status
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Pages List */}
            <div className="px-8 pb-8">
                {filteredPages.length === 0 ? (
                    pages.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <GlobeAltIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No landing pages yet</h3>
                            <p className="text-sm text-zinc-500 mb-6">Create your first landing page to start converting visitors</p>
                            <Link href={`/projects/${workspaceId}/pages/new`}>
                                <button className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
                                    <PlusIcon className="w-4 h-4" />
                                    Create Page
                                </button>
                            </Link>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            No pages match your search.
                        </div>
                    )
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredPages.map((page) => (
                            <PageRow
                                key={page._id}
                                page={page}
                                workspaceId={workspaceId}
                                onDelete={handleDelete}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                    >
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4"
                        >
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Page</h3>
                            <p className="text-sm text-zinc-500 mb-6">Delete this landing page? This action cannot be undone.</p>
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
