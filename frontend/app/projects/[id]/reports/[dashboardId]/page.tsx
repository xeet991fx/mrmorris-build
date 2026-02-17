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
    ArrowDownTrayIcon,
    MinusIcon,
    ShareIcon,
    BookmarkIcon,
    LinkIcon,
    ClipboardIcon,
    TrashIcon,
    CodeBracketIcon,
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
    saveFilterPreset,
    deleteFilterPreset,
    shareDashboard,
    createReportTemplate,
    getReportCustomFields,
} from "@/lib/api/reportDashboards";
import { getTeam } from "@/lib/api/team"; // P2: Import team API
import ReportWidget, { renderReportChart } from "@/components/reports/ReportWidget";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
        { label: "Custom Range", value: "custom" },
    ] as const;
    const [dateRange, setDateRange] = useState<string>("30days");
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [customStartDate, setCustomStartDate] = useState<string>("");
    const [customEndDate, setCustomEndDate] = useState<string>("");
    const [showCustomDateInputs, setShowCustomDateInputs] = useState(false);
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

    // PDF export state
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const dashboardContainerRef = useRef<HTMLDivElement>(null);

    // Add widget menu state
    const [showAddMenu, setShowAddMenu] = useState(false);
    const addMenuRef = useRef<HTMLDivElement>(null);

    // P1: Share & Template state
    const [showShareMenu, setShowShareMenu] = useState(false);
    const shareMenuRef = useRef<HTMLDivElement>(null);

    // P1: Custom field filters
    const [customFieldDefs, setCustomFieldDefs] = useState<any[]>([]);
    const [showCustomFieldMenu, setShowCustomFieldMenu] = useState(false);

    // P2: Comments — workspace users for @mention
    const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);

    // P2: Dashboard Tabs
    const [activeTab, setActiveTab] = useState<string>("all");

    // P2: Drag and Drop
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = (event: any) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = dashboard.reports.findIndex((r: any) => r._id === active.id);
            const newIndex = dashboard.reports.findIndex((r: any) => r._id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                handleDragReorder(oldIndex, newIndex);
            }
        }
        setActiveId(null);
    };

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
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
            if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) setShowFilterMenu(false);
            if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setShowAddMenu(false);
            if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) setShowShareMenu(false);

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

    // P1: Load custom field definitions for filter picker
    useEffect(() => {
        const loadCustomFields = async () => {
            try {
                const result = await getReportCustomFields(workspaceId);
                setCustomFieldDefs(result.data || []);
            } catch (err) {
                console.error("Error loading custom fields:", err);
            }
        };
        loadCustomFields();
    }, [workspaceId]);



    // P2: Load workspace users for comments @mention
    useEffect(() => {
        const loadUsers = async () => {
            try {
                const result = await getTeam(workspaceId);
                if (result.success && result.data?.members) {
                    setWorkspaceUsers(result.data.members.filter(m => m.status === "active" && m.userId));
                }
            } catch (err) {
                console.error("Error loading team members:", err);
            }
        };
        loadUsers();
    }, [workspaceId]);

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

    const handleExportPDF = async () => {
        if (!dashboardContainerRef.current || !dashboard) return;

        setIsExportingPDF(true);
        toast.loading("Generating PDF...", { id: "pdf-export" });

        try {
            const html2canvas = (await import("html2canvas")).default;
            const jsPDF = (await import("jspdf")).default;

            // Capture the dashboard container
            const canvas = await html2canvas(dashboardContainerRef.current, {
                backgroundColor: "#ffffff",
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: dashboardContainerRef.current.scrollWidth,
                windowHeight: dashboardContainerRef.current.scrollHeight,
            });

            // Calculate PDF dimensions
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            const pdf = new jsPDF("p", "mm", "a4");
            let position = 0;

            // Add title page
            pdf.setFontSize(20);
            pdf.text(dashboard.name, 105, 20, { align: "center" });
            if (dashboard.description) {
                pdf.setFontSize(12);
                pdf.text(dashboard.description, 105, 30, { align: "center", maxWidth: 180 });
            }
            pdf.setFontSize(10);
            pdf.text(`Generated on ${new Date().toLocaleString()}`, 105, 40, { align: "center" });

            // Add dashboard image
            const imgData = canvas.toDataURL("image/png");
            position = 50;

            // Add image to PDF, paginating if necessary
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight + position;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Save the PDF
            const fileName = `${dashboard.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
            pdf.save(fileName);

            toast.success("PDF exported successfully", { id: "pdf-export" });
        } catch (err) {
            console.error("Failed to export PDF:", err);
            toast.error("Failed to export PDF", { id: "pdf-export" });
        } finally {
            setIsExportingPDF(false);
        }
    };

    const handleAddDivider = async () => {
        try {
            const reportData = {
                type: "divider",
                title: "Section Divider",
                chartType: "divider",
                config: {},
                position: { x: 0, y: 0, w: 4, h: 1 },
            };
            await addReportWidget(workspaceId, dashboardId, reportData);
            await loadDashboard();
            toast.success("Divider added");
        } catch (err: any) {
            console.error("Error adding divider:", err);
            toast.error("Failed to add divider");
        }
    };

    const handleAddTextBlock = async () => {
        const content = prompt("Enter text for the block (you can edit it later):");
        if (!content) return;

        try {
            const reportData = {
                type: "text_block",
                title: "Text Block",
                chartType: "text",
                config: {},
                content,
                position: { x: 0, y: 0, w: 2, h: 1 },
            };
            await addReportWidget(workspaceId, dashboardId, reportData);
            await loadDashboard();
            toast.success("Text block added");
        } catch (err: any) {
            console.error("Error adding text block:", err);
            toast.error("Failed to add text block");
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

    // P1: Save filter preset
    const handleSaveFilterPreset = async () => {
        if (dashboardFilters.length === 0) {
            toast.error("No active filters to save");
            return;
        }
        const name = prompt("Preset name:");
        if (!name) return;
        try {
            await saveFilterPreset(workspaceId, dashboardId, { name, filters: dashboardFilters, dateRange });
            await loadDashboard();
            toast.success(`Saved filter preset "${name}"`);
        } catch (err: any) {
            console.error("Error saving filter preset:", err);
            toast.error("Failed to save filter preset");
        }
    };

    const handleLoadFilterPreset = (preset: any) => {
        setDashboardFilters(preset.filters || []);
        if (preset.dateRange) setDateRange(preset.dateRange);
        setShowFilterMenu(false);
        toast.success(`Applied "${preset.name}"`);
    };

    const handleDeleteFilterPreset = async (presetId: string) => {
        try {
            await deleteFilterPreset(workspaceId, dashboardId, presetId);
            await loadDashboard();
            toast.success("Preset deleted");
        } catch (err: any) {
            toast.error("Failed to delete preset");
        }
    };

    // P1: Share dashboard
    const handleShareDashboard = async (action: "generate" | "revoke") => {
        try {
            const result = await shareDashboard(workspaceId, dashboardId, action);
            await loadDashboard();
            if (action === "generate" && result.shareToken) {
                const shareUrl = `${window.location.origin}/shared/dashboard/${result.shareToken}`;
                await navigator.clipboard.writeText(shareUrl);
                toast.success("Share link copied to clipboard!");
            } else {
                toast.success("Share link revoked");
            }
            setShowShareMenu(false);
        } catch (err: any) {
            toast.error("Failed to share dashboard");
        }
    };

    // P1: Save widget as template
    const handleSaveAsTemplate = async (report: any) => {
        const name = prompt("Template name:", report.title || "Untitled");
        if (!name) return;
        try {
            await createReportTemplate(workspaceId, {
                name,
                type: report.type,
                chartType: report.chartType,
                config: report.config,
                definition: report.definition,
            });
            toast.success(`Saved "${name}" as template`);
        } catch (err: any) {
            toast.error("Failed to save template");
        }
    };

    // P1: Add custom field filter
    const handleAddCustomFieldFilter = (field: any) => {
        const value = prompt(`Filter value for "${field.fieldLabel}":`);
        if (!value) return;
        addDashboardFilter(
            `customFields.${field.fieldKey}`,
            value,
            `${field.fieldLabel}: ${value}`
        );
        setShowCustomFieldMenu(false);
        setShowFilterMenu(false);
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
                            onClick={handleExportPDF}
                            disabled={isExportingPDF || reportCount === 0}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Export dashboard as PDF"
                        >
                            {isExportingPDF ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Exporting...</span>
                                </>
                            ) : (
                                <>
                                    <ArrowDownTrayIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Export PDF</span>
                                </>
                            )}
                        </button>
                        <div className="relative" ref={addMenuRef}>
                            <button
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Widget</span>
                                <ChevronDownIcon className="w-3 h-3" />
                            </button>
                            {showAddMenu && (
                                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                                    <button
                                        onClick={() => { setShowAddModal(true); setShowAddMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <ChartBarSquareIcon className="w-4 h-4" />
                                        Add Report
                                    </button>
                                    <button
                                        onClick={() => { handleAddTextBlock(); setShowAddMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <Bars3Icon className="w-4 h-4" />
                                        Add Text Block
                                    </button>
                                    <button
                                        onClick={() => { handleAddDivider(); setShowAddMenu(false); }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors"
                                    >
                                        <MinusIcon className="w-4 h-4" />
                                        Add Divider
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ═══ P0: Dashboard Control Bar ═══ */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mx-4 sm:mx-6 lg:mx-8 py-3 flex flex-wrap items-center gap-2 border-t border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto"
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
                        {dateRange === "custom" && customStartDate && customEndDate
                            ? `${new Date(customStartDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(customEndDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : DATE_RANGE_PRESETS.find(p => p.value === dateRange)?.label || "Date Range"}
                        <ChevronDownIcon className="w-3 h-3" />
                    </button>
                    {showDatePicker && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                            {DATE_RANGE_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => {
                                        if (preset.value === "custom") {
                                            setShowCustomDateInputs(true);
                                            setDateRange("custom");
                                        } else {
                                            setDateRange(preset.value);
                                            setShowDatePicker(false);
                                            setShowCustomDateInputs(false);
                                        }
                                    }}
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
                            {showCustomDateInputs && (
                                <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-700 mt-1 space-y-2">
                                    <div>
                                        <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={customStartDate}
                                            onChange={(e) => setCustomStartDate(e.target.value)}
                                            max={customEndDate || undefined}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={customEndDate}
                                            onChange={(e) => setCustomEndDate(e.target.value)}
                                            min={customStartDate || undefined}
                                            className="w-full px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (customStartDate && customEndDate) {
                                                setShowDatePicker(false);
                                                setShowCustomDateInputs(false);
                                            }
                                        }}
                                        disabled={!customStartDate || !customEndDate}
                                        className="w-full px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Apply
                                    </button>
                                </div>
                            )}
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
                            {/* Saved Filter Presets */}
                            {dashboard.savedFilterPresets?.length > 0 && (
                                <>
                                    <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Saved Presets</p>
                                    {dashboard.savedFilterPresets.map((preset: any) => (
                                        <div key={preset._id} className="flex items-center group">
                                            <button
                                                onClick={() => handleLoadFilterPreset(preset)}
                                                className="flex-1 text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                            >
                                                <BookmarkIcon className="w-3.5 h-3.5 text-violet-400" />
                                                {preset.name}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFilterPreset(preset._id)}
                                                className="p-1 mr-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <XMarkIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                            {/* P1: Custom Field Filters */}
                            {customFieldDefs.length > 0 && (
                                <>
                                    <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                    <p className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Custom Fields</p>
                                    {showCustomFieldMenu ? (
                                        <>
                                            {Object.entries(
                                                customFieldDefs.reduce((acc: any, f: any) => {
                                                    (acc[f.entityType] = acc[f.entityType] || []).push(f);
                                                    return acc;
                                                }, {})
                                            ).map(([entityType, fields]: [string, any]) => (
                                                <div key={entityType}>
                                                    <p className="px-3 py-0.5 text-[9px] font-bold text-zinc-300 dark:text-zinc-600 uppercase">{entityType}</p>
                                                    {fields.map((field: any) => (
                                                        <button
                                                            key={field._id}
                                                            onClick={() => handleAddCustomFieldFilter(field)}
                                                            className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                                        >
                                                            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5 text-indigo-400" />
                                                            {field.fieldLabel}
                                                            <span className="ml-auto text-[9px] text-zinc-400">{field.fieldType}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            <button
                                                onClick={() => setShowCustomFieldMenu(false)}
                                                className="w-full text-left px-3 py-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                                            >
                                                ← Back
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={() => setShowCustomFieldMenu(true)}
                                            className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center gap-2 font-medium"
                                        >
                                            <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" />
                                            Filter by Custom Field ({customFieldDefs.length})
                                        </button>
                                    )}
                                </>
                            )}
                            {/* Save Current Filters */}
                            {dashboardFilters.length > 0 && (
                                <>
                                    <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                    <button
                                        onClick={handleSaveFilterPreset}
                                        className="w-full text-left px-3 py-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2 font-medium"
                                    >
                                        <PlusIcon className="w-3.5 h-3.5" />
                                        Save Current Filters
                                    </button>
                                </>
                            )}
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

                {/* P1: Share */}
                <div className="relative" ref={shareMenuRef}>
                    <button
                        onClick={() => setShowShareMenu(!showShareMenu)}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                            dashboard.isPublic
                                ? "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300"
                                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                        )}
                    >
                        <ShareIcon className="w-3.5 h-3.5" />
                        {dashboard.isPublic ? "Shared" : "Share"}
                    </button>
                    {showShareMenu && (
                        <div className="absolute left-0 top-full mt-1 w-52 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-30">
                            {dashboard.isPublic ? (
                                <>
                                    <button
                                        onClick={async () => {
                                            const shareUrl = `${window.location.origin}/shared/dashboard/${dashboard.shareToken}`;
                                            await navigator.clipboard.writeText(shareUrl);
                                            toast.success("Link copied!");
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                    >
                                        <ClipboardIcon className="w-3.5 h-3.5 text-zinc-400" />
                                        Copy Share Link
                                    </button>
                                    <button
                                        onClick={async () => {
                                            const embedUrl = `${window.location.origin}/shared/embed/${dashboard.shareToken}`;
                                            const embedCode = `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0" style="border-radius:12px;border:1px solid #e4e4e7;"></iframe>`;
                                            await navigator.clipboard.writeText(embedCode);
                                            toast.success("Embed code copied!");
                                            setShowShareMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                    >
                                        <CodeBracketIcon className="w-3.5 h-3.5 text-zinc-400" />
                                        Copy Embed Code
                                    </button>
                                    <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                    <button
                                        onClick={() => handleShareDashboard("revoke")}
                                        className="w-full text-left px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                                    >
                                        <XMarkIcon className="w-3.5 h-3.5" />
                                        Revoke Link
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => handleShareDashboard("generate")}
                                    className="w-full text-left px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors flex items-center gap-2"
                                >
                                    <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                                    Generate Share Link
                                </button>
                            )}
                        </div>
                    )}
                </div>


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

            {/* P2: Dashboard Tabs */}
            {dashboard.tabs && dashboard.tabs.length > 0 && (
                <div className="px-4 sm:px-6 lg:mx-8 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-6 overflow-x-auto mb-2">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={cn(
                            "py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                            activeTab === "all"
                                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                        )}
                    >
                        Overview
                    </button>
                    {dashboard.tabs.map((tab: any) => (
                        <button
                            key={tab._id}
                            onClick={() => setActiveTab(tab._id)}
                            className={cn(
                                "py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2",
                                activeTab === tab._id
                                    ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100"
                                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            )}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}

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
            <div ref={dashboardContainerRef} className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
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
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={dashboard.reports.filter((r: any) => activeTab === "all" || r.tabId === activeTab).map((r: any) => r._id)}
                            strategy={rectSortingStrategy}
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-auto"
                            >
                                {dashboard.reports.filter((r: any) => activeTab === "all" || r.tabId === activeTab).map((report: any, i: number) => (
                                    <SortableReportWrapper
                                        key={report._id || i}
                                        id={report._id}
                                        className={cn(
                                            "relative transition-all",
                                            // Mobile: always full width
                                            "col-span-1",
                                            // Tablet: 2 columns, respect half of w
                                            report.position?.w >= 3 ? "md:col-span-2" : "md:col-span-1",
                                            // Desktop: 4 columns, respect full w
                                            `lg:col-span-${Math.min(report.position?.w || 2, 4)}`,
                                            // Row span (height)
                                            `row-span-${report.position?.h || 1}`,
                                        )}
                                    >
                                        {(listeners: any) => (
                                            <>
                                                {/* Drag handle */}
                                                <div
                                                    {...listeners}
                                                    className="absolute top-2.5 left-0 z-10 opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 text-zinc-300 dark:text-zinc-600 hover:text-zinc-500 dark:hover:text-zinc-400"
                                                >
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
                                                    onSaveAsTemplate={() => handleSaveAsTemplate(report)}

                                                    dateRangeOverride={dateRange}
                                                    comparisonEnabled={comparisonEnabled}
                                                    refreshKey={refreshKey}
                                                    dashboardFilters={dashboardFilters}
                                                    resizable={resizeMode}
                                                    onResize={handleWidgetResize}
                                                    dashboardId={dashboardId}
                                                    workspaceUsers={workspaceUsers}
                                                />
                                            </>
                                        )}
                                    </SortableReportWrapper>
                                ))}
                            </motion.div>
                        </SortableContext>
                        <DragOverlay>
                            {activeId ? (
                                <div className="p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 opacity-80">
                                    Drag Item
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>
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

function SortableReportWrapper({ id, className, children }: any) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className={className} {...attributes}>
            {typeof children === 'function' ? children(listeners) : children}
        </div>
    );
}
