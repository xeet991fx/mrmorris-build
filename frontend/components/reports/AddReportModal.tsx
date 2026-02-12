"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    ChartBarSquareIcon,
    ArrowTrendingUpIcon,
    FunnelIcon,
    ClockIcon,
    ArrowsRightLeftIcon,
    EnvelopeIcon,
    TrophyIcon,
    MapPinIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    BoltIcon,
    Squares2X2Icon,
    MegaphoneIcon,
    UserGroupIcon,
    PhoneIcon,
    CalendarDaysIcon,
    ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

// Icon component wrapper for consistent sizing and color
function ReportIcon({ icon: Icon, color }: { icon: React.ElementType; color: string }) {
    return (
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon className="w-4 h-4" />
        </div>
    );
}

// Available report types with their metadata
const REPORT_TYPES = [
    // ── Pipeline & Deals ─────────────────────────
    {
        type: "insight",
        label: "Insight",
        description: "Real-time KPI metric",
        category: "Pipeline & Deals",
        defaultChart: "number",
        icon: ChartBarSquareIcon,
        color: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
        metrics: [
            { value: "pipeline_value", label: "Pipeline Value" },
            { value: "win_rate", label: "Win Rate" },
            { value: "open_deals", label: "Open Deals" },
            { value: "revenue_won", label: "Revenue Won" },
            { value: "total_contacts", label: "Total Contacts" },
            { value: "total_companies", label: "Total Companies" },
            { value: "emails_sent", label: "Emails Sent" },
            { value: "open_rate", label: "Open Rate" },
            { value: "click_rate", label: "Click Rate" },
            { value: "reply_rate", label: "Reply Rate" },
            { value: "open_tasks", label: "Open Tasks" },
            { value: "open_tickets", label: "Open Tickets" },
        ],
    },
    {
        type: "historical",
        label: "Historical",
        description: "Metric trend over time with moving averages",
        category: "Pipeline & Deals",
        defaultChart: "line",
        icon: ArrowTrendingUpIcon,
        color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
        metrics: [
            { value: "revenue", label: "Revenue" },
            { value: "deals_created", label: "Deals Created" },
            { value: "contacts_created", label: "Contacts Created" },
        ],
    },
    {
        type: "funnel",
        label: "Funnel",
        description: "Pipeline conversion rates with dropoff analysis",
        category: "Pipeline & Deals",
        defaultChart: "funnel",
        icon: FunnelIcon,
        color: "bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400",
        metrics: [],
    },
    {
        type: "time_in_stage",
        label: "Time in Stage",
        description: "Median & P90 durations with bottleneck detection",
        category: "Pipeline & Deals",
        defaultChart: "bar",
        icon: ClockIcon,
        color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400",
        metrics: [
            { value: "avg", label: "Average" },
            { value: "min", label: "Minimum" },
            { value: "max", label: "Maximum" },
        ],
    },
    {
        type: "stage_changed",
        label: "Stage Changed",
        description: "Deal transitions per period with velocity",
        category: "Pipeline & Deals",
        defaultChart: "bar",
        icon: ArrowsRightLeftIcon,
        color: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400",
        metrics: [],
    },
    {
        type: "forecast",
        label: "Forecast",
        description: "Revenue projections with pipeline coverage & gap analysis",
        category: "Pipeline & Deals",
        defaultChart: "bar",
        icon: CurrencyDollarIcon,
        color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
        metrics: [],
    },
    {
        type: "at_risk",
        label: "At-Risk Deals",
        description: "Multi-factor risk scoring (inactivity, overdue, aging)",
        category: "Pipeline & Deals",
        defaultChart: "table",
        icon: ExclamationTriangleIcon,
        color: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
        metrics: [],
    },
    {
        type: "deal_velocity",
        label: "Deal Velocity",
        description: "Pipeline velocity formula, sales cycle by stage & source",
        category: "Pipeline & Deals",
        defaultChart: "number",
        icon: BoltIcon,
        color: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
        metrics: [],
    },
    {
        type: "deal_cohort",
        label: "Deal Cohort",
        description: "Monthly cohort analysis — win rate & revenue trends",
        category: "Pipeline & Deals",
        defaultChart: "bar",
        icon: CalendarDaysIcon,
        color: "bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400",
        metrics: [
            { value: "6", label: "Last 6 Months" },
            { value: "12", label: "Last 12 Months" },
        ],
    },

    // ── People & Activity ────────────────────────
    {
        type: "top_performers",
        label: "Top Performers",
        description: "Leaderboard with win rates & rankings",
        category: "People & Activity",
        defaultChart: "table",
        icon: TrophyIcon,
        color: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
        metrics: [
            { value: "deals", label: "By Deals" },
            { value: "revenue", label: "By Revenue" },
            { value: "emails", label: "By Emails" },
        ],
    },
    {
        type: "lead_sources",
        label: "Lead Sources",
        description: "Source breakdown with conversion tracking",
        category: "People & Activity",
        defaultChart: "pie",
        icon: MapPinIcon,
        color: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400",
        metrics: [],
    },
    {
        type: "lifecycle_funnel",
        label: "Lifecycle Funnel",
        description: "Subscriber → MQL → SQL → Customer with SLA tracking",
        category: "People & Activity",
        defaultChart: "funnel",
        icon: UserGroupIcon,
        color: "bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400",
        metrics: [],
    },
    {
        type: "activity_breakdown",
        label: "Activity Breakdown",
        description: "Activity volume by type, user & day×hour heatmap",
        category: "People & Activity",
        defaultChart: "bar",
        icon: Squares2X2Icon,
        color: "bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400",
        metrics: [],
    },

    // ── Outreach & Communication ─────────────────
    {
        type: "email",
        label: "Email Activity",
        description: "Engagement rates per period with trend analysis",
        category: "Outreach & Communication",
        defaultChart: "bar",
        icon: EnvelopeIcon,
        color: "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400",
        metrics: [],
    },
    {
        type: "campaign_performance",
        label: "Campaign Performance",
        description: "Sequence analytics — open/click/reply/bounce rates & sentiment",
        category: "Outreach & Communication",
        defaultChart: "table",
        icon: MegaphoneIcon,
        color: "bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-600 dark:text-fuchsia-400",
        metrics: [],
    },
    {
        type: "call_insights",
        label: "Call Insights",
        description: "BANT coverage, sentiment, objections vs commitments",
        category: "Outreach & Communication",
        defaultChart: "bar",
        icon: PhoneIcon,
        color: "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400",
        metrics: [],
    },

    // ── Productivity ─────────────────────────────
    {
        type: "task_productivity",
        label: "Task Productivity",
        description: "Completion rates, overdue analysis, by priority & assignee",
        category: "Productivity",
        defaultChart: "bar",
        icon: ClipboardDocumentCheckIcon,
        color: "bg-stone-50 dark:bg-stone-900/20 text-stone-600 dark:text-stone-400",
        metrics: [],
    },
];

const CHART_TYPES = [
    { value: "number", label: "Number Card", icon: "#" },
    { value: "bar", label: "Bar Chart", icon: "▌" },
    { value: "line", label: "Line Chart", icon: "╱" },
    { value: "pie", label: "Pie Chart", icon: "◕" },
    { value: "funnel", label: "Funnel", icon: "▽" },
    { value: "table", label: "Table", icon: "☰" },
];

interface AddReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (report: { type: string; title: string; chartType: string; config: any; position: any }) => void;
}

export default function AddReportModal({ isOpen, onClose, onAdd }: AddReportModalProps) {
    const [selectedType, setSelectedType] = useState<typeof REPORT_TYPES[0] | null>(null);
    const [chartType, setChartType] = useState("number");
    const [metric, setMetric] = useState("");
    const [title, setTitle] = useState("");

    const handleSelectType = (rt: typeof REPORT_TYPES[0]) => {
        setSelectedType(rt);
        setChartType(rt.defaultChart);
        setMetric(rt.metrics[0]?.value || "");
        setTitle(rt.metrics[0]?.label || rt.label);
    };

    const handleAdd = () => {
        if (!selectedType) return;

        const config: any = {};
        if (metric) config.metric = metric;

        onAdd({
            type: selectedType.type,
            title: title || selectedType.label,
            chartType,
            config,
            position: { x: 0, y: 0, w: chartType === "number" ? 1 : 2, h: chartType === "number" ? 1 : 2 },
        });

        // Reset
        setSelectedType(null);
        setChartType("number");
        setMetric("");
        setTitle("");
        onClose();
    };

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
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-4 sm:inset-auto sm:top-[10%] sm:left-1/2 sm:-translate-x-1/2 sm:w-[560px] sm:max-h-[80vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800">
                            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Add Report</h2>
                            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {!selectedType ? (
                                /* Step 1: Select report type (grouped by category) */
                                <div className="p-4 space-y-4">
                                    {Array.from(new Set(REPORT_TYPES.map(rt => (rt as any).category || "Other"))).map((category) => (
                                        <div key={category}>
                                            <h3 className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 dark:text-zinc-500 mb-2">{category}</h3>
                                            <div className="grid grid-cols-2 gap-2">
                                                {REPORT_TYPES.filter(rt => ((rt as any).category || "Other") === category).map((rt) => (
                                                    <button
                                                        key={rt.type}
                                                        onClick={() => handleSelectType(rt)}
                                                        className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all text-left group"
                                                    >
                                                        <ReportIcon icon={rt.icon} color={rt.color} />
                                                        <div>
                                                            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{rt.label}</p>
                                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{rt.description}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* Step 2: Configure report */
                                <div className="p-4 space-y-4">
                                    <button
                                        onClick={() => setSelectedType(null)}
                                        className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                    >
                                        ← Back to report types
                                    </button>

                                    <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                        <ReportIcon icon={selectedType.icon} color={selectedType.color} />
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-900 dark:text-white">{selectedType.label}</p>
                                            <p className="text-[10px] text-zinc-500">{selectedType.description}</p>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                            placeholder="Report title"
                                        />
                                    </div>

                                    {/* Metric selector (if applicable) */}
                                    {selectedType.metrics.length > 0 && (
                                        <div>
                                            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Metric</label>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {selectedType.metrics.map((m) => (
                                                    <button
                                                        key={m.value}
                                                        onClick={() => { setMetric(m.value); if (!title || selectedType.metrics.some(mm => mm.label === title)) setTitle(m.label); }}
                                                        className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${metric === m.value
                                                            ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                                                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400"
                                                            }`}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Chart type */}
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Visualization</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {CHART_TYPES.map((ct) => (
                                                <button
                                                    key={ct.value}
                                                    onClick={() => setChartType(ct.value)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${chartType === ct.value
                                                        ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium"
                                                        : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-zinc-400"
                                                        }`}
                                                >
                                                    <span className="text-sm">{ct.icon}</span>
                                                    {ct.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {selectedType && (
                            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 dark:border-zinc-800">
                                <button
                                    onClick={onClose}
                                    className="px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAdd}
                                    className="px-4 py-1.5 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                                >
                                    Add Report
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
