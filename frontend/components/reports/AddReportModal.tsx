"use client";

/**
 * AddReportModal - Data-First Report Builder
 *
 * Attio-inspired workflow:
 * 1. Report Type → 2. Data Source → 3. Metric → 4. Dimensions → 5. Filters → 6. Visualization (Auto-suggested)
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    ChartBarSquareIcon,
    ArrowTrendingUpIcon,
    FunnelIcon,
    ClockIcon,
    ArrowsRightLeftIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    PlusIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { getReportSources, getReportData } from "@/lib/api/reportDashboards";
import { adaptReportData } from "@/lib/reportDataAdapters";
import FilterBuilder, { FilterCondition, SourceAttribute, Relationship } from "./FilterBuilder";
import ReportWidget from "./ReportWidget";

interface ReportSource {
    entity: string;
    label: string;
    attributes: SourceAttribute[];
    customFields: SourceAttribute[];
    pipelines?: Pipeline[];
    relationships?: (Relationship & { foreignField?: string })[];
    supportsEvents: boolean;
}

interface Pipeline {
    id: string;
    name: string;
    stages: { id: string; name: string; order: number }[];
}



interface ReportDefinition {
    type: "insight" | "funnel" | "time_in_stage" | "historical" | "stage_changed";
    source: string;
    metric: {
        field: string;
        aggregation: string;
    };
    groupBy?: string;
    segmentBy?: string;
    period?: "day" | "week" | "month" | "quarter" | "year";
    periodComparison?: boolean;
    filters?: FilterCondition[];
    dateRange?: {
        field: string;
        start?: Date;
        end?: Date;
    };
    pipelineId?: string;
    includedStages?: string[];
}

interface AddReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (report: any) => void;
    onUpdate?: (reportId: string, report: any) => void;
    workspaceId: string;
    editMode?: boolean;
    existingReport?: any;
}

const REPORT_TYPES = [
    {
        type: "insight",
        label: "Insight",
        description: "Real-time snapshot of current state",
        icon: ChartBarSquareIcon,
        color: "bg-blue-50 text-blue-600",
    },
    {
        type: "funnel",
        label: "Funnel",
        description: "Conversion rates through stages",
        icon: FunnelIcon,
        color: "bg-violet-50 text-violet-600",
    },
    {
        type: "time_in_stage",
        label: "Time in Stage",
        description: "Velocity/efficiency analysis",
        icon: ClockIcon,
        color: "bg-amber-50 text-amber-600",
    },
    {
        type: "historical",
        label: "Historical",
        description: "Time-series of metric changes",
        icon: ArrowTrendingUpIcon,
        color: "bg-emerald-50 text-emerald-600",
    },
    {
        type: "stage_changed",
        label: "Stage Changed",
        description: "Flow/throughput analysis",
        icon: ArrowsRightLeftIcon,
        color: "bg-cyan-50 text-cyan-600",
    },
];

export default function AddReportModal({ isOpen, onClose, onAdd, onUpdate, workspaceId, editMode = false, existingReport }: AddReportModalProps) {
    // UI State - keeping step for now during transition
    const [step, setStep] = useState(1);

    const [reportType, setReportType] = useState<string | null>(null);
    const [sources, setSources] = useState<ReportSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<ReportSource | null>(null);
    const [selectedMetric, setSelectedMetric] = useState<{ field: string; aggregation: string } | null>(null);
    const [groupBy, setGroupBy] = useState<string>("");
    const [segmentBy, setSegmentBy] = useState<string>("");
    const [period, setPeriod] = useState<"day" | "week" | "month" | "quarter" | "year">("month");
    const [periodComparison, setPeriodComparison] = useState<boolean>(false);
    const [filters, setFilters] = useState<FilterCondition[]>([]);
    const [selectedPipeline, setSelectedPipeline] = useState<string>("");
    const [includedStages, setIncludedStages] = useState<string[]>([]);
    const [title, setTitle] = useState("");

    // Chart options
    const [targetLine, setTargetLine] = useState<number | "">("");
    const [goalValue, setGoalValue] = useState<number | "">("");
    const [stackedBars, setStackedBars] = useState<boolean>(true);
    const [showAxisLabels, setShowAxisLabels] = useState<boolean>(true);
    const [sortOrder, setSortOrder] = useState<"value_desc" | "value_asc" | "dimension_asc">("value_desc");
    const [chartTypeOverride, setChartTypeOverride] = useState<string>("");

    // P2: Cross-object joins
    const [joins, setJoins] = useState<{ entity: string; localField: string; foreignField: string; as: string }[]>([]);

    // P2: Calculated fields
    const [calculatedFields, setCalculatedFields] = useState<{ name: string; expression: string }[]>([]);

    // Live preview
    const [previewData, setPreviewData] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    // Fetch report sources on mount
    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchReportSources();
        }
    }, [isOpen, workspaceId]);

    // Update live preview when configuration changes
    useEffect(() => {
        const updatePreview = async () => {
            // Only show preview if minimum requirements are met
            if (!isOpen || !reportType || !selectedSource || !selectedMetric) {
                setPreviewData(null);
                return;
            }

            // Build definition for preview
            const validFilters = filters.filter(f => {
                if (!f.field) return false;
                if (f.operator === "exists") return true;
                return f.value !== undefined && f.value !== null && f.value !== "";
            });

            const definition: ReportDefinition = {
                type: reportType as any,
                source: selectedSource.entity,
                metric: selectedMetric,
                groupBy: groupBy || undefined,
                segmentBy: segmentBy || undefined,
                period: reportType === "historical" ? period : undefined,
                periodComparison: reportType === "historical" && periodComparison ? true : undefined,
                filters: validFilters.length > 0 ? validFilters : undefined,
                pipelineId: selectedPipeline || undefined,
                includedStages: includedStages.length > 0 ? includedStages : undefined,
            };

            const chartType = getSuggestedChartType();

            try {
                setPreviewLoading(true);
                const result = await getReportData(workspaceId, reportType, {}, definition);
                const adaptedData = adaptReportData(result.data, chartType, reportType, definition as any);
                setPreviewData(adaptedData);
            } catch (err) {
                console.error("Preview error:", err);
                setPreviewData(null);
            } finally {
                setPreviewLoading(false);
            }
        };

        // Debounce preview updates
        const timer = setTimeout(updatePreview, 500);
        return () => clearTimeout(timer);
    }, [isOpen, reportType, selectedSource, selectedMetric, groupBy, segmentBy, period, periodComparison, filters, selectedPipeline, includedStages, workspaceId]);

    // Pre-populate state when in edit mode
    useEffect(() => {
        if (isOpen && editMode && existingReport && existingReport.definition) {
            const def = existingReport.definition;
            setReportType(def.type);
            setSelectedMetric({
                field: def.metric.field || "count",
                aggregation: def.metric.aggregation,
            });
            setGroupBy(def.groupBy || "");
            setSegmentBy(def.segmentBy || "");
            setPeriod(def.period || "month");
            setPeriodComparison(def.periodComparison || false);
            setFilters(def.filters || []);
            setSelectedPipeline(def.pipelineId || "");
            setIncludedStages(def.includedStages || []);
            setTitle(existingReport.title);

            // Populate chart options from config
            if (existingReport.config) {
                setTargetLine(existingReport.config.targetLine || "");
                setStackedBars(existingReport.config.stackedBars !== false);
                setShowAxisLabels(existingReport.config.showAxisLabels !== false);
                setSortOrder(existingReport.config.sortOrder || "value_desc");
            }

            // Set source after sources are loaded
            if (sources.length > 0) {
                const source = sources.find(s => s.entity === def.source);
                if (source) {
                    setSelectedSource(source);
                }
            }
        }
    }, [isOpen, editMode, existingReport, sources]);

    const fetchReportSources = async () => {
        try {
            const data = await getReportSources(workspaceId);
            if (data.success) {
                setSources(data.data.sources);
            }
        } catch (error) {
            console.error("Failed to fetch report sources:", error);
        }
    };

    const getSuggestedChartType = (): string => {
        if (!selectedMetric || !selectedSource) return "number";

        // Logic for chart type suggestion
        if (reportType === "funnel") return "funnel";
        if (reportType === "historical") return "line";
        if (reportType === "time_in_stage") return "bar";

        if (groupBy && segmentBy) return "bar"; // Stacked bar for multi-dimension
        if (groupBy) return "bar"; // Bar for grouped data
        if (selectedMetric.aggregation === "count") return "number";
        if (selectedMetric.field && selectedMetric.aggregation !== "count") return "number";

        return "bar";
    };

    const handleCreate = () => {
        // Validation
        if (!reportType || !selectedSource || !selectedMetric) {
            console.error("Missing required fields for report creation");
            return;
        }

        // Validate metric field is present when aggregation is not "count"
        if (selectedMetric.aggregation !== "count" && !selectedMetric.field) {
            console.error("Metric field is required for aggregations other than count");
            return;
        }

        // Filter out invalid filters (missing field or value for operators that need it)
        const validFilters = filters.filter(f => {
            if (!f.field) return false;
            // "exists" operator doesn't need a value
            if (f.operator === "exists") return true;
            // All other operators need a value
            return f.value !== undefined && f.value !== null && f.value !== "";
        });

        const definition: ReportDefinition = {
            type: reportType as any,
            source: selectedSource.entity,
            metric: selectedMetric,
            groupBy: groupBy || undefined,
            segmentBy: segmentBy || undefined,
            period: reportType === "historical" ? period : undefined,
            periodComparison: reportType === "historical" && periodComparison ? true : undefined,
            filters: validFilters.length > 0 ? validFilters : undefined,
            pipelineId: selectedPipeline || undefined,
            includedStages: includedStages.length > 0 ? includedStages : undefined,
            // P2: multi-object joins
            joins: joins.length > 0 ? joins : undefined,
            // P2: calculated fields
            calculatedFields: calculatedFields.length > 0 ? calculatedFields : undefined,
        } as any;

        const chartType = chartTypeOverride || getSuggestedChartType();

        // Build chart configuration
        const config: any = {
            showAxisLabels,
            sortOrder,
        };

        if (targetLine !== "") {
            config.targetLine = Number(targetLine);
        }

        if (goalValue !== "") {
            config.goal = Number(goalValue);
        }

        // Only add stackedBars for bar charts with segments
        if (chartType === "bar" && segmentBy) {
            config.stackedBars = stackedBars;
        }

        const reportData = {
            type: reportType,
            title: title || `${selectedSource.label} - ${selectedMetric.aggregation}(${selectedMetric.field})`,
            chartType,
            config,
            definition,
            position: existingReport?.position || { x: 0, y: 0, w: chartType === "number" ? 1 : 2, h: chartType === "number" ? 1 : 2 },
        };

        if (editMode && existingReport && onUpdate) {
            onUpdate(existingReport._id, reportData);
        } else {
            onAdd(reportData);
        }

        resetModal();
        onClose();
    };

    const resetModal = () => {
        setReportType(null);
        setSelectedSource(null);
        setSelectedMetric(null);
        setGroupBy("");
        setSegmentBy("");
        setPeriod("month");
        setPeriodComparison(false);
        setFilters([]);
        setSelectedPipeline("");
        setIncludedStages([]);
        setTitle("");
        setTargetLine("");
        setGoalValue("");
        setStackedBars(true);
        setShowAxisLabels(true);
        setSortOrder("value_desc");
        setChartTypeOverride("");
        setPreviewData(null);
        setJoins([]);
        setCalculatedFields([]);
    };

    const allAttributes = selectedSource
        ? [...selectedSource.attributes, ...selectedSource.customFields]
        : [];

    const groupableAttributes = allAttributes.filter(attr => attr.groupable);
    const metricAttributes = allAttributes.filter(attr =>
        attr.aggregations && attr.aggregations.length > 0
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="fixed inset-4 z-50"
                    >
                        <div
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full h-full flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                        {editMode ? "Edit Report" : "Create Report"}
                                    </h2>
                                    {reportType && (
                                        <span className="px-2 py-1 text-xs font-medium rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                            {REPORT_TYPES.find(t => t.type === reportType)?.label}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!reportType || !selectedSource || !selectedMetric}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                                    >
                                        {editMode ? "Update Report" : "Create Report"}
                                    </button>
                                </div>
                            </div>

                            {/* 2-Column Layout: Configuration + Preview */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Left Panel: Configuration */}
                                <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                                    <div className="p-6 space-y-6">
                                        {/* Report Title */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Report Title
                                            </label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder={selectedSource && selectedMetric ? `${selectedSource.label} - ${selectedMetric.aggregation}(${selectedMetric.field})` : "My Report"}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                            />
                                        </div>

                                        {/* Report Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Report Type
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                {REPORT_TYPES.map((type) => (
                                                    <button
                                                        key={type.type}
                                                        onClick={() => setReportType(type.type)}
                                                        className={`p-3 rounded-lg border-2 text-left transition-all ${reportType === type.type
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                                            }`}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            <type.icon className={`w-5 h-5 flex-shrink-0 ${reportType === type.type ? "text-blue-600 dark:text-blue-400" : "text-gray-400"}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                                    {type.label}
                                                                </h3>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-2">
                                                                    {type.description}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Email Reports */}
                                        {!editMode && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Advanced Email Intelligence
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {[
                                                        { type: "email_engagement_deep_dive", title: "Email Engagement Deep Dive", description: "Geo, device, response times & open frequency", chartType: "bar", color: "text-pink-600", bgColor: "bg-pink-50 dark:bg-pink-900/20", w: 4, h: 3 },
                                                        { type: "email_reply_analysis", title: "Reply Analysis", description: "Reply geo-location, timing patterns & sentiment", chartType: "bar", color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-900/20", w: 4, h: 3 },
                                                        { type: "email_open_heatmap", title: "Open Heatmap", description: "7×24 heatmap, best send times & open velocity", chartType: "bar", color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20", w: 4, h: 3 },
                                                        { type: "email_contact_engagement", title: "Contact Engagement", description: "Per-contact engagement scores with geo data", chartType: "table", color: "text-violet-600", bgColor: "bg-violet-50 dark:bg-violet-900/20", w: 4, h: 3 },

                                                        // Cross-entity reports
                                                        { type: "email_revenue_attribution", title: "Email → Revenue Attribution", description: "Which emails actually generate pipeline & revenue", chartType: "bar", color: "text-green-600", bgColor: "bg-green-50 dark:bg-green-900/20", w: 4, h: 3 },
                                                        { type: "email_lifecycle_acceleration", title: "Email → Lifecycle Acceleration", description: "Do emails move people through the funnel faster?", chartType: "bar", color: "text-indigo-600", bgColor: "bg-indigo-50 dark:bg-indigo-900/20", w: 4, h: 3 },
                                                        { type: "campaign_comparison", title: "Campaign A/B Comparison", description: "Side-by-side campaign performance analysis", chartType: "bar", color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-900/20", w: 6, h: 3 },
                                                        { type: "sequence_step_funnel", title: "Sequence Step Funnel", description: "Where exactly do contacts drop off in sequences?", chartType: "bar", color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-900/20", w: 6, h: 3 },
                                                        { type: "deliverability_health", title: "Deliverability Health Score", description: "Bounce trends, bot opens, domain reputation", chartType: "bar", color: "text-teal-600", bgColor: "bg-teal-50 dark:bg-teal-900/20", w: 4, h: 3 },
                                                        { type: "engagement_decay", title: "Engagement Decay Analysis", description: "Declining engagement, at-risk pipeline contacts", chartType: "table", color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-900/20", w: 6, h: 4 },
                                                    ].map((preset) => (
                                                        <button
                                                            key={preset.type}
                                                            onClick={() => {
                                                                onAdd({
                                                                    type: preset.type,
                                                                    title: preset.title,
                                                                    chartType: preset.chartType,
                                                                    config: {},
                                                                    position: { x: 0, y: 0, w: preset.w, h: preset.h },
                                                                });
                                                                onClose();
                                                            }}
                                                            className={`p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-left transition-all hover:shadow-sm ${preset.bgColor}`}
                                                        >
                                                            <h3 className={`text-xs font-semibold ${preset.color}`}>{preset.title}</h3>
                                                            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{preset.description}</p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Data Source */}
                                        {reportType && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Data Source
                                                </label>
                                                <div className="space-y-2">
                                                    {sources.map((source) => (
                                                        <button
                                                            key={source.entity}
                                                            onClick={() => setSelectedSource(source)}
                                                            className={`w-full p-3 rounded-lg border-2 text-left transition-all ${selectedSource?.entity === source.entity
                                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                                                }`}
                                                        >
                                                            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                                                                {source.label}
                                                            </h3>
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                {source.attributes.length} attributes, {source.customFields.length} custom fields
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* P2: Cross-Object Join */}
                                        {selectedSource && selectedSource.relationships && selectedSource.relationships.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Join Another Object (Optional)
                                                </label>
                                                <div className="space-y-2">
                                                    {joins.map((join, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 flex-1">
                                                                {join.entity} via {join.localField} → {join.foreignField}
                                                            </span>
                                                            <button onClick={() => setJoins(j => j.filter((_, i) => i !== idx))} className="text-blue-400 hover:text-red-500">
                                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {selectedSource.relationships
                                                        .filter(rel => !joins.some(j => j.entity === rel.entity))
                                                        .map((rel) => (
                                                            <button
                                                                key={rel.entity}
                                                                onClick={() => setJoins(j => [...j, {
                                                                    entity: rel.entity,
                                                                    localField: rel.field || `${rel.entity}Id`,
                                                                    foreignField: rel.foreignField || "_id",
                                                                    as: rel.entity,
                                                                }])}
                                                                className="w-full p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-left hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
                                                            >
                                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                                    + Join {rel.label || rel.entity}
                                                                </span>
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Metric */}
                                        {selectedSource && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Metric
                                                </label>
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => setSelectedMetric({ field: "count", aggregation: "count" })}
                                                        className={`w-full p-3 rounded-lg border-2 text-left ${selectedMetric?.aggregation === "count"
                                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                                            }`}
                                                    >
                                                        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Count</h3>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400">Number of records</p>
                                                    </button>
                                                    {metricAttributes.map((attr) =>
                                                        attr.aggregations?.map((agg: string) => (
                                                            <button
                                                                key={`${attr.field}-${agg}`}
                                                                onClick={() => setSelectedMetric({ field: attr.field, aggregation: agg })}
                                                                className={`w-full p-3 rounded-lg border-2 text-left ${selectedMetric?.field === attr.field && selectedMetric?.aggregation === agg
                                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                                                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                                                                    }`}
                                                            >
                                                                <h3 className="font-semibold text-gray-900 dark:text-white text-sm capitalize">
                                                                    {agg}({attr.label})
                                                                </h3>
                                                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                    {agg === "sum" ? "Total" : agg === "avg" ? "Average" : agg === "min" ? "Minimum" : "Maximum"} {attr.label.toLowerCase()}
                                                                </p>
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* P2: Calculated Fields */}
                                        {selectedSource && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Calculated Fields (Optional)
                                                </label>
                                                <div className="space-y-2">
                                                    {calculatedFields.map((cf, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">{cf.name}</span>
                                                            <span className="text-[10px] text-amber-500 font-mono flex-1">= {cf.expression}</span>
                                                            <button onClick={() => setCalculatedFields(c => c.filter((_, i) => i !== idx))} className="text-amber-400 hover:text-red-500">
                                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => {
                                                            const name = prompt("Field name (e.g. weightedValue):");
                                                            if (!name) return;
                                                            const expression = prompt("Expression (e.g. value * probability / 100):");
                                                            if (!expression) return;
                                                            setCalculatedFields(c => [...c, { name: name.replace(/\s/g, ""), expression }]);
                                                        }}
                                                        className="w-full p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-left hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-all"
                                                    >
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                                            + Add Calculated Field
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Dimensions */}
                                        {selectedMetric && reportType === "insight" && groupableAttributes.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Group By (Optional)
                                                </label>
                                                <select
                                                    value={groupBy}
                                                    onChange={(e) => setGroupBy(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                >
                                                    <option value="">None</option>
                                                    {groupableAttributes.map((attr) => (
                                                        <option key={attr.field} value={attr.field}>
                                                            {attr.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {selectedMetric && groupBy && groupableAttributes.length > 0 && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Segment By (Optional)
                                                </label>
                                                <select
                                                    value={segmentBy}
                                                    onChange={(e) => setSegmentBy(e.target.value)}
                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                >
                                                    <option value="">None</option>
                                                    {groupableAttributes.filter(a => a.field !== groupBy).map((attr) => (
                                                        <option key={attr.field} value={attr.field}>
                                                            {attr.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Time Period */}
                                        {reportType === "historical" && selectedMetric && (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Time Period
                                                    </label>
                                                    <select
                                                        value={period}
                                                        onChange={(e) => setPeriod(e.target.value as any)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                    >
                                                        <option value="day">Daily</option>
                                                        <option value="week">Weekly</option>
                                                        <option value="month">Monthly</option>
                                                        <option value="quarter">Quarterly</option>
                                                        <option value="year">Yearly</option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={periodComparison}
                                                        onChange={(e) => setPeriodComparison(e.target.checked)}
                                                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded"
                                                    />
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">Compare with previous period</span>
                                                </label>
                                            </div>
                                        )}

                                        {/* Filters */}
                                        {selectedSource && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                    Filters (Optional)
                                                </label>
                                                <FilterBuilder
                                                    filters={filters}
                                                    onChange={setFilters}
                                                    attributes={allAttributes}
                                                    relationships={selectedSource.relationships}
                                                />
                                            </div>
                                        )}

                                        {/* Pipeline & Stages */}
                                        {selectedSource && (reportType === "funnel" || reportType === "time_in_stage" || reportType === "stage_changed") && selectedSource.pipelines && selectedSource.pipelines.length > 0 && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                        Pipeline
                                                    </label>
                                                    <select
                                                        value={selectedPipeline}
                                                        onChange={(e) => {
                                                            setSelectedPipeline(e.target.value);
                                                            setIncludedStages([]);
                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                                    >
                                                        <option value="">All Pipelines</option>
                                                        {selectedSource.pipelines.map((pipeline) => (
                                                            <option key={pipeline.id} value={pipeline.id}>
                                                                {pipeline.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {selectedPipeline && selectedSource.pipelines.find(p => p.id === selectedPipeline) && (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                            Included Stages (Optional)
                                                        </label>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                                                            {selectedSource.pipelines
                                                                .find(p => p.id === selectedPipeline)
                                                                ?.stages.sort((a, b) => a.order - b.order)
                                                                .map((stage) => (
                                                                    <label key={stage.id} className="flex items-center gap-2 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={includedStages.includes(stage.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setIncludedStages([...includedStages, stage.id]);
                                                                                } else {
                                                                                    setIncludedStages(includedStages.filter(id => id !== stage.id));
                                                                                }
                                                                            }}
                                                                            className="w-4 h-4"
                                                                        />
                                                                        <span className="text-sm">{stage.name}</span>
                                                                    </label>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Chart Options */}
                                        {selectedMetric && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                    Chart Options
                                                </label>
                                                <div className="space-y-3">
                                                    {/* Chart Type Override */}
                                                    <div>
                                                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                            Chart Type
                                                        </label>
                                                        <select
                                                            value={chartTypeOverride}
                                                            onChange={(e) => setChartTypeOverride(e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                        >
                                                            <option value="">Auto ({getSuggestedChartType()})</option>
                                                            <option value="number">Number Card</option>
                                                            <option value="bar">Bar Chart</option>
                                                            <option value="line">Line / Area</option>
                                                            <option value="pie">Pie / Donut</option>
                                                            <option value="funnel">Funnel</option>
                                                            <option value="table">Table</option>
                                                            <option value="combo">Combo (Bar + Line)</option>
                                                            <option value="gauge">Gauge / Radial</option>
                                                            <option value="scatter">Scatter Plot</option>
                                                            <option value="map">Geospatial Map</option>
                                                        </select>
                                                    </div>
                                                    {((chartTypeOverride || getSuggestedChartType()) === "bar" || (chartTypeOverride || getSuggestedChartType()) === "line" || (chartTypeOverride || getSuggestedChartType()) === "combo") && (
                                                        <div>
                                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                Target Line (Optional)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={targetLine}
                                                                onChange={(e) => setTargetLine(e.target.value === "" ? "" : Number(e.target.value))}
                                                                placeholder="e.g., 1000"
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                    {((chartTypeOverride || getSuggestedChartType()) === "number" || (chartTypeOverride || getSuggestedChartType()) === "gauge") && (
                                                        <div>
                                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                Goal / Quota (Optional)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={goalValue}
                                                                onChange={(e) => setGoalValue(e.target.value === "" ? "" : Number(e.target.value))}
                                                                placeholder="e.g., 100000"
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                            />
                                                        </div>
                                                    )}
                                                    {(chartTypeOverride || getSuggestedChartType()) === "bar" && segmentBy && (
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={stackedBars}
                                                                onChange={(e) => setStackedBars(e.target.checked)}
                                                                className="w-4 h-4"
                                                            />
                                                            <span className="text-sm">Stack bars by segment</span>
                                                        </label>
                                                    )}
                                                    <label className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={showAxisLabels}
                                                            onChange={(e) => setShowAxisLabels(e.target.checked)}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-sm">Show axis labels</span>
                                                    </label>
                                                    {((chartTypeOverride || getSuggestedChartType()) === "bar" || (chartTypeOverride || getSuggestedChartType()) === "pie") && groupBy && (
                                                        <div>
                                                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                Sort Order
                                                            </label>
                                                            <select
                                                                value={sortOrder}
                                                                onChange={(e) => setSortOrder(e.target.value as any)}
                                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                                            >
                                                                <option value="value_desc">Value (High to Low)</option>
                                                                <option value="value_asc">Value (Low to High)</option>
                                                                <option value="dimension_asc">Dimension (A-Z)</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Panel: Live Preview */}
                                <div className="w-1/2 bg-gray-50 dark:bg-gray-900 flex flex-col">
                                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Preview</h3>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center p-6">
                                        {previewLoading ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                <p className="text-sm text-gray-500">Loading preview...</p>
                                            </div>
                                        ) : !reportType || !selectedSource || !selectedMetric ? (
                                            <div className="text-center">
                                                <ChartBarSquareIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Configure your report to see a preview
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                                <ReportWidget
                                                    report={{
                                                        title: title || "Preview",
                                                        type: reportType,
                                                        chartType: chartTypeOverride || getSuggestedChartType(),
                                                        config: {
                                                            showAxisLabels,
                                                            sortOrder,
                                                            targetLine: targetLine !== "" ? Number(targetLine) : undefined,
                                                            goal: goalValue !== "" ? Number(goalValue) : undefined,
                                                            stackedBars: (chartTypeOverride || getSuggestedChartType()) === "bar" && segmentBy ? stackedBars : undefined,
                                                        },
                                                        position: { x: 0, y: 0, w: 2, h: 2 },
                                                    }}
                                                    workspaceId={workspaceId}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
