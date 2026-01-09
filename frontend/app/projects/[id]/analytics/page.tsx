"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    EnvelopeIcon,
    UserGroupIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import axios from "@/lib/axios";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444"];

export default function AnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [pipelineData, setPipelineData] = useState<any>(null);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [emailPerf, setEmailPerf] = useState<any>(null);
    const [leadSources, setLeadSources] = useState<any[]>([]);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);

            const [pipeline, revenue, email, sources, performers] = await Promise.all([
                axios.get(`/workspaces/${workspaceId}/analytics/pipeline`),
                axios.get(`/workspaces/${workspaceId}/analytics/revenue-trend?interval=month`),
                axios.get(`/workspaces/${workspaceId}/analytics/email-performance`),
                axios.get(`/workspaces/${workspaceId}/analytics/lead-sources`),
                axios.get(`/workspaces/${workspaceId}/analytics/top-performers`),
            ]);

            if (pipeline.data.success) setPipelineData(pipeline.data.data);
            if (revenue.data.success) {
                const formatted = revenue.data.data.map((item: any) => ({
                    month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
                    revenue: item.revenue,
                    deals: item.dealsWon,
                }));
                setRevenueTrend(formatted);
            }
            if (email.data.success) setEmailPerf(email.data.data);
            if (sources.data.success) setLeadSources(sources.data.data);
            if (performers.data.success) setTopPerformers(performers.data.data);
        } catch (error) {
            console.error("Analytics error:", error);
            toast.error("Failed to load analytics");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
    }, [workspaceId]);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading analytics...</span>
                </div>
            </div>
        );
    }

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
                            Analytics
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Track performance and insights
                        </p>
                    </div>
                    <button
                        onClick={fetchAnalytics}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-500">
                            ${((pipelineData?.totalValue || 0) / 1000).toFixed(0)}k
                        </span>
                        <span className="text-sm text-zinc-500">pipeline</span>
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-500">{pipelineData?.winRate || 0}%</span>
                        <span className="text-sm text-zinc-500">win rate</span>
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-violet-500">{emailPerf?.openRate || 0}%</span>
                        <span className="text-sm text-zinc-500">email opens</span>
                    </div>
                    <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{pipelineData?.totalDeals || 0}</span>
                        <span className="text-sm text-zinc-500">deals</span>
                    </div>
                </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Charts Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {/* Revenue Trend */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Revenue Trend
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueTrend}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                    <XAxis dataKey="month" stroke="#a1a1aa" fontSize={12} />
                                    <YAxis stroke="#a1a1aa" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid #e4e4e7",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        dot={{ fill: "#10b981", r: 4 }}
                                        name="Revenue ($)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Pipeline by Stage */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Pipeline by Stage
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pipelineData?.dealsByStage || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                                    <XAxis dataKey="_id" stroke="#a1a1aa" fontSize={12} />
                                    <YAxis stroke="#a1a1aa" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid #e4e4e7",
                                            borderRadius: "8px",
                                        }}
                                    />
                                    <Bar dataKey="totalValue" fill="#10b981" radius={[4, 4, 0, 0]} name="Total Value ($)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Lead Sources */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Lead Sources
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={leadSources}
                                        dataKey="count"
                                        nameKey="_id"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                    >
                                        {leadSources.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "#fff",
                                            border: "1px solid #e4e4e7",
                                            borderRadius: "8px",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Top Performers */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                    >
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Top Performers
                        </h3>
                        <div className="space-y-3">
                            {topPerformers.slice(0, 5).map((performer, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {performer.user?.name || "Unknown"}
                                            </p>
                                            <p className="text-xs text-zinc-500">
                                                {performer.dealsWon} deals won
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                        ${performer.revenue.toLocaleString()}
                                    </p>
                                </div>
                            ))}
                            {topPerformers.length === 0 && (
                                <p className="text-sm text-zinc-400 py-4 text-center">No data available</p>
                            )}
                        </div>
                    </motion.div>
                </div>

                {/* Email Performance */}
                {emailPerf && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Email Performance
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                            <div className="text-center py-4">
                                <p className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                    {emailPerf.totalSent}
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">Sent</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-2xl sm:text-3xl font-bold text-blue-500">
                                    {emailPerf.openRate}%
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">Open Rate</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-2xl sm:text-3xl font-bold text-violet-500">
                                    {emailPerf.clickRate}%
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">Click Rate</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-2xl sm:text-3xl font-bold text-emerald-500">
                                    {emailPerf.replyRate}%
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">Reply Rate</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-2xl sm:text-3xl font-bold text-red-500">
                                    {emailPerf.bounceRate}%
                                </p>
                                <p className="text-sm text-zinc-500 mt-1">Bounce Rate</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
