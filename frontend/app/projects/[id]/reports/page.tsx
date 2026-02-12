"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    ChartBarSquareIcon,
    MagnifyingGlassIcon,
    TrashIcon,
    ChevronRightIcon,
    XMarkIcon,
    StarIcon as StarOutline,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import {
    getReportDashboards,
    createReportDashboard,
    updateReportDashboard,
    deleteReportDashboard,
} from "@/lib/api/reportDashboards";
import { cn } from "@/lib/utils";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ReportsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [dashboards, setDashboards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filter, setFilter] = useState<"all" | "favorites">("all");
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [dashboardToDelete, setDashboardToDelete] = useState<string | null>(null);

    const loadDashboards = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getReportDashboards(workspaceId);
            setDashboards(data.dashboards || []);
        } catch (err) {
            console.error("Error loading dashboards:", err);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        loadDashboards();
    }, [loadDashboards]);

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setIsCreating(true);
        try {
            const data = await createReportDashboard(workspaceId, {
                name: newName.trim(),
                description: newDescription.trim(),
            });
            setNewName("");
            setNewDescription("");
            setShowNewForm(false);
            if (data.dashboard?._id) {
                router.push(`/projects/${workspaceId}/reports/${data.dashboard._id}`);
            } else {
                loadDashboards();
            }
        } catch (err) {
            console.error("Error creating dashboard:", err);
        } finally {
            setIsCreating(false);
        }
    };

    const handleToggleFavorite = async (e: React.MouseEvent, dashboard: any) => {
        e.stopPropagation();
        try {
            await updateReportDashboard(workspaceId, dashboard._id, {
                isFavorite: !dashboard.isFavorite,
            });
            loadDashboards();
        } catch (err) {
            console.error("Error toggling favorite:", err);
        }
    };

    const handleDelete = async () => {
        if (!dashboardToDelete) return;
        try {
            await deleteReportDashboard(workspaceId, dashboardToDelete);
            setDashboardToDelete(null);
            loadDashboards();
        } catch (err) {
            console.error("Error deleting dashboard:", err);
        }
    };

    const openDeleteConfirm = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setDashboardToDelete(id);
        setDeleteConfirmOpen(true);
    };

    // Computed
    const favoriteCount = dashboards.filter((d) => d.isFavorite).length;
    const totalReports = dashboards.reduce(
        (sum, d) => sum + (d.reports?.length || 0),
        0
    );

    const filtered = dashboards.filter((d) => {
        const matchesSearch =
            searchQuery === "" ||
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter =
            filter === "all" || (filter === "favorites" && d.isFavorite);
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="h-full overflow-y-auto">
            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Reports
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Create dashboards to visualize your CRM data
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowNewForm(true)}
                            disabled={isCreating}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Creating...</span>
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Dashboard</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {dashboards.length}
                        </span>
                        <span className="text-sm text-zinc-500">dashboards</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-emerald-500">
                            {totalReports}
                        </span>
                        <span className="text-sm text-zinc-500">reports</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-amber-500">
                            {favoriteCount}
                        </span>
                        <span className="text-sm text-zinc-500">favorites</span>
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
                            placeholder="Search dashboards..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "favorites"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                    filter === f
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* New Dashboard Form */}
            <AnimatePresence>
                {showNewForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mx-4 sm:mx-6 lg:mx-8 mb-4"
                    >
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Create Dashboard
                                </h3>
                                <button
                                    onClick={() => {
                                        setShowNewForm(false);
                                        setNewName("");
                                        setNewDescription("");
                                    }}
                                    className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Dashboard name"
                                    autoFocus
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                />
                                <input
                                    type="text"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="Description (optional)"
                                    className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    onClick={() => {
                                        setShowNewForm(false);
                                        setNewName("");
                                        setNewDescription("");
                                    }}
                                    className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={!newName.trim() || isCreating}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Dashboard List */}
            <div className="px-8 pb-8">
                {loading ? (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : dashboards.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <ChartBarSquareIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                            No dashboards yet
                        </h3>
                        <p className="text-sm text-zinc-500 mb-6">
                            Create your first dashboard to start tracking metrics
                        </p>
                        <button
                            onClick={() => setShowNewForm(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Dashboard
                        </button>
                    </motion.div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500">
                        No dashboards match your search.
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filtered.map((dashboard) => (
                            <DashboardRow
                                key={dashboard._id}
                                dashboard={dashboard}
                                onOpen={() =>
                                    router.push(
                                        `/projects/${workspaceId}/reports/${dashboard._id}`
                                    )
                                }
                                onToggleFavorite={(e) => handleToggleFavorite(e, dashboard)}
                                onDelete={(e) => openDeleteConfirm(e, dashboard._id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDashboardToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Delete Dashboard"
                message="Are you sure you want to delete this dashboard? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
}

// ============================================
// DASHBOARD ROW
// ============================================

function DashboardRow({
    dashboard,
    onOpen,
    onToggleFavorite,
    onDelete,
}: {
    dashboard: any;
    onOpen: () => void;
    onToggleFavorite: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}) {
    const reportCount = dashboard.reports?.length || 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
            onClick={onOpen}
        >
            {/* Favorite indicator */}
            <button
                onClick={onToggleFavorite}
                className="flex-shrink-0"
            >
                {dashboard.isFavorite ? (
                    <StarSolid className="w-4 h-4 text-amber-400" />
                ) : (
                    <StarOutline className="w-4 h-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-amber-400 transition-all" />
                )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {dashboard.name}
                    </p>
                    {dashboard.isDefault && (
                        <span className="text-xs text-zinc-400 capitalize">default</span>
                    )}
                </div>
                {dashboard.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {dashboard.description}
                    </p>
                )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-xs text-zinc-500">
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {reportCount}
                    </p>
                    <p>reports</p>
                </div>
                <div className="text-center hidden sm:block">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {new Date(dashboard.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                        })}
                    </p>
                    <p>created</p>
                </div>
            </div>

            {/* Actions */}
            <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onDelete}
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
