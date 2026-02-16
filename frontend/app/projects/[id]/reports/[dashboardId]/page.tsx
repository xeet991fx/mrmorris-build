"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilIcon,
    StarIcon as StarOutline,
    ChartBarSquareIcon,
    CalendarDaysIcon,
    ArrowPathIcon,
    AdjustmentsHorizontalIcon,
    ArrowsRightLeftIcon,
    XMarkIcon,
    FunnelIcon,
    SignalIcon,
    ChevronDownIcon,
    ArrowsPointingOutIcon,
    ChartPieIcon,
    EnvelopeIcon,
    CurrencyDollarIcon,
    DocumentChartBarIcon,
    Bars3Icon,
    QuestionMarkCircleIcon,
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
import { cn } from "@/lib/utils";

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
    const [editingDesc, setEditingDesc] = useState(false);
    const [editDesc, setEditDesc] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [reportToEdit, setReportToEdit] = useState<any>(null);
    const [resizeMode, setResizeMode] = useState(false);

    // Fullscreen state
    const [fullscreenReport, setFullscreenReport] = useState<any>(null);
    const [showFullscreen, setShowFullscreen] = useState(false);

    // ─── P0: Dashboard-Level Controls ─────────────────────────
    const DATE_RANGE_PRESETS = [
        { label: "7 days", value: "7days" },
        { label: "30 days", value: "30days" },
        { label: "90 days", value: "90days" },
        { label: "YTD", value: "ytd" },
        { label: "All Time", value: "all" },
    ] as const;
    const [dateRange, setDateRange] = useState<string>("30days");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [comparisonEnabled, setComparisonEnabled] = useState(false);
    const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off
    const [showAutoRefreshMenu, setShowAutoRefreshMenu] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // bump to trigger all widget refreshes
    const [dashboardFilters, setDashboardFilters] = useState<{ key: string; value: string; label: string }[]>([]);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const autoRefreshMenuRef = useRef<HTMLDivElement>(null);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // P2: Drag-and-drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    // Auto-refresh timer
    useEffect(() => {
        if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
        if (autoRefreshInterval > 0) {
            autoRefreshRef.current = setInterval(() => {
                setRefreshKey(k => k + 1);
            }, autoRefreshInterval * 1000);
        }
        return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
    }, [autoRefreshInterval]);

    // Close dropdown menus on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) setShowDatePicker(false);
            if (autoRefreshMenuRef.current && !autoRefreshMenuRef.current.contains(e.target as Node)) setShowAutoRefreshMenu(false);
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowFilterMenu(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const removeDashboardFilter = (index: number) => {
        setDashboardFilters(f => f.filter((_, i) => i !== index));
    };

    const addDashboardFilter = (key: string, value: string, label: string) => {
        setDashboardFilters(f => [...f, { key, value, label }]);
        setShowFilterMenu(false);
    };

    const loadDashboard = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getReportDashboard(workspaceId, dashboardId);
            setDashboard(data.dashboard);
            setEditName(data.dashboard?.name || "");
            setEditDesc(data.dashboard?.description || "");
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

    const handleDescriptionSave = async () => {
        const trimmed = editDesc.trim();
        if (trimmed === (dashboard.description || "")) {
            setEditingDesc(false);
            return;
        }
        try {
            await updateReportDashboard(workspaceId, dashboardId, {
                description: trimmed,
            });
            setEditingDesc(false);
            await loadDashboard();
        } catch (err: any) {
            console.error("Error updating description:", err);
            toast.error(err?.response?.data?.error || "Failed to update description");
        }
    };

    const handleWidgetResize = async (reportId: string, newSize: { w: number; h: number }) => {
        try {
            const report = dashboard.reports.find((r: any) => r._id === reportId);
            if (!report) return;
            await updateReportWidget(workspaceId, dashboardId, reportId, {
                position: { ...report.position, w: newSize.w, h: newSize.h },
            });
            await loadDashboard();
        } catch (err: any) {
            console.error("Error resizing widget:", err);
            toast.error(err?.response?.data?.error || "Failed to resize widget");
        }
    };

    // P2: Widget note update
    const handleNoteUpdate = async (reportId: string, note: string) => {
        try {
            await updateReportWidget(workspaceId, dashboardId, reportId, { note });
            // Optimistic local update
            setDashboard((prev: any) => ({
                ...prev,
                reports: prev.reports.map((r: any) =>
                    r._id === reportId ? { ...r, note } : r
                ),
            }));
        } catch (err: any) {
            console.error("Error updating note:", err);
            toast.error("Failed to save note");
        }
    };

    // P2: Drag-and-drop reorder
    const handleDragReorder = async (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const reordered = [...dashboard.reports];
        const [moved] = reordered.splice(fromIndex, 1);
        reordered.splice(toIndex, 0, moved);
        // Optimistic local update
        setDashboard((prev: any) => ({ ...prev, reports: reordered }));
        try {
            await updateReportDashboard(workspaceId, dashboardId, { reports: reordered });
        } catch (err: any) {
            console.error("Error reordering:", err);
            toast.error("Failed to save widget order");
            await loadDashboard();
        }
    };

    // P2: Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
            switch (e.key.toLowerCase()) {
                case "r":
                    e.preventDefault();
                    setRefreshKey(k => k + 1);
                    toast.success("Refreshing all reports");
                    break;
                case "n":
                    e.preventDefault();
                    setShowAddModal(true);
                    break;
                case "f":
                    e.preventDefault();
                    setShowFilterMenu(prev => !prev);
                    break;
                case "?":
                    e.preventDefault();
                    setShowShortcuts(prev => !prev);
                    break;
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

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

                        {editingDesc ? (
                            <input
                                type="text"
                                value={editDesc}
                                onChange={(e) => setEditDesc(e.target.value)}
                                onBlur={handleDescriptionSave}
                                onKeyDown={(e) => e.key === "Enter" && handleDescriptionSave()}
                                autoFocus
                                placeholder="Add a description…"
                                className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 bg-transparent border-b border-emerald-500 outline-none w-full max-w-lg py-0.5"
                            />
                        ) : (
                            <p
                                className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors group/desc flex items-center gap-1.5"
                                onClick={() => { setEditDesc(dashboard.description || ""); setEditingDesc(true); }}
                            >
                                {dashboard.description || <span className="italic text-zinc-400 dark:text-zinc-600">Add a description…</span>}
                                <PencilIcon className="w-3 h-3 text-zinc-300 dark:text-zinc-600 opacity-0 group-hover/desc:opacity-100 transition-opacity" />
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
            </div>

            {/* ═══ P0: Dashboard Control Bar ═══ */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mx-4 sm:mx-6 lg:mx-8 py-3 flex flex-wrap items-center gap-2 border-t border-b border-zinc-200 dark:border-zinc-800"
            >
                {/* Date Range Picker */}
                <div className="relative" ref={datePickerRef}>
                    <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                            dateRange !== "all"
                                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        )}
                    >
                        <CalendarDaysIcon className="w-3.5 h-3.5" />
                        {DATE_RANGE_PRESETS.find(p => p.value === dateRange)?.label || "Date Range"}
                        <ChevronDownIcon className="w-3 h-3" />
                    </button>
                    {showDatePicker && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                            {DATE_RANGE_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => { setDateRange(preset.value); setShowDatePicker(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-xs transition-colors",
                                        dateRange === preset.value
                                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-medium"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                                    )}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Period Comparison Toggle */}
                <button
                    onClick={() => setComparisonEnabled(!comparisonEnabled)}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                        comparisonEnabled
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    )}
                >
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                    Compare
                </button>

                {/* Filter Button */}
                <div className="relative" ref={filterMenuRef}>
                    <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                            dashboardFilters.length > 0
                                ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        )}
                    >
                        <FunnelIcon className="w-3.5 h-3.5" />
                        Filters
                        {dashboardFilters.length > 0 && (
                            <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-violet-500 text-white">
                                {dashboardFilters.length}
                            </span>
                        )}
                    </button>
                    {showFilterMenu && (
                        <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                            <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Quick Filters</p>
                            {["Pipeline", "Owner", "Status", "Source"].map((filterType) => (
                                <button
                                    key={filterType}
                                    onClick={() => addDashboardFilter(filterType.toLowerCase(), "all", `${filterType}: All`)}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                >
                                    <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 text-zinc-400" />
                                    {filterType}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Separator */}
                <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />

                {/* Auto-Refresh */}
                <div className="relative" ref={autoRefreshMenuRef}>
                    <button
                        onClick={() => setShowAutoRefreshMenu(!showAutoRefreshMenu)}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                            autoRefreshInterval > 0
                                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        )}
                    >
                        {autoRefreshInterval > 0 ? (
                            <SignalIcon className="w-3.5 h-3.5 animate-pulse" />
                        ) : (
                            <ArrowPathIcon className="w-3.5 h-3.5" />
                        )}
                        {autoRefreshInterval > 0 ? (
                            <>
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Live · {autoRefreshInterval}s
                            </>
                        ) : "Auto-refresh"}
                    </button>
                    {showAutoRefreshMenu && (
                        <div className="absolute left-0 top-full mt-1 w-36 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                            {[{ label: "Off", value: 0 }, { label: "30 seconds", value: 30 }, { label: "1 minute", value: 60 }, { label: "5 minutes", value: 300 }].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setAutoRefreshInterval(opt.value); setShowAutoRefreshMenu(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-1.5 text-xs transition-colors",
                                        autoRefreshInterval === opt.value
                                            ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium"
                                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Manual Refresh All */}
                <button
                    onClick={() => setRefreshKey(k => k + 1)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                    title="Refresh all reports"
                >
                    <ArrowPathIcon className="w-3.5 h-3.5" />
                </button>

                {/* Resize Mode Toggle */}
                <button
                    onClick={() => setResizeMode(!resizeMode)}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                        resizeMode
                            ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300"
                            : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                    )}
                >
                    <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                    Resize
                </button>

                {/* Stats — pushed right */}
                <div className="ml-auto flex items-center gap-2 text-xs text-zinc-500">
                    {/* Keyboard shortcuts help */}
                    <div className="relative">
                        <button
                            onClick={() => setShowShortcuts(!showShortcuts)}
                            className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                            title="Keyboard shortcuts"
                        >
                            <QuestionMarkCircleIcon className="w-3.5 h-3.5" />
                        </button>
                        {showShortcuts && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 p-3 z-30">
                                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Shortcuts</p>
                                {[
                                    { key: "R", action: "Refresh all" },
                                    { key: "N", action: "Add report" },
                                    { key: "F", action: "Toggle filters" },
                                    { key: "?", action: "This help" },
                                ].map((s) => (
                                    <div key={s.key} className="flex items-center justify-between py-0.5">
                                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300">{s.action}</span>
                                        <kbd className="text-[10px] font-mono bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded">{s.key}</kbd>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{reportCount}</span> reports
                </div>
            </motion.div>

            {/* Active Filter Pills */}
            <AnimatePresence>
                {dashboardFilters.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mx-4 sm:mx-6 lg:mx-8 py-2 flex flex-wrap items-center gap-1.5"
                    >
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mr-1">Active:</span>
                        {dashboardFilters.map((filter, i) => (
                            <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 text-[11px] font-medium rounded-full border border-violet-200 dark:border-violet-800"
                            >
                                {filter.label}
                                <button onClick={() => removeDashboardFilter(i)} className="hover:text-violet-900 dark:hover:text-violet-100 transition-colors">
                                    <XMarkIcon className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                        <button
                            onClick={() => setDashboardFilters([])}
                            className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ml-1"
                        >
                            Clear all
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Report Widgets Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                {reportCount === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 max-w-2xl mx-auto"
                    >
                        {/* Gradient illustration */}
                        <div className="relative w-20 h-20 mx-auto mb-6">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-blue-400/20 rounded-2xl rotate-6" />
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-violet-500/10 rounded-2xl -rotate-3" />
                            <div className="relative flex items-center justify-center w-full h-full bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                                <DocumentChartBarIcon className="w-9 h-9 text-emerald-500" />
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                            Build your dashboard
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 max-w-md mx-auto">
                            Start with one of our suggested reports or create your own custom widget.
                        </p>

                        {/* Suggested report templates */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                            {[
                                { icon: ChartPieIcon, title: "Pipeline Overview", desc: "Deal stages & conversion", color: "emerald" },
                                { icon: EnvelopeIcon, title: "Email Performance", desc: "Open rates & engagement", color: "blue" },
                                { icon: CurrencyDollarIcon, title: "Revenue Forecast", desc: "Won deals & projections", color: "violet" },
                            ].map((tmpl) => (
                                <button
                                    key={tmpl.title}
                                    onClick={() => setShowAddModal(true)}
                                    className={`group/tmpl flex flex-col items-center gap-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-${tmpl.color}-300 dark:hover:border-${tmpl.color}-700 bg-white dark:bg-zinc-800/50 hover:shadow-md transition-all`}
                                >
                                    <div className={`w-10 h-10 rounded-lg bg-${tmpl.color}-50 dark:bg-${tmpl.color}-900/20 flex items-center justify-center`}>
                                        <tmpl.icon className={`w-5 h-5 text-${tmpl.color}-500`} />
                                    </div>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{tmpl.title}</span>
                                    <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{tmpl.desc}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Create Custom Report
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
                            <div
                                key={report._id || i}
                                draggable
                                onDragStart={() => setDraggedIndex(i)}
                                onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i); }}
                                onDragEnd={() => {
                                    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
                                        handleDragReorder(draggedIndex, dragOverIndex);
                                    }
                                    setDraggedIndex(null);
                                    setDragOverIndex(null);
                                }}
                                className={cn(
                                    "relative transition-all",
                                    draggedIndex === i && "opacity-40 scale-95",
                                    dragOverIndex === i && draggedIndex !== i && "ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-zinc-900 rounded-xl",
                                )}
                                style={{
                                    gridColumn: `span ${report.position?.w || 2}`,
                                    gridRow: `span ${report.position?.h || 1}`,
                                }}
                            >
                                {/* Drag handle — top-left grip */}
                                <div className="absolute top-2.5 left-0 z-10 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400">
                                    <Bars3Icon className="w-3 h-3" />
                                </div>
                                <ReportWidget
                                    report={report}
                                    workspaceId={workspaceId}
                                    onEdit={handleEditReport}
                                    onRemove={handleRemoveReport}
                                    onDuplicate={handleDuplicateReport}
                                    onFullscreen={handleFullscreen}
                                    onNoteUpdate={handleNoteUpdate}
                                    dateRangeOverride={dateRange !== "all" ? dateRange : undefined}
                                    comparisonEnabled={comparisonEnabled}
                                    refreshKey={refreshKey}
                                    dashboardFilters={dashboardFilters}
                                    resizable={resizeMode}
                                    onResize={handleWidgetResize}
                                />
                            </div>
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
