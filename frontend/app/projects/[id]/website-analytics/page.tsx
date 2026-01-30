"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChartBarIcon,
    GlobeAltIcon,
    UserGroupIcon,
    ClockIcon,
    ArrowPathIcon,
    ComputerDesktopIcon,
    DevicePhoneMobileIcon,
    EyeIcon,
    ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";
import {
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
} from "recharts";
import axios from "@/lib/axios";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

interface WebsiteOverview {
    totalVisitors: number;
    uniqueVisitorsInRange: number;
    totalSessions: number;
    totalPageViews: number;
    totalEvents: number;
    avgSessionDurationFormatted: string;
    bounceRate: number;
}

export default function WebsiteAnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [overview, setOverview] = useState<WebsiteOverview | null>(null);
    const [visitorsOverTime, setVisitorsOverTime] = useState<any[]>([]);
    const [trafficSources, setTrafficSources] = useState<any[]>([]);
    const [devices, setDevices] = useState<any>({ devices: [], browsers: [] });
    const [topPages, setTopPages] = useState<any[]>([]);
    const [realtime, setRealtime] = useState<any>({ activeVisitors: 0, activePages: [] });
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            const days = dateRange === "7d" ? 7 : dateRange === "90d" ? 90 : 30;
            const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

            const [overviewRes, visitorsRes, sourcesRes, devicesRes, pagesRes, realtimeRes] = await Promise.all([
                axios.get(`/workspaces/${workspaceId}/analytics/website/overview?startDate=${startDate}`),
                axios.get(`/workspaces/${workspaceId}/analytics/website/visitors-over-time?startDate=${startDate}`),
                axios.get(`/workspaces/${workspaceId}/analytics/website/traffic-sources?startDate=${startDate}`),
                axios.get(`/workspaces/${workspaceId}/analytics/website/devices?startDate=${startDate}`),
                axios.get(`/workspaces/${workspaceId}/analytics/website/top-pages?startDate=${startDate}&limit=10`),
                axios.get(`/workspaces/${workspaceId}/analytics/website/realtime`),
            ]);

            if (overviewRes.data.success) setOverview(overviewRes.data.data);
            if (visitorsRes.data.success) setVisitorsOverTime(visitorsRes.data.data);
            if (sourcesRes.data.success) setTrafficSources(sourcesRes.data.data);
            if (devicesRes.data.success) setDevices(devicesRes.data.data);
            if (pagesRes.data.success) setTopPages(pagesRes.data.data);
            if (realtimeRes.data.success) setRealtime(realtimeRes.data.data);
        } catch (error) {
            console.error("Website analytics error:", error);
            toast.error("Failed to load website analytics");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [workspaceId, dateRange]); // eslint-disable-line react-hooks/exhaustive-deps

    // Realtime refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const res = await axios.get(`/workspaces/${workspaceId}/analytics/website/realtime`);
                if (res.data.success) setRealtime(res.data.data);
            } catch { }
        }, 30000);
        return () => clearInterval(interval);
    }, [workspaceId]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading website analytics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <GlobeAltIcon className="w-8 h-8 text-emerald-500" />
                            Website Analytics
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Track visitor behavior, traffic sources, and engagement
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Date Range Selector */}
                        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                            {(["7d", "30d", "90d"] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-md transition-all",
                                        dateRange === range
                                            ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                            : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                    )}
                                >
                                    {range === "7d" ? "7 Days" : range === "30d" ? "30 Days" : "90 Days"}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={fetchAnalytics}
                            className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                        </button>
                    </div>
                </motion.div>

                {/* Realtime Badge */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                        {realtime.activeVisitors} active now
                    </span>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard
                        icon={<UserGroupIcon className="w-5 h-5" />}
                        label="Visitors"
                        value={overview?.uniqueVisitorsInRange || 0}
                        color="emerald"
                    />
                    <StatCard
                        icon={<EyeIcon className="w-5 h-5" />}
                        label="Page Views"
                        value={overview?.totalPageViews || 0}
                        color="blue"
                    />
                    <StatCard
                        icon={<ClockIcon className="w-5 h-5" />}
                        label="Avg. Duration"
                        value={overview?.avgSessionDurationFormatted || "0m 0s"}
                        isString
                        color="violet"
                    />
                    <StatCard
                        icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
                        label="Bounce Rate"
                        value={`${overview?.bounceRate || 0}%`}
                        isString
                        color="amber"
                    />
                </div>
            </div>

            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Charts */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">
                {/* Visitors Over Time */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                        Visitors Over Time
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={visitorsOverTime}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#a1a1aa"
                                    fontSize={12}
                                    tickFormatter={(val) => val?.slice(5) || val}
                                />
                                <YAxis stroke="#a1a1aa" fontSize={12} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#fff",
                                        border: "1px solid #e4e4e7",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="visitors"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: "#10b981", r: 3 }}
                                    name="Visitors"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Traffic Sources */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Traffic Sources
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={trafficSources}
                                        dataKey="sessions"
                                        nameKey="source"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ source, percentage }) => `${source} ${percentage}%`}
                                        labelLine={false}
                                    >
                                        {trafficSources.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Devices */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Devices
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={devices.devices} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                    <XAxis type="number" stroke="#a1a1aa" fontSize={12} />
                                    <YAxis dataKey="device" type="category" stroke="#a1a1aa" fontSize={12} width={80} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Visitors" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Top Pages */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                        Top Pages
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Page</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Views</th>
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 uppercase">Visitors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topPages.map((page, index) => (
                                    <tr key={index} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                        <td className="py-3 px-4">
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-md">
                                                {page.path || page.url}
                                            </p>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                {page.pageViews.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <span className="text-sm text-zinc-500">
                                                {page.uniqueVisitors.toLocaleString()}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {topPages.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-8 text-center text-sm text-zinc-400">
                                            No page data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* Browsers */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                        Browsers
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                        {devices.browsers.map((browser: any, index: number) => (
                            <div key={index} className="text-center py-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {browser.percentage}%
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">{browser.browser}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, isString = false }: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: "emerald" | "blue" | "violet" | "amber";
    isString?: boolean;
}) {
    const colorClasses = {
        emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
        blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
        violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400",
        amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
        >
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", colorClasses[color])}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {isString ? value : (value as number).toLocaleString()}
            </p>
            <p className="text-sm text-zinc-500 mt-1">{label}</p>
        </motion.div>
    );
}
