"use client";

import React, { useEffect, useState, useMemo } from "react";
import { getReportData } from "@/lib/api/reportDashboards";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart
} from "recharts";
import { motion } from "framer-motion";
import {
    ArrowTrendingUpIcon, ArrowTrendingDownIcon,
    TrashIcon, MinusIcon,
} from "@heroicons/react/24/outline";

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

function BarChartWidget({ data, type }: { data: any; type: string }) {
    if (!data) return null;

    let chartData: any[] = [];
    let xKey = "name";
    let yKey = "value";

    if (type === "funnel" && data.stages) {
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
                            tick={{ fontSize: 10, fill: "#a1a1aa" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => v?.length > 8 ? v.slice(0, 8) + "…" : v}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid #3f3f46",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#fafafa",
                            }}
                        />
                        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={STAGE_COLORS[chartData[i]?.[xKey]] || COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Line Chart Widget — Now with moving average ───────────────

function LineChartWidget({ data, type }: { data: any; type: string }) {
    if (!data) return null;

    let chartData: any[] = [];

    if (data.periods) {
        chartData = data.periods;
    }

    if (chartData.length === 0) return <EmptyState />;

    const hasMovingAvg = chartData.some((d) => d.movingAvg !== undefined);

    return (
        <div className="h-full flex flex-col">
            {data.summary && (
                <div className="flex items-center gap-3 px-1 pb-1.5 text-[10px] text-zinc-500">
                    {data.summary.total !== undefined && (
                        <span>Total: <strong className="text-zinc-700 dark:text-zinc-300">
                            {data.summary.total >= 1000 ? `${(data.summary.total / 1000).toFixed(1)}K` : data.summary.total}
                        </strong></span>
                    )}
                    {data.summary.change !== undefined && <ChangeIndicator change={data.summary.change} />}
                    {data.summary.avgPerPeriod !== undefined && (
                        <span>Avg: <strong className="text-zinc-700 dark:text-zinc-300">
                            {data.summary.avgPerPeriod >= 1000 ? `${(data.summary.avgPerPeriod / 1000).toFixed(1)}K` : data.summary.avgPerPeriod}
                        </strong>/mo</span>
                    )}
                </div>
            )}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.3} />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid #3f3f46",
                                borderRadius: "8px",
                                fontSize: "12px",
                                color: "#fafafa",
                            }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#colorValue)" />
                        {hasMovingAvg && (
                            <Line type="monotone" dataKey="movingAvg" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// ─── Pie Chart Widget — With percentages ───────────────────────

function PieChartWidget({ data, type }: { data: any; type: string }) {
    if (!data) return null;

    let chartData: any[] = [];

    if (data.sources) {
        chartData = data.sources;
    } else if (data.stages) {
        chartData = data.stages;
    }

    if (chartData.length === 0) return <EmptyState />;

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
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
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

function FunnelWidget({ data }: { data: any }) {
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
                        <div key={stage.stage} className="flex items-center gap-2">
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

// ─── Empty State ───────────────────────────────────────────────

function EmptyState() {
    return (
        <div className="flex items-center justify-center h-full text-sm text-zinc-400 dark:text-zinc-500">
            No data available
        </div>
    );
}

// ─── Report Widget Container ───────────────────────────────────

interface ReportWidgetProps {
    report: {
        _id?: string;
        type: string;
        title: string;
        chartType: string;
        config: any;
        position: { x: number; y: number; w: number; h: number };
    };
    workspaceId: string;
    onRemove?: (reportId: string) => void;
}

export default function ReportWidget({ report, workspaceId, onRemove }: ReportWidgetProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const configKey = useMemo(() => JSON.stringify(report.config), [report.config]);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(false);
                const result = await getReportData(workspaceId, report.type, report.config);
                setData(result.data);
            } catch (err) {
                console.error("Error loading report:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [workspaceId, report.type, configKey]);

    const renderChart = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
            );
        }

        if (error) {
            return (
                <div className="flex items-center justify-center h-full text-xs text-red-400">
                    Failed to load
                </div>
            );
        }

        switch (report.chartType) {
            case "number": return <NumberCard data={data} />;
            case "bar": return <BarChartWidget data={data} type={report.type} />;
            case "line": return <LineChartWidget data={data} type={report.type} />;
            case "pie": return <PieChartWidget data={data} type={report.type} />;
            case "funnel": return <FunnelWidget data={data} />;
            case "table": return <TableWidget data={data} type={report.type} />;
            default: return <EmptyState />;
        }
    };

    // Grid span based on widget size
    const colSpan = report.position?.w || 2;
    const rowSpan = report.position?.h || 1;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-zinc-50 dark:bg-zinc-800/50 rounded-xl overflow-hidden group`}
            style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                minHeight: rowSpan === 1 ? "120px" : rowSpan === 2 ? "280px" : "400px",
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200/50 dark:border-zinc-700/50">
                <h3 className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                    {report.title}
                </h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onRemove && report._id && (
                        <button
                            onClick={() => onRemove(report._id!)}
                            className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                            <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Chart area */}
            <div className="px-2 py-1" style={{ height: rowSpan === 1 ? "80px" : rowSpan === 2 ? "230px" : "350px" }}>
                {renderChart()}
            </div>
        </motion.div>
    );
}
