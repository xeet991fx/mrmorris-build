"use client";

import React, { useEffect, useState, useMemo, useRef, useId } from "react";
import { getReportData } from "@/lib/api/reportDashboards";
import { adaptReportData } from "@/lib/reportDataAdapters";
import { formatDistanceToNow } from "date-fns";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine
} from "recharts";
import { motion } from "framer-motion";
import {
    ArrowTrendingUpIcon, ArrowTrendingDownIcon,
    TrashIcon, MinusIcon, PencilIcon,
    EllipsisVerticalIcon,
    DocumentDuplicateIcon,
    ArrowsPointingOutIcon,
    CameraIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import DrillDownPanel from "./DrillDownPanel";
import CalculatedValuesTable from "./CalculatedValuesTable";

// ... (existing imports)


interface ReportWidgetProps {
    report: {
        _id?: string;
        type: string;
        title: string;
        chartType: string;
        config: any;
        definition?: any;
        note?: string;
        position: { x: number; y: number; w: number; h: number };
    };
    workspaceId: string;
    onEdit?: (report: any) => void;
    onRemove?: (reportId: string) => void;
    onDuplicate?: (reportId: string) => void;
    onFullscreen?: (report: any) => void;
    onNoteUpdate?: (reportId: string, note: string) => void;
    // P0: Dashboard-level controls
    dateRangeOverride?: string;
    comparisonEnabled?: boolean;
    refreshKey?: number;
    dashboardFilters?: { key: string; value: string; label: string }[];
    // P1: Resize
    resizable?: boolean;
    onResize?: (reportId: string, newSize: { w: number; h: number }) => void;
}

export default function ReportWidget({ report, workspaceId, onEdit, onRemove, onDuplicate, onFullscreen, onNoteUpdate, dateRangeOverride, comparisonEnabled, refreshKey, dashboardFilters, resizable, onResize }: ReportWidgetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [drillDownContext, setDrillDownContext] = useState<any>(null);
    const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const widgetRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const widgetId = useId();
    const [editingNote, setEditingNote] = useState(false);
    const [noteText, setNoteText] = useState(report.note || "");

    const configKey = useMemo(() => JSON.stringify(report.config), [report.config]);
    const definitionKey = useMemo(() => JSON.stringify(report.definition), [report.definition]);

    // Merge dashboard-level overrides into config
    const effectiveConfig = useMemo(() => {
        const cfg = { ...report.config };
        if (dateRangeOverride) cfg.period = dateRangeOverride;
        if (comparisonEnabled) cfg.comparison = true;
        if (dashboardFilters && dashboardFilters.length > 0) {
            cfg.dashboardFilters = dashboardFilters;
        }
        return cfg;
    }, [report.config, dateRangeOverride, comparisonEnabled, dashboardFilters]);
    const effectiveConfigKey = useMemo(() => JSON.stringify(effectiveConfig), [effectiveConfig]);

    const loadData = async (showSpinner = true) => {
        try {
            if (showSpinner) setLoading(true);
            setIsRefreshing(true);
            setError(false);
            const result = await getReportData(workspaceId, report.type, effectiveConfig, report.definition);
            const adaptedData = adaptReportData(
                result.data,
                report.chartType,
                report.type,
                report.definition
            );
            setData(adaptedData);
            setLastFetchedAt(new Date());
        } catch (err) {
            console.error("Error loading report:", err);
            setError(true);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [workspaceId, report.type, effectiveConfigKey, definitionKey]);

    // Re-fetch when dashboard refreshKey bumps
    useEffect(() => {
        if (refreshKey && refreshKey > 0) {
            loadData(false); // silent refresh — no full spinner
        }
    }, [refreshKey]);

    useEffect(() => {
        if (!showMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showMenu]);

    const handleDownloadAsImage = async () => {
        setShowMenu(false);
        if (!widgetRef.current) return;
        try {
            const html2canvas = (await import("html2canvas")).default;
            const canvas = await html2canvas(widgetRef.current, {
                backgroundColor: null,
                scale: 2,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedNode = clonedDoc.getElementById(widgetId);
                    if (clonedNode) {
                        // Reset framer-motion transforms
                        clonedNode.style.transform = "none";
                        // Expand height to fit content
                        clonedNode.style.height = "auto";
                        clonedNode.style.maxHeight = "none";
                        clonedNode.style.overflow = "visible";

                        // Expand scrollable areas inside
                        const scrollables = clonedNode.querySelectorAll(".overflow-auto");
                        scrollables.forEach((el) => {
                            (el as HTMLElement).style.overflow = "visible";
                            (el as HTMLElement).style.height = "auto";
                        });
                    }
                }
            });
            const link = document.createElement("a");
            link.download = `${report.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.png`;
            link.href = canvas.toDataURL("image/png");
            link.click();
        } catch (err) {
            console.error("Failed to capture report image:", err);
        }
    };

    const handleDrillDown = (context: any) => {
        if (report.definition) {
            setDrillDownContext({ ...context, metricLabel: report.title });
        }
    };

    const renderChart = () => {
        if (loading) return <div className="flex items-center justify-center h-full"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
        if (error) return <div className="flex items-center justify-center h-full text-xs text-red-400">Failed to load</div>;
        return renderReportChart(data, report, handleDrillDown);
    };

    const colSpan = report.position?.w || 2;
    const rowSpan = report.position?.h || 1;

    return (
        <motion.div
            id={widgetId}
            ref={widgetRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden group relative`}
            style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                minHeight: rowSpan === 1 ? "120px" : rowSpan === 2 ? "280px" : "400px",
            }}
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors" onClick={() => onFullscreen?.(report)}>
                        {report.title}
                    </h3>
                    {lastFetchedAt && (
                        <span className="text-[10px] text-zinc-400">
                            Updated {formatDistanceToNow(lastFetchedAt)} ago
                            {dateRangeOverride && (
                                <span className="ml-1 text-emerald-500">• filtered</span>
                            )}
                            {comparisonEnabled && (
                                <span className="ml-1 text-blue-500">• comparing</span>
                            )}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Individual Refresh */}
                    <button
                        onClick={() => loadData(false)}
                        className={`p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Refresh this report"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                    </button>
                    {onEdit && report.definition && (
                        <button onClick={() => onEdit(report)} className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-zinc-400 hover:text-blue-500 transition-colors">
                            <PencilIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {onFullscreen && (
                        <button onClick={() => onFullscreen(report)} className="p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            <ArrowsPointingOutIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <div className="relative" ref={menuRef}>
                        <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-zinc-200/60 dark:hover:bg-zinc-700/40 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                            <EllipsisVerticalIcon className="w-3.5 h-3.5" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 py-1 z-20">
                                {onDuplicate && report._id && (
                                    <button onClick={() => { setShowMenu(false); onDuplicate(report._id!); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
                                        <DocumentDuplicateIcon className="w-3.5 h-3.5" /> Duplicate
                                    </button>
                                )}
                                <button onClick={handleDownloadAsImage} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-colors">
                                    <CameraIcon className="w-3.5 h-3.5" /> Download as image
                                </button>
                                {onRemove && report._id && (
                                    <>
                                        <div className="border-t border-zinc-200 dark:border-zinc-700 my-1" />
                                        <button onClick={() => { setShowMenu(false); onRemove(report._id!); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <TrashIcon className="w-3.5 h-3.5" /> Delete report
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="px-2 py-1" style={{ height: rowSpan === 1 ? "80px" : rowSpan === 2 ? "230px" : "350px" }}>
                {renderChart()}
            </div>

            {!loading && !error && data && (
                <CalculatedValuesTable data={data} reportType={report.type} title={report.title} />
            )}

            {/* Inline note annotation */}
            {onNoteUpdate && report._id && (
                <div className="px-3 pb-1.5">
                    {editingNote ? (
                        <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            onBlur={() => {
                                setEditingNote(false);
                                if (noteText !== (report.note || "")) {
                                    onNoteUpdate(report._id!, noteText);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    setEditingNote(false);
                                    if (noteText !== (report.note || "")) {
                                        onNoteUpdate(report._id!, noteText);
                                    }
                                }
                            }}
                            autoFocus
                            maxLength={300}
                            placeholder="Add a note…"
                            className="w-full text-[11px] text-zinc-500 dark:text-zinc-400 bg-transparent border-b border-emerald-500 outline-none py-0.5"
                        />
                    ) : (
                        <p
                            className="text-[11px] text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors truncate opacity-0 group-hover:opacity-100"
                            style={report.note ? { opacity: 1 } : undefined}
                            onClick={() => { setNoteText(report.note || ""); setEditingNote(true); }}
                        >
                            {report.note || <span className="italic">Add a note…</span>}
                        </p>
                    )}
                </div>
            )}

            {drillDownContext && (
                <DrillDownPanel
                    isOpen={!!drillDownContext}
                    onClose={() => setDrillDownContext(null)}
                    workspaceId={workspaceId}
                    definition={report.definition}
                    context={drillDownContext}
                />
            )}

            {/* Resize handles */}
            {resizable && report._id && onResize && (
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 py-1.5 bg-gradient-to-t from-zinc-100 dark:from-zinc-800 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => {
                            const nextW = colSpan >= 4 ? 1 : colSpan + 1;
                            onResize(report._id!, { w: nextW, h: rowSpan });
                        }}
                        className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    >
                        Width: {colSpan}→{colSpan >= 4 ? 1 : colSpan + 1}
                    </button>
                    <button
                        onClick={() => {
                            const nextH = rowSpan >= 3 ? 1 : rowSpan + 1;
                            onResize(report._id!, { w: colSpan, h: nextH });
                        }}
                        className="px-2 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
                    >
                        Height: {rowSpan}→{rowSpan >= 3 ? 1 : rowSpan + 1}
                    </button>
                </div>
            )}
        </motion.div>
    );
}

/**
 * Exported chart renderer for use in fullscreen modal.
 * Renders the appropriate chart for a given report.
 */
export function renderReportChart(data: any, report: any, onDrillDown?: (context: any) => void): React.ReactNode {
    if (!data) return <EmptyState />;

    // Helper to wrap onDrillDown
    const handleDrillDown = (data: any, index?: number) => {
        if (!onDrillDown) return;
        let context: any = {};

        // Handle Recharts payload structure
        const payload = data?.payload || data;

        // Priority 1: Custom Report Dimension/Segment
        if (payload.dimension) context.groupByValue = payload.dimension;
        if (payload.segment) context.segmentByValue = payload.segment;

        // Priority 2: Standard fields (fallback)
        if (!context.groupByValue) {
            if (payload.name) context.groupByValue = payload.name;
            if (payload.period) context.groupByValue = payload.period;
            if (payload.stage) context.groupByValue = payload.stage;
        }

        onDrillDown(context);
    };

    // Special email report types use report.type instead of report.chartType
    if (report.type === "email_engagement_deep_dive") return <EmailEngagementDeepDiveWidget data={data} />;
    if (report.type === "email_reply_analysis") return <EmailReplyAnalysisWidget data={data} />;
    if (report.type === "email_open_heatmap") return <EmailOpenHeatmapWidget data={data} />;
    if (report.type === "email_contact_engagement") return <EmailContactEngagementWidget data={data} />;

    // Cross-entity email intelligence reports
    if (report.type === "email_revenue_attribution") return <EmailRevenueAttributionWidget data={data} />;
    if (report.type === "email_lifecycle_acceleration") return <EmailLifecycleAccelerationWidget data={data} />;
    if (report.type === "campaign_comparison") return <CampaignComparisonWidget data={data} />;
    if (report.type === "sequence_step_funnel") return <SequenceStepFunnelWidget data={data} />;
    if (report.type === "deliverability_health") return <DeliverabilityHealthWidget data={data} />;
    if (report.type === "engagement_decay") return <EngagementDecayWidget data={data} />;

    switch (report.chartType) {
        case "number": return <NumberCard data={data} />;
        case "bar": return <BarChartWidget data={data} type={report.type} config={report.config} onDrillDown={onDrillDown ? handleDrillDown : undefined} />;
        case "line": return <LineChartWidget data={data} type={report.type} config={report.config} onDrillDown={onDrillDown ? handleDrillDown : undefined} />;
        case "pie": return <PieChartWidget data={data} type={report.type} config={report.config} onDrillDown={onDrillDown ? handleDrillDown : undefined} />;
        case "funnel": return <FunnelWidget data={data} onDrillDown={onDrillDown ? handleDrillDown : undefined} />;
        case "table": return <TableWidget data={data} type={report.type} />;
        default: return <EmptyState />;
    }
}

// ─── Chart Colors ──────────────────────────────────────────────

const COLORS = [
    "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
    "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

const STAGE_COLORS: Record<string, string> = {
    lead: "#94a3b8",
    qualified: "#3b82f6",
    proposal: "#f59e0b",
    negotiation: "#8b5cf6",
    closed_won: "#10b981",
    closed_lost: "#ef4444",
};

// ─── Change Indicator ──────────────────────────────────────────

function ChangeIndicator({ change, suffix = "%" }: { change: number | undefined; suffix?: string }) {
    if (change === undefined || change === null) return null;
    const isPositive = change > 0;
    const isNeutral = change === 0;

    if (isNeutral) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-400">
                <MinusIcon className="w-3 h-3" /> 0{suffix}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
            {isPositive ? (
                <ArrowTrendingUpIcon className="w-3 h-3" />
            ) : (
                <ArrowTrendingDownIcon className="w-3 h-3" />
            )}
            {isPositive ? "+" : ""}{change}{suffix}
        </span>
    );
}

// ─── Number Card — Now with change indicator ───────────────────

function NumberCard({ data }: { data: any }) {
    if (!data) return null;

    const formatValue = (value: number, format: string) => {
        if (format === "currency") {
            return value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` :
                value >= 1000 ? `$${(value / 1000).toFixed(1)}K` : `$${value}`;
        }
        if (format === "percent") return `${value}%`;
        return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString();
    };

    return (
        <div className="flex flex-col items-center justify-center h-full py-4">
            <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                {formatValue(data.value, data.format)}
            </p>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{data.label}</p>
                {data.change !== undefined && (
                    <ChangeIndicator
                        change={data.change}
                        suffix={data.format === "percent" ? "pp" : "%"}
                    />
                )}
            </div>
            {/* Secondary stats */}
            {(data.dealCount !== undefined || data.avgDealSize !== undefined || data.newThisPeriod !== undefined) && (
                <div className="flex items-center gap-3 mt-2">
                    {data.dealCount !== undefined && (
                        <span className="text-[10px] text-zinc-400">{data.dealCount} deals</span>
                    )}
                    {data.avgDealSize !== undefined && (
                        <span className="text-[10px] text-zinc-400">Avg ${(data.avgDealSize / 1000).toFixed(1)}K</span>
                    )}
                    {data.newThisPeriod !== undefined && (
                        <span className="text-[10px] text-zinc-400">+{data.newThisPeriod} new</span>
                    )}
                    {data.wonDeals !== undefined && (
                        <span className="text-[10px] text-zinc-400">{data.wonDeals} won</span>
                    )}
                    {data.dealsWon !== undefined && (
                        <span className="text-[10px] text-zinc-400">{data.dealsWon} closed</span>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Bar Chart Widget ──────────────────────────────────────────

function BarChartWidget({ data, type, config = {}, onDrillDown }: { data: any; type: string; config?: any; onDrillDown?: (data: any) => void }) {
    if (!data) return null;

    let chartData: any[] = [];
    let xKey = "name";
    let yKey = "value";

    // Handle adapted custom report data
    if (data.data && Array.isArray(data.data)) {
        chartData = data.data;
        xKey = "name";
        yKey = "value";
    } else if (type === "funnel" && data.stages) {
        chartData = data.stages;
        xKey = "stage";
        yKey = "count";
    } else if (type === "time_in_stage" && data.stages) {
        chartData = data.stages;
        xKey = "stage";
    } else if (type === "stage_changed" && data.transitions) {
        chartData = data.transitions;
        xKey = "stage";
        yKey = "count";
    } else if (type === "email" && data.periods) {
        chartData = data.periods;
        xKey = "period";
        yKey = "sent";
    } else if (type === "forecast") {
        chartData = [
            { name: "Already Won", value: data.alreadyWon || 0 },
            { name: "Committed", value: data.committed || 0 },
            { name: "Upside", value: data.upside || 0 },
            { name: "Weighted", value: data.weighted || 0 },
            { name: "Best Case", value: data.bestCase || 0 },
        ];
        if (data.target) {
            chartData.push({ name: "Target", value: data.target });
        }
    } else if (data.periods) {
        chartData = data.periods;
        xKey = "period";
    } else if (data.sources) {
        chartData = data.sources;
        xKey = "name";
        yKey = "count";
    }

    if (chartData.length === 0) return <EmptyState />;

    // Apply sort order from config
    if (config.sortOrder && chartData.length > 0) {
        const sortedData = [...chartData];
        if (config.sortOrder === "value_desc") {
            sortedData.sort((a, b) => (b[yKey] || 0) - (a[yKey] || 0));
        } else if (config.sortOrder === "value_asc") {
            sortedData.sort((a, b) => (a[yKey] || 0) - (b[yKey] || 0));
        } else if (config.sortOrder === "dimension_asc") {
            sortedData.sort((a, b) => String(a[xKey] || "").localeCompare(String(b[xKey] || "")));
        }
        chartData = sortedData;
    }

    // Detect segmented data (multiple series)
    const segmentKeys = chartData.length > 0
        ? Object.keys(chartData[0]).filter(k => k !== xKey && k !== "name" && !k.endsWith("_count"))
        : [];
    const isSegmented = segmentKeys.length > 1 || (segmentKeys.length === 1 && segmentKeys[0] !== yKey);

    return (
        <div className="h-full flex flex-col">
            {/* Summary bar above chart */}
            {data.summary && (
                <div className="flex items-center gap-3 px-1 pb-1.5 text-[10px] text-zinc-500">
                    {data.summary.total !== undefined && (
                        <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">
                            {typeof data.summary.total === "number" && data.summary.total >= 1000
                                ? `${(data.summary.total / 1000).toFixed(1)}K`
                                : data.summary.total}
                        </strong></span>
                    )}
                    {data.summary.change !== undefined && (
                        <ChangeIndicator change={data.summary.change} />
                    )}
                    {data.summary.trend && (
                        <span className={`capitalize ${data.summary.trend === "up" ? "text-emerald-500" : data.summary.trend === "down" ? "text-red-500" : "text-zinc-400"}`}>
                            {data.summary.trend}
                        </span>
                    )}
                    {data.summary.overallConversion !== undefined && (
                        <span>Conv: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.overallConversion}%</strong></span>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #27272a)" opacity={0.3} />
                        <XAxis
                            dataKey={xKey}
                            tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => v?.length > 8 ? v.slice(0, 8) + "…" : v}
                        />
                        <YAxis
                            tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid #3f3f46",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#fafafa",
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: "10px" }} />
                        {config.targetLine !== undefined && (
                            <ReferenceLine
                                y={config.targetLine}
                                stroke="#ef4444"
                                strokeDasharray="3 3"
                                strokeWidth={1.5}
                                label={{ value: `Target: ${config.targetLine}`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
                            />
                        )}
                        {isSegmented ? (
                            // Render stacked or grouped bars for segmented data
                            segmentKeys.map((segmentKey, idx) => (
                                <Bar
                                    key={segmentKey}
                                    dataKey={segmentKey}
                                    stackId={config.stackedBars !== false ? "a" : undefined}
                                    fill={COLORS[idx % COLORS.length]}
                                    radius={idx === segmentKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                                    onClick={onDrillDown}
                                    cursor={onDrillDown ? "pointer" : "default"}
                                />
                            ))
                        ) : (
                            // Render single bar for non-segmented data
                            <Bar dataKey={yKey} radius={[4, 4, 0, 0]} onClick={onDrillDown} cursor={onDrillDown ? "pointer" : "default"}>
                                {chartData.map((_, i) => (
                                    <Cell key={i} fill={STAGE_COLORS[chartData[i]?.[xKey]] || COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Line Chart Widget — Now with moving average ───────────────

function LineChartWidget({ data, type, config = {}, onDrillDown }: { data: any; type: string; config?: any; onDrillDown?: (data: any) => void }) {
    if (!data) return null;

    let chartData: any[] = [];
    const hasPeriodComparison = data.previousPeriods && Array.isArray(data.previousPeriods);

    if (data.periods) {
        chartData = data.periods;
    }

    // If period comparison is enabled, merge current and previous data
    if (hasPeriodComparison) {
        // Create a map of periods to combine current and previous data
        const periodMap = new Map();

        // Add current period data
        chartData.forEach(item => {
            periodMap.set(item.period, {
                period: item.period,
                current: item.value || 0,
                currentCount: item.count || 0
            });
        });

        // Add previous period data
        data.previousPeriods.forEach((item: any) => {
            const existing = periodMap.get(item.period);
            if (existing) {
                existing.previous = item.value || 0;
                existing.previousCount = item.count || 0;
            } else {
                periodMap.set(item.period, {
                    period: item.period,
                    previous: item.value || 0,
                    previousCount: item.count || 0
                });
            }
        });

        chartData = Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period));
    }

    if (chartData.length === 0) return <EmptyState />;

    const hasMovingAvg = chartData.some((d) => d.movingAvg !== undefined);

    // Detect segmented data (multiple series)
    const segmentKeys = chartData.length > 0
        ? Object.keys(chartData[0]).filter(k => k !== "period" && k !== "value" && k !== "count" && k !== "movingAvg" && k !== "current" && k !== "previous" && k !== "currentCount" && k !== "previousCount" && !k.endsWith("_count"))
        : [];
    const isSegmented = segmentKeys.length > 0 && !hasPeriodComparison;

    return (
        <div className="h-full flex flex-col">
            {(data.summary || data.percentChange !== undefined) && (
                <div className="flex items-center gap-3 px-1 pb-1.5 text-[10px] text-zinc-500">
                    {data.summary?.total !== undefined && (
                        <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">
                            {data.summary.total >= 1000 ? `${(data.summary.total / 1000).toFixed(1)}K` : data.summary.total}
                        </strong></span>
                    )}
                    {data.summary?.change !== undefined && <ChangeIndicator change={data.summary.change} />}
                    {data.percentChange !== undefined && (
                        <span className="flex items-center gap-1">
                            vs. Previous: <ChangeIndicator change={data.percentChange} />
                        </span>
                    )}
                    {data.summary?.avgPerPeriod !== undefined && (
                        <span>Avg: <strong className="text-zinc-700 dark:text-zinc-300">
                            {data.summary.avgPerPeriod >= 1000 ? `${(data.summary.avgPerPeriod / 1000).toFixed(1)}K` : data.summary.avgPerPeriod}
                        </strong>/mo</span>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    {isSegmented ? (
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                            <XAxis
                                dataKey="period"
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#18181b",
                                    border: "1px solid #3f3f46",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    color: "#fafafa",
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            {config.targetLine !== undefined && (
                                <ReferenceLine
                                    y={config.targetLine}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                    label={{ value: `Target: ${config.targetLine}`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
                                />
                            )}
                            {segmentKeys.map((segmentKey, idx) => (
                                <Line
                                    key={segmentKey}
                                    type="monotone"
                                    dataKey={segmentKey}
                                    stroke={COLORS[idx % COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ onClick: (e: any, payload: any) => onDrillDown?.(payload.payload), r: 6, cursor: "pointer" }}
                                />
                            ))}
                        </LineChart>
                    ) : hasPeriodComparison ? (
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                            <XAxis
                                dataKey="period"
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#18181b",
                                    border: "1px solid #3f3f46",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    color: "#fafafa",
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: "10px" }} />
                            {config.targetLine !== undefined && (
                                <ReferenceLine
                                    y={config.targetLine}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                    label={{ value: `Target: ${config.targetLine}`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
                                />
                            )}
                            <Line
                                type="monotone"
                                dataKey="current"
                                name="Current Period"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ onClick: (e: any, payload: any) => onDrillDown?.(payload.payload), r: 6, cursor: "pointer" }}
                            />
                            <Line
                                type="monotone"
                                dataKey="previous"
                                name="Previous Period"
                                stroke="#a1a1aa"
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={{ onClick: (e: any, payload: any) => onDrillDown?.(payload.payload), r: 6, cursor: "pointer" }}
                            />
                        </LineChart>
                    ) : (
                        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                            <XAxis
                                dataKey="period"
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={config.showAxisLabels !== false ? { fontSize: 10, fill: "#a1a1aa" } : false}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#18181b",
                                    border: "1px solid #3f3f46",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                    color: "#fafafa",
                                }}
                            />
                            {config.targetLine !== undefined && (
                                <ReferenceLine
                                    y={config.targetLine}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    strokeWidth={1.5}
                                    label={{ value: `Target: ${config.targetLine}`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
                                />
                            )}
                            <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorValue)"
                                onClick={onDrillDown}
                                cursor={onDrillDown ? "pointer" : "default"}
                            />
                            {hasMovingAvg && (
                                <Line type="monotone" dataKey="movingAvg" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                            )}
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Pie Chart Widget — With percentages ───────────────────────

function PieChartWidget({ data, type, config = {}, onDrillDown }: { data: any; type: string; config?: any; onDrillDown?: (data: any) => void }) {
    if (!data) return null;

    let chartData: any[] = [];

    // Handle adapted custom report data
    if (data.data && Array.isArray(data.data)) {
        chartData = data.data;
    } else if (data.sources) {
        chartData = data.sources;
    } else if (data.stages) {
        chartData = data.stages;
    }

    if (chartData.length === 0) return <EmptyState />;

    // Apply sort order from config
    if (config.sortOrder && chartData.length > 0) {
        const sortedData = [...chartData];
        const valueKey = chartData[0].count !== undefined ? "count" : "value";
        const nameKey = chartData[0].name !== undefined ? "name" : "stage";

        if (config.sortOrder === "value_desc") {
            sortedData.sort((a, b) => (b[valueKey] || 0) - (a[valueKey] || 0));
        } else if (config.sortOrder === "value_asc") {
            sortedData.sort((a, b) => (a[valueKey] || 0) - (b[valueKey] || 0));
        } else if (config.sortOrder === "dimension_asc") {
            sortedData.sort((a, b) => String(a[nameKey] || "").localeCompare(String(b[nameKey] || "")));
        }
        chartData = sortedData;
    }

    return (
        <div className="h-full flex flex-col">
            {data.summary && (
                <div className="flex items-center gap-3 px-1 pb-1 text-[10px] text-zinc-500">
                    <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.totalContacts}</strong></span>
                    <span>Sources: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.uniqueSources}</strong></span>
                </div>
            )}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius="55%"
                            outerRadius="80%"
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percentage }: any) =>
                                percentage ? `${name} ${percentage}%` : name
                            }
                        >
                            {chartData.map((_: any, i: number) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} onClick={onDrillDown ? (e) => onDrillDown(chartData[i]) : undefined} style={{ cursor: onDrillDown ? "pointer" : "default" }} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid #3f3f46",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#fafafa",
                            }}
                            formatter={(value: any, name: string, entry: any) => {
                                const item = entry.payload;
                                const parts = [`${value} contacts`];
                                if (item.conversionRate !== undefined) parts.push(`${item.conversionRate}% → deals`);
                                return [parts.join(" · "), name];
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Funnel Chart Widget — With conversion rates ───────────────

function FunnelWidget({ data, onDrillDown }: { data: any; onDrillDown?: (data: any) => void }) {
    if (!data?.stages || data.stages.length === 0) return <EmptyState />;

    const maxCount = Math.max(...data.stages.map((s: any) => s.count));

    return (
        <div className="flex flex-col h-full">
            {data.summary && (
                <div className="flex items-center gap-3 px-2 pb-1.5 text-[10px] text-zinc-500">
                    <span>Deals: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.totalDeals}</strong></span>
                    <span>Conv: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.overallConversion}%</strong></span>
                    <span>Lost: <strong className="text-red-500">{data.summary.lostCount}</strong></span>
                </div>
            )}
            <div className="flex flex-col gap-1.5 flex-1 justify-center px-2">
                {data.stages.map((stage: any, i: number) => {
                    const width = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                    return (
                        <div key={stage.stage} className={`flex items-center gap-2 ${onDrillDown ? "cursor-pointer group" : ""}`} onClick={() => onDrillDown?.(stage)}>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 w-20 truncate text-right capitalize">
                                {stage.stage.replace(/_/g, " ")}
                            </span>
                            <div className="flex-1 h-6 bg-zinc-100 dark:bg-zinc-800 rounded-md overflow-hidden relative">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${width}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                    className="h-full rounded-md"
                                    style={{ backgroundColor: STAGE_COLORS[stage.stage] || COLORS[i] }}
                                />
                                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
                                    {stage.count} · ${stage.value >= 1000 ? `${(stage.value / 1000).toFixed(0)}K` : stage.value}
                                    {stage.conversionRate !== undefined && (
                                        <span className="ml-1 text-zinc-400">({stage.conversionRate}%)</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Table Widget — With risk levels + win rates ───────────────

function TableWidget({ data, type }: { data: any; type: string }) {
    if (!data) return null;

    if (type === "top_performers" && data.performers) {
        if (data.performers.length === 0) return <EmptyState />;
        return (
            <div className="overflow-auto h-full">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                            <th className="text-left py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">#</th>
                            <th className="text-left py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Name</th>
                            <th className="text-right py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Deals</th>
                            <th className="text-right py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Revenue</th>
                            <th className="text-right py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Win %</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.performers.map((p: any, i: number) => (
                            <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                <td className="py-1.5 px-2 text-zinc-400">{p.rank || i + 1}</td>
                                <td className="py-1.5 px-2 text-zinc-900 dark:text-white font-medium">{p.name}</td>
                                <td className="py-1.5 px-2 text-right text-zinc-600 dark:text-zinc-300">{p.deals || p.sent || 0}</td>
                                <td className="py-1.5 px-2 text-right text-emerald-600 dark:text-emerald-400">
                                    {p.revenue !== undefined ? `$${(p.revenue / 1000).toFixed(1)}K` : `${p.opened || 0} opens`}
                                </td>
                                <td className="py-1.5 px-2 text-right">
                                    {p.winRate !== undefined ? (
                                        <span className={p.winRate >= 50 ? "text-emerald-500" : p.winRate >= 25 ? "text-amber-500" : "text-red-500"}>
                                            {p.winRate}%
                                        </span>
                                    ) : p.openRate !== undefined ? (
                                        <span className="text-zinc-500">{p.openRate}%</span>
                                    ) : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }

    if (type === "at_risk" && data.deals) {
        if (data.deals.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-sm text-emerald-500">
                    ✅ No at-risk deals
                </div>
            );
        }

        const riskColor = (level: string) => {
            if (level === "high") return "bg-red-500";
            if (level === "medium") return "bg-amber-500";
            return "bg-zinc-400";
        };

        return (
            <div className="h-full flex flex-col">
                {data.summary && (
                    <div className="flex items-center gap-3 px-2 py-1 text-[10px] text-zinc-500 border-b border-zinc-200/50 dark:border-zinc-700/50">
                        <span>At risk: <strong className="text-red-500">{data.summary.totalAtRisk}</strong></span>
                        <span>High: <strong className="text-red-500">{data.summary.highRisk}</strong></span>
                        <span>Value: <strong className="text-zinc-700 dark:text-zinc-300">${(data.summary.totalValueAtRisk / 1000).toFixed(1)}K</strong></span>
                    </div>
                )}
                <div className="overflow-auto flex-1">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                <th className="text-left py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Deal</th>
                                <th className="text-right py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Value</th>
                                <th className="text-right py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Risk</th>
                                <th className="text-center py-1.5 px-2 text-zinc-500 dark:text-zinc-400 font-medium">Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.deals.map((d: any, i: number) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 group/row">
                                    <td className="py-1.5 px-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskColor(d.riskLevel)}`} />
                                            <span className="text-zinc-900 dark:text-white font-medium truncate max-w-[120px]">{d.name}</span>
                                        </div>
                                        {d.riskFactors?.[0] && (
                                            <p className="text-[9px] text-zinc-400 ml-3 truncate">{d.riskFactors[0]}</p>
                                        )}
                                    </td>
                                    <td className="py-1.5 px-2 text-right text-zinc-600 dark:text-zinc-300">
                                        ${d.value >= 1000 ? `${(d.value / 1000).toFixed(1)}K` : d.value}
                                    </td>
                                    <td className="py-1.5 px-2 text-right">
                                        <span className={`capitalize text-[10px] px-1.5 py-0.5 rounded-full font-medium ${d.riskLevel === "high" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                            d.riskLevel === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                                "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                            }`}>
                                            {d.riskLevel}
                                        </span>
                                    </td>
                                    <td className="py-1.5 px-2 text-center">
                                        <span className={`font-mono text-[10px] font-bold ${d.riskScore >= 50 ? "text-red-500" : d.riskScore >= 25 ? "text-amber-500" : "text-zinc-400"
                                            }`}>
                                            {d.riskScore}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return <EmptyState />;
}

// ─── Email Engagement Deep Dive Widget ─────────────────────────

function EmailEngagementDeepDiveWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="overflow-auto h-full space-y-4 p-2">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-2">
                {[
                    { label: "Sent", value: data.summary?.totalSent || 0, color: "text-zinc-700 dark:text-zinc-300" },
                    { label: "Open Rate", value: `${data.summary?.openRate || 0}%`, color: "text-emerald-600" },
                    { label: "Reply Rate", value: `${data.summary?.replyRate || 0}%`, color: "text-blue-600" },
                    { label: "Avg Opens", value: data.summary?.avgOpenCount || 0, color: "text-violet-600" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-800 rounded-lg p-2 text-center border border-zinc-200/50 dark:border-zinc-700/50">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-zinc-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Geo Breakdown */}
            {data.geoBreakdown?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">📍 Open Locations</h4>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Location</th>
                                <th className="text-right py-1 px-1.5 text-zinc-500 font-medium">Opens</th>
                                <th className="text-right py-1 px-1.5 text-zinc-500 font-medium">Emails</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.geoBreakdown.slice(0, 8).map((g: any, i: number) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-1 px-1.5 text-zinc-700 dark:text-zinc-300">
                                        {g.countryCode && <span className="mr-1">{getFlagEmoji(g.countryCode)}</span>}
                                        {g.city ? `${g.city}, ${g.country}` : g.country}
                                    </td>
                                    <td className="py-1 px-1.5 text-right text-zinc-600 dark:text-zinc-400">{g.opens}</td>
                                    <td className="py-1 px-1.5 text-right text-zinc-500">{g.uniqueEmails}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Device Breakdown */}
            {data.deviceBreakdown?.devices?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">📱 Device Breakdown</h4>
                    <div className="flex gap-3">
                        {data.deviceBreakdown.devices.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                <span className="text-[10px] text-zinc-600 dark:text-zinc-400 capitalize">{d.name} ({d.percentage}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Response Time */}
            {data.responseTime && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">⏱️ Response Time</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-1.5">
                            <p className="text-zinc-500">Avg time to open</p>
                            <p className="font-semibold text-zinc-700 dark:text-zinc-300">{data.responseTime.avgTimeToOpenHrs}h</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-1.5">
                            <p className="text-zinc-500">Open within 1h</p>
                            <p className="font-semibold text-emerald-600">{data.responseTime.openWithin1hPct}%</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-1.5">
                            <p className="text-zinc-500">Avg time to reply</p>
                            <p className="font-semibold text-zinc-700 dark:text-zinc-300">{data.responseTime.avgTimeToReplyHrs}h</p>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-1.5">
                            <p className="text-zinc-500">Reply within 1h</p>
                            <p className="font-semibold text-blue-600">{data.responseTime.replyWithin1hPct}%</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Frequency */}
            {data.openFrequency?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">🔄 Open Frequency</h4>
                    <div className="space-y-1">
                        {data.openFrequency.map((b: any, i: number) => {
                            const maxCount = Math.max(...data.openFrequency.map((x: any) => x.count));
                            const width = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
                            return (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 w-20 text-right">{b.bucket}</span>
                                    <div className="flex-1 h-4 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                        <div className="h-full rounded" style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                    </div>
                                    <span className="text-[10px] text-zinc-500 w-8 text-right">{b.count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Email Reply Analysis Widget ───────────────────────────────

function EmailReplyAnalysisWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="overflow-auto h-full space-y-4 p-2">
            {/* Reply Geo Location */}
            {data.replyGeoLocation?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">🌍 Reply Locations</h4>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Location</th>
                                <th className="text-right py-1 px-1.5 text-zinc-500 font-medium">Replies</th>
                                <th className="text-right py-1 px-1.5 text-zinc-500 font-medium">Timezone</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.replyGeoLocation.map((g: any, i: number) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-1 px-1.5 text-zinc-700 dark:text-zinc-300">
                                        {g.countryCode && <span className="mr-1">{getFlagEmoji(g.countryCode)}</span>}
                                        {g.city ? `${g.city}, ${g.country}` : g.country}
                                    </td>
                                    <td className="py-1 px-1.5 text-right font-medium text-blue-600">{g.replies}</td>
                                    <td className="py-1 px-1.5 text-right text-zinc-500 text-[10px]">{g.timezone || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reply Timing */}
            {data.replyTiming && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">
                        ⏰ Reply Patterns
                        <span className="ml-2 font-normal text-zinc-400">Peak: {data.replyTiming.peakDay} at {data.replyTiming.peakHour}</span>
                    </h4>
                    <div className="flex gap-0.5">
                        {data.replyTiming.byHour?.map((h: any) => {
                            const maxH = Math.max(...data.replyTiming.byHour.map((x: any) => x.count), 1);
                            const opacity = h.count > 0 ? Math.max(0.15, h.count / maxH) : 0.05;
                            return (
                                <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5" title={`${h.label}: ${h.count} replies`}>
                                    <div className="w-full h-6 rounded-sm" style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }} />
                                    {h.hour % 6 === 0 && <span className="text-[8px] text-zinc-400">{h.label.replace(':00', '')}</span>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex gap-2 mt-1.5">
                        {data.replyTiming.byDayOfWeek?.map((d: any) => (
                            <div key={d.day} className="text-center">
                                <span className="text-[9px] text-zinc-500 block">{d.dayName}</span>
                                <span className="text-[10px] font-semibold text-zinc-700 dark:text-zinc-300">{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Time to Reply */}
            {data.timeToReply && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">📊 Time to Reply</h4>
                    <div className="flex gap-4 mb-2">
                        <div className="text-center">
                            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">{data.timeToReply.avgTime}</p>
                            <p className="text-[9px] text-zinc-500">Average</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-emerald-600">{data.timeToReply.fastestTime}</p>
                            <p className="text-[9px] text-zinc-500">Fastest</p>
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-bold text-amber-600">{data.timeToReply.slowestTime}</p>
                            <p className="text-[9px] text-zinc-500">Slowest</p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        {data.timeToReply.distribution?.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 w-24 text-right">{d.label}</span>
                                <div className="flex-1 h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                    <div className="h-full rounded bg-blue-500" style={{ width: `${d.pct}%` }} />
                                </div>
                                <span className="text-[10px] text-zinc-500 w-12 text-right">{d.count} ({d.pct}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sentiment */}
            {data.sentiment?.data?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">💬 Reply Sentiment</h4>
                    <div className="flex gap-2">
                        {data.sentiment.data.map((s: any, i: number) => {
                            const sentimentColors: Record<string, string> = {
                                positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                                neutral: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",
                                negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                out_of_office: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                                unsubscribe: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
                            };
                            return (
                                <div key={i} className={`px-2 py-1 rounded-full text-[10px] font-medium ${sentimentColors[s.sentiment] || sentimentColors.neutral}`}>
                                    {s.sentiment}: {s.count} ({s.percentage}%)
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Replies */}
            {data.recentReplies?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">📬 Recent Replies</h4>
                    <div className="space-y-1.5">
                        {data.recentReplies.slice(0, 5).map((r: any, i: number) => (
                            <div key={i} className="bg-zinc-50 dark:bg-zinc-800/50 rounded p-1.5 text-[10px]">
                                <div className="flex justify-between">
                                    <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[60%]">{r.email}</span>
                                    <span className="text-zinc-400">{r.timeToReply}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-zinc-500 truncate">{r.subject}</span>
                                    {r.location && (
                                        <span className="text-zinc-400 flex-shrink-0">
                                            {r.location.countryCode && getFlagEmoji(r.location.countryCode)} {r.location.city || r.location.country}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Email Open Heatmap Widget ─────────────────────────────────

function EmailOpenHeatmapWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="overflow-auto h-full space-y-4 p-2">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: "Total Opened", value: data.summary?.totalOpened || 0, color: "text-emerald-600" },
                    { label: "Avg Open Count", value: data.summary?.avgOpenCount || 0, color: "text-blue-600" },
                    { label: "Multi-openers", value: `${data.summary?.multiOpenerPct || 0}%`, color: "text-violet-600" },
                ].map((s, i) => (
                    <div key={i} className="bg-white dark:bg-zinc-800 rounded-lg p-2 text-center border border-zinc-200/50 dark:border-zinc-700/50">
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-zinc-500">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Best Send Times */}
            {data.bestSendTimes?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">🎯 Best Send Times</h4>
                    <div className="flex gap-2">
                        {data.bestSendTimes.map((t: any, i: number) => (
                            <div key={i} className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/50 rounded-lg px-2.5 py-1.5 text-center">
                                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t.dayName} {t.hourLabel}</p>
                                <p className="text-[9px] text-emerald-600/70">{t.count} opens</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 7×24 Heatmap */}
            {data.heatmap?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">📅 Open Activity Heatmap</h4>
                    <div className="space-y-0.5">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, dayIdx) => (
                            <div key={dayName} className="flex items-center gap-1">
                                <span className="text-[8px] text-zinc-500 w-6 text-right">{dayName}</span>
                                <div className="flex gap-px flex-1">
                                    {Array.from({ length: 24 }, (_, h) => {
                                        const cell = data.heatmap.find((c: any) => c.dayOfWeek === dayIdx + 1 && c.hour === h);
                                        const count = cell?.count || 0;
                                        const intensity = data.maxHeatmapCount > 0 ? count / data.maxHeatmapCount : 0;
                                        return (
                                            <div
                                                key={h}
                                                className="flex-1 h-3 rounded-[1px]"
                                                style={{ backgroundColor: count > 0 ? `rgba(16, 185, 129, ${Math.max(0.1, intensity)})` : 'rgba(161, 161, 170, 0.1)' }}
                                                title={`${dayName} ${h}:00 — ${count} opens`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-6" />
                            <div className="flex justify-between flex-1 text-[7px] text-zinc-400">
                                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Open Velocity */}
            {data.openVelocity?.distribution?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">⚡ Open Velocity</h4>
                    <div className="space-y-1">
                        {data.openVelocity.distribution.map((d: any, i: number) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 w-24 text-right">{d.label}</span>
                                <div className="flex-1 h-3.5 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden">
                                    <div className="h-full rounded" style={{ width: `${d.pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                </div>
                                <span className="text-[10px] text-zinc-500 w-12 text-right">{d.pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Re-Openers */}
            {data.reOpeners?.length > 0 && (
                <div>
                    <h4 className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">🔥 Most Engaged (Re-openers)</h4>
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Contact</th>
                                <th className="text-left py-1 px-1.5 text-zinc-500 font-medium">Subject</th>
                                <th className="text-right py-1 px-1.5 text-zinc-500 font-medium">Opens</th>
                                <th className="text-center py-1 px-1.5 text-zinc-500 font-medium">Replied</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.reOpeners.slice(0, 8).map((r: any, i: number) => (
                                <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                                    <td className="py-1 px-1.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[100px]">{r.contactName}</td>
                                    <td className="py-1 px-1.5 text-zinc-500 truncate max-w-[120px]">{r.subject}</td>
                                    <td className="py-1 px-1.5 text-right font-semibold text-emerald-600">{r.openCount}</td>
                                    <td className="py-1 px-1.5 text-center">
                                        <span className={`text-[10px] ${r.replied ? 'text-blue-600' : 'text-zinc-400'}`}>{r.replied ? '✓' : '—'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Email Contact Engagement Widget ───────────────────────────

function EmailContactEngagementWidget({ data }: { data: any }) {
    if (!data?.contacts?.length) return <EmptyState />;

    return (
        <div className="overflow-auto h-full p-2 space-y-3">
            {/* Summary */}
            {data.summary && (
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.totalContacts}</strong> contacts</span>
                    <span>Avg Score: <strong className="text-zinc-700 dark:text-zinc-300">{data.summary.avgEngagementScore}</strong></span>
                    {data.pagination && (
                        <span className="ml-auto">Page {data.pagination.page}/{data.pagination.totalPages}</span>
                    )}
                </div>
            )}

            {/* Contact Table */}
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-700">
                        <th className="text-left py-1.5 px-1.5 text-zinc-500 font-medium">Contact</th>
                        <th className="text-right py-1.5 px-1.5 text-zinc-500 font-medium">Sent</th>
                        <th className="text-right py-1.5 px-1.5 text-zinc-500 font-medium">Opens</th>
                        <th className="text-right py-1.5 px-1.5 text-zinc-500 font-medium">Replies</th>
                        <th className="text-right py-1.5 px-1.5 text-zinc-500 font-medium">Score</th>
                        <th className="text-left py-1.5 px-1.5 text-zinc-500 font-medium">Location</th>
                    </tr>
                </thead>
                <tbody>
                    {data.contacts.map((c: any, i: number) => (
                        <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <td className="py-1.5 px-1.5">
                                <div className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{c.contactName}</div>
                                <div className="text-[9px] text-zinc-400 truncate max-w-[120px]">{c.email}</div>
                            </td>
                            <td className="py-1.5 px-1.5 text-right text-zinc-600 dark:text-zinc-400">{c.totalSent}</td>
                            <td className="py-1.5 px-1.5 text-right">
                                <span className="text-emerald-600 font-medium">{c.totalOpened}</span>
                                <span className="text-zinc-400 text-[9px] ml-0.5">({c.totalOpenCount}x)</span>
                            </td>
                            <td className="py-1.5 px-1.5 text-right">
                                <span className={c.totalReplied > 0 ? "text-blue-600 font-medium" : "text-zinc-400"}>{c.totalReplied}</span>
                            </td>
                            <td className="py-1.5 px-1.5 text-right">
                                <span className={`font-bold font-mono text-[10px] ${c.engagementScore >= 8 ? 'text-emerald-600' : c.engagementScore >= 3 ? 'text-blue-600' : 'text-zinc-400'
                                    }`}>{c.engagementScore}</span>
                            </td>
                            <td className="py-1.5 px-1.5 text-zinc-500 text-[10px] truncate max-w-[80px]">
                                {c.location ? (
                                    <span>
                                        {c.location.countryCode && getFlagEmoji(c.location.countryCode)} {c.location.city || c.location.country || '—'}
                                    </span>
                                ) : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// ─── Helper: Country Code to Flag Emoji ────────────────────────

function getFlagEmoji(countryCode: string): string {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// ═══════════════════════════════════════════════════════════════════
// CROSS-ENTITY EMAIL INTELLIGENCE WIDGETS
// ═══════════════════════════════════════════════════════════════════

// ─── Email → Revenue Attribution Widget ────────────────────────────

function EmailRevenueAttributionWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="space-y-4">
            {/* Conversion Rate Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Email → Deal Conversion</div>
                    <div className="text-2xl font-bold">{data.conversionRate?.conversionPct || 0}%</div>
                    <div className="text-xs text-zinc-500 mt-1">{data.conversionRate?.contactsWithOpportunities || 0} of {data.conversionRate?.emailedContacts || 0} contacts</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Won Deals</div>
                    <div className="text-2xl font-bold text-green-600">{data.dealsByStatus?.won?.count || 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">${(data.dealsByStatus?.won?.value || 0).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Attribution (Linear)</div>
                    <div className="text-2xl font-bold">${(data.attributionModels?.linear || 0).toLocaleString()}</div>
                    <div className="text-xs text-zinc-500 mt-1">{data.attributionModels?.totalConversions || 0} conversions</div>
                </div>
            </div>

            {/* Top Performing Subjects */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-3">Top-Performing Email Subjects</h3>
                <div className="overflow-auto max-h-64">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                            <tr className="text-left text-zinc-500 dark:text-zinc-400">
                                <th className="p-2">Subject</th>
                                <th className="p-2 text-right">Won Deals</th>
                                <th className="p-2 text-right">Revenue</th>
                                <th className="p-2 text-right">Avg/Deal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.topSubjects || []).map((s: any, i: number) => (
                                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-700">
                                    <td className="p-2">{s.subject}</td>
                                    <td className="p-2 text-right font-mono">{s.wonDeals}</td>
                                    <td className="p-2 text-right font-mono">${s.revenue.toLocaleString()}</td>
                                    <td className="p-2 text-right font-mono text-green-600">${s.avgRevenuePerDeal.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Email → Lifecycle Acceleration Widget ─────────────────────────

function EmailLifecycleAccelerationWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Emailed Contacts</div>
                    <div className="text-2xl font-bold">{data.summary?.emailedContacts || 0}</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Lifecycle Transitions</div>
                    <div className="text-2xl font-bold">{data.summary?.totalTransitions || 0}</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Avg Acceleration</div>
                    <div className={`text-2xl font-bold ${(data.summary?.avgAcceleration || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {data.summary?.avgAcceleration || 0}%
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">vs non-emailed</div>
                </div>
            </div>

            {/* Transitions */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-3">Stage Transition Acceleration</h3>
                <div className="space-y-2">
                    {(data.transitions || []).slice(0, 10).map((t: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-zinc-50 dark:bg-zinc-900 rounded">
                            <div className="flex-1">
                                <div className="text-xs font-medium">{t.from} → {t.to}</div>
                                <div className="text-xs text-zinc-500">{t.emailedContacts} contacts</div>
                            </div>
                            <div className="text-right">
                                <div className={`text-sm font-bold ${t.accelerationPct > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.accelerationPct > 0 ? '+' : ''}{t.accelerationPct}%
                                </div>
                                <div className="text-xs text-zinc-500">{t.avgTimeEmailed}h vs {t.avgTimeBaseline}h</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Campaign A/B Comparison Widget ─────────────────────────────────

function CampaignComparisonWidget({ data }: { data: any }) {
    if (!data || !data.campaigns || data.campaigns.length === 0) return <EmptyState />;

    return (
        <div className="space-y-4">
            {/* Campaign Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.campaigns.map((c: any) => (
                    <div key={c.id} className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                        <h3 className="text-sm font-semibold mb-3 truncate">{c.name}</h3>
                        <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Enrolled:</span>
                                <span className="font-mono">{c.totalEnrolled}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Open Rate:</span>
                                <span className="font-mono">{c.stats?.sent > 0 ? Math.round((c.stats.opened / c.stats.sent) * 100) : 0}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Reply Rate:</span>
                                <span className="font-mono text-green-600">{c.stats?.sent > 0 ? Math.round((c.stats.replied / c.stats.sent) * 100) : 0}%</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Completion:</span>
                                <span className="font-mono">{c.completionRate}%</span>
                            </div>
                        </div>

                        {/* Step Performance */}
                        {c.stepPerformance && c.stepPerformance.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                                <div className="text-xs font-medium mb-2">Per-Step Performance</div>
                                <div className="space-y-1">
                                    {c.stepPerformance.map((step: any, i: number) => (
                                        <div key={i} className="flex items-center text-xs">
                                            <div className="w-12 text-zinc-500">Step {i + 1}</div>
                                            <div className="flex-1 flex gap-2 text-xs font-mono">
                                                <span className="text-blue-600">{step.openRate}%</span>
                                                <span className="text-green-600">{step.replyRate}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Sequence Step Funnel Widget ────────────────────────────────────

function SequenceStepFunnelWidget({ data }: { data: any }) {
    if (!data || data.error) return <div className="p-4 text-center text-sm text-zinc-500">{data?.error || 'No data'}</div>;

    const maxContacts = Math.max(...(data.funnel || []).map((s: any) => s.contacts));

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Enrolled</div>
                    <div className="text-2xl font-bold">{data.totalEnrolled || 0}</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Reply Rate</div>
                    <div className="text-2xl font-bold text-green-600">{data.summary?.replyRate || 0}%</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Avg Steps to Reply</div>
                    <div className="text-2xl font-bold">{data.summary?.avgStepsBeforeReply || 0}</div>
                </div>
            </div>

            {/* Funnel Visualization */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-4">Drop-Off by Step</h3>
                <div className="space-y-3">
                    {(data.funnel || []).map((step: any, i: number) => (
                        <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                                <div className="text-xs font-medium">{step.stepName}</div>
                                <div className="text-xs text-zinc-500">{step.contacts} contacts</div>
                            </div>
                            <div className="relative h-8 bg-zinc-100 dark:bg-zinc-900 rounded overflow-hidden">
                                <div
                                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-blue-600"
                                    style={{ width: `${(step.contacts / maxContacts) * 100}%` }}
                                />
                                <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                                    <span className="text-white font-medium">{step.replyRate}% replied</span>
                                    {step.dropOff > 0 && (
                                        <span className="text-red-300">-{step.dropOffPct}% drop</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Deliverability Health Widget ──────────────────────────────────

function DeliverabilityHealthWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    const healthColor = data.healthScore >= 80 ? 'text-green-600' : data.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600';

    return (
        <div className="space-y-4">
            {/* Health Score */}
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg border border-zinc-200 dark:border-zinc-700 text-center">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Overall Health Score</div>
                <div className={`text-5xl font-bold ${healthColor}`}>{data.healthScore || 0}</div>
                <div className="text-xs text-zinc-500 mt-2">
                    {data.healthScore >= 80 ? 'Excellent' : data.healthScore >= 60 ? 'Good' : 'Needs Attention'}
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Bot Opens</div>
                    <div className="text-2xl font-bold">{data.botAnalysis?.botPct || 0}%</div>
                    <div className="text-xs text-zinc-500 mt-1">{data.botAnalysis?.botOpens || 0} of {data.botAnalysis?.totalOpens || 0}</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Reply-to-Open Ratio</div>
                    <div className="text-2xl font-bold text-green-600">{data.engagementQuality?.replyToOpenRatio || 0}%</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">At-Risk Domains</div>
                    <div className="text-2xl font-bold text-red-600">
                        {(data.domainHealth || []).filter((d: any) => d.status === 'at_risk').length}
                    </div>
                </div>
            </div>

            {/* Domain Health */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-3">Sending Domain Health</h3>
                <div className="overflow-auto max-h-64">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                            <tr className="text-left text-zinc-500">
                                <th className="p-2">Domain</th>
                                <th className="p-2 text-right">Sent</th>
                                <th className="p-2 text-right">Bounce %</th>
                                <th className="p-2 text-right">Open %</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.domainHealth || []).map((d: any, i: number) => (
                                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-700">
                                    <td className="p-2 font-mono text-xs">{d.fromEmail}</td>
                                    <td className="p-2 text-right">{d.sent}</td>
                                    <td className="p-2 text-right font-mono text-red-600">{d.bounceRate}%</td>
                                    <td className="p-2 text-right font-mono">{d.openRate}%</td>
                                    <td className="p-2">
                                        <span className={`inline-block px-2 py-1 rounded text-xs ${d.status === 'healthy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            d.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            }`}>
                                            {d.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Engagement Decay Widget ────────────────────────────────────────

function EngagementDecayWidget({ data }: { data: any }) {
    if (!data) return <EmptyState />;

    return (
        <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Declining Contacts</div>
                    <div className="text-2xl font-bold text-red-600">{data.summary?.totalDeclining || 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">20%+ engagement drop</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">With Open Deals</div>
                    <div className="text-2xl font-bold text-orange-600">{data.summary?.withOpenDeals || 0}</div>
                    <div className="text-xs text-zinc-500 mt-1">At-risk pipeline</div>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">At-Risk Pipeline Value</div>
                    <div className="text-2xl font-bold text-red-600">${(data.summary?.atRiskPipeline || 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Declining Contacts Table */}
            <div className="bg-white dark:bg-zinc-800 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-3">At-Risk Contacts (Declining Engagement)</h3>
                <div className="overflow-auto max-h-96">
                    <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
                            <tr className="text-left text-zinc-500">
                                <th className="p-2">Contact</th>
                                <th className="p-2">Stage</th>
                                <th className="p-2 text-right">Decay %</th>
                                <th className="p-2 text-right">Days Since Open</th>
                                <th className="p-2 text-right">Open Deals</th>
                                <th className="p-2 text-right">Pipeline $</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(data.decliningEngagement || []).map((c: any, i: number) => (
                                <tr key={i} className="border-t border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                    <td className="p-2">
                                        <div className="font-medium">{c.contactName}</div>
                                        <div className="text-zinc-500 text-xs">{c.email}</div>
                                    </td>
                                    <td className="p-2">{c.lifecycleStage || 'unknown'}</td>
                                    <td className="p-2 text-right font-mono text-red-600">-{c.decayPct}%</td>
                                    <td className="p-2 text-right font-mono">{c.daysSinceLastOpen || 'N/A'}</td>
                                    <td className="p-2 text-right font-mono">{c.openOpportunities}</td>
                                    <td className="p-2 text-right font-mono">${c.pipelineValue.toLocaleString()}</td>
                                    <td className="p-2">
                                        <span className={`inline-block px-2 py-1 rounded text-xs ${c.status === 'at_risk_pipeline'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}>
                                            {c.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// ─── Empty State ───────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 py-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-700/50 flex items-center justify-center">
                <svg className="w-4 h-4 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
            </div>
            <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">No data yet</span>
            <span className="text-[10px] text-zinc-300 dark:text-zinc-600">Try adjusting filters or date range</span>
        </div>
    );
}

// ─── Report Widget Container ───────────────────────────────────


