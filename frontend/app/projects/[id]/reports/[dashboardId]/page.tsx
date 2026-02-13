"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilIcon,
    StarIcon as StarOutline,
    ChartBarSquareIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import toast from "react-hot-toast";
import {
    getReportDashboard,
    updateReportDashboard,
    addReportWidget,
    updateReportWidget,
    removeReportWidget,
    duplicateReportWidget,
} from "@/lib/api/reportDashboards";
import ReportWidget, { renderReportChart } from "@/components/reports/ReportWidget";
import AddReportModal from "@/components/reports/AddReportModal";
import ReportFullscreenModal from "@/components/reports/ReportFullscreenModal";

export default function DashboardViewPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const dashboardId = params.dashboardId as string;

    const [dashboard, setDashboard] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [reportToEdit, setReportToEdit] = useState<any>(null);

    // Fullscreen state
    const [fullscreenReport, setFullscreenReport] = useState<any>(null);
    const [showFullscreen, setShowFullscreen] = useState(false);

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getReportDashboard(workspaceId, dashboardId);
            setDashboard(data.dashboard);
            setEditName(data.dashboard?.name || "");
        } catch (err) {
            console.error("Error loading dashboard:", err);
        } finally {
            setLoading(false);
        }
    }, [workspaceId, dashboardId]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    const handleAddReport = async (reportData: any) => {
        try {
            await addReportWidget(workspaceId, dashboardId, reportData);
            await loadDashboard();
            toast.success("Report added successfully");
        } catch (err: any) {
            console.error("Error adding report:", err);
            toast.error(err?.response?.data?.error || "Failed to add report");
        }
    };

    const handleRemoveReport = async (reportId: string) => {
        try {
            await removeReportWidget(workspaceId, dashboardId, reportId);
            await loadDashboard();
            toast.success("Report removed successfully");
        } catch (err: any) {
            console.error("Error removing report:", err);
            toast.error(err?.response?.data?.error || "Failed to remove report");
        }
    };

    const handleEditReport = (report: any) => {
        setReportToEdit(report);
        setEditMode(true);
        setShowAddModal(true);
    };

    const handleUpdateReport = async (reportId: string, reportData: any) => {
        try {
            await updateReportWidget(workspaceId, dashboardId, reportId, reportData);
            await loadDashboard();
            toast.success("Report updated successfully");
        } catch (err: any) {
            console.error("Error updating report:", err);
            toast.error(err?.response?.data?.error || "Failed to update report");
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditMode(false);
        setReportToEdit(null);
    };

    const handleToggleFavorite = async () => {
        try {
            await updateReportDashboard(workspaceId, dashboardId, {
                isFavorite: !dashboard.isFavorite,
            });
            await loadDashboard();
            toast.success(dashboard.isFavorite ? "Removed from favorites" : "Added to favorites");
        } catch (err: any) {
            console.error("Error toggling favorite:", err);
            toast.error(err?.response?.data?.error || "Failed to update dashboard");
        }
    };

    const handleRename = async () => {
        if (!editName.trim() || editName === dashboard.name) {
            setEditing(false);
            return;
        }
        try {
            await updateReportDashboard(workspaceId, dashboardId, {
                name: editName.trim(),
            });
            setEditing(false);
            await loadDashboard();
            toast.success("Dashboard renamed successfully");
        } catch (err: any) {
            console.error("Error renaming:", err);
            toast.error(err?.response?.data?.error || "Failed to rename dashboard");
        }
    };

    // ─── P2 Handlers ───────────────────────────────────────────

    const handleDuplicateReport = async (reportId: string) => {
        try {
            await duplicateReportWidget(workspaceId, dashboardId, reportId);
            await loadDashboard();
            toast.success("Report duplicated");
        } catch (err: any) {
            console.error("Error duplicating report:", err);
            toast.error(err?.response?.data?.error || "Failed to duplicate report");
        }
    };

    const handleFullscreen = (report: any) => {
        setFullscreenReport(report);
        setShowFullscreen(true);
    };

    const handleCloseFullscreen = () => {
        setShowFullscreen(false);
        setFullscreenReport(null);
    };

    // ─── Render ────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                    <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-4 w-72 bg-zinc-100 dark:bg-zinc-800 rounded mt-3 animate-pulse" />
                </div>
                <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />
                <div className="px-8 py-8 grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse col-span-1"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="text-center py-20">
                    <ChartBarSquareIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                        Dashboard not found
                    </h3>
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/reports`)}
                        className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
                    >
                        ← Back to Reports
                    </button>
                </div>
            </div>
        );
    }

    const reportCount = dashboard.reports?.length || 0;

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
                        {/* Back link */}
                        <button
                            onClick={() => router.push(`/projects/${workspaceId}/reports`)}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mb-3"
                        >
                            <ArrowLeftIcon className="w-3.5 h-3.5" />
                            Reports
                        </button>

                        {/* Title */}
                        <div className="flex items-center gap-3">
                            {editing ? (
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    onBlur={handleRename}
                                    onKeyDown={(e) => e.key === "Enter" && handleRename()}
                                    autoFocus
                                    className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 bg-transparent border-b-2 border-emerald-500 outline-none py-0.5"
                                />
                            ) : (
                                <h1
                                    className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 cursor-pointer group flex items-center gap-2"
                                    onClick={() => setEditing(true)}
                                >
                                    {dashboard.name}
                                    <PencilIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </h1>
                            )}
                            <button
                                onClick={handleToggleFavorite}
                                className="flex-shrink-0"
                            >
                                {dashboard.isFavorite ? (
                                    <StarSolid className="w-5 h-5 text-amber-400" />
                                ) : (
                                    <StarOutline className="w-5 h-5 text-zinc-300 dark:text-zinc-600 hover:text-amber-400 transition-colors" />
                                )}
                            </button>
                        </div>

                        {dashboard.description && (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {dashboard.description}
                            </p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Report</span>
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 sm:mt-8 flex items-center gap-8"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            {reportCount}
                        </span>
                        <span className="text-sm text-zinc-500">reports</span>
                    </div>
                </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Report Widgets Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {reportCount === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16"
                    >
                        <ChartBarSquareIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                            Empty dashboard
                        </h3>
                        <p className="text-sm text-zinc-500 mb-6">
                            Add report widgets to start visualizing your data
                        </p>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Add Report
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid gap-4"
                        style={{
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gridAutoRows: "auto",
                        }}
                    >
                        {dashboard.reports.map((report: any, i: number) => (
                            <ReportWidget
                                key={report._id || i}
                                report={report}
                                workspaceId={workspaceId}
                                onEdit={handleEditReport}
                                onRemove={handleRemoveReport}
                                onDuplicate={handleDuplicateReport}
                                onFullscreen={handleFullscreen}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Add/Edit Report Modal */}
            <AddReportModal
                isOpen={showAddModal}
                onClose={handleCloseModal}
                onAdd={handleAddReport}
                onUpdate={handleUpdateReport}
                workspaceId={workspaceId}
                editMode={editMode}
                existingReport={reportToEdit}
            />

            {/* Fullscreen Report Modal */}
            <ReportFullscreenModal
                isOpen={showFullscreen}
                onClose={handleCloseFullscreen}
                report={fullscreenReport}
                reports={dashboard?.reports || []}
                workspaceId={workspaceId}
                renderChart={renderReportChart}
            />
        </div>
    );
}
