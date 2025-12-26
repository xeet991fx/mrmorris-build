"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    ChartBarIcon,
    CurrencyDollarIcon,
    EnvelopeIcon,
    UserGroupIcon,
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

const COLORS = ["#9ACD32", "#8AB82E", "#7BA329", "#6C8F24", "#5D7A1F"];

export default function AnalyticsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [pipelineData, setPipelineData] = useState<any>(null);
    const [revenueTrend, setRevenueTrend] = useState<any[]>([]);
    const [emailPerf, setEmailPerf] = useState<any>(null);
    const [leadSources, setLeadSources] = useState<any[]>([]);
    const [topPerformers, setTopPerformers] = useState<any[]>([]);

    useEffect(() => {
        fetchAnalytics();
    }, [workspaceId]);

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-[#9ACD32] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-foreground">Analytics & Reports</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track performance and insights
                    </p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#9ACD32]/20 rounded-lg">
                                <CurrencyDollarIcon className="w-6 h-6 text-[#9ACD32]" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Pipeline</p>
                                <p className="text-2xl font-bold text-foreground">
                                    ${(pipelineData?.totalValue || 0).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <ChartBarIcon className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Win Rate</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {pipelineData?.winRate || 0}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <EnvelopeIcon className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Email Open Rate</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {emailPerf?.openRate || 0}%
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-500/20 rounded-lg">
                                <UserGroupIcon className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deals</p>
                                <p className="text-2xl font-bold text-foreground">
                                    {pipelineData?.totalDeals || 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Revenue Trend */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Revenue Trend
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={revenueTrend}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="month" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #333",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#9ACD32"
                                    strokeWidth={2}
                                    name="Revenue ($)"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Pipeline by Stage */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Pipeline by Stage
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={pipelineData?.dealsByStage || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="_id" stroke="#888" />
                                <YAxis stroke="#888" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #333",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="totalValue" fill="#9ACD32" name="Total Value ($)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Lead Sources */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Lead Sources
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={leadSources}
                                    dataKey="count"
                                    nameKey="_id"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    label
                                >
                                    {leadSources.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={COLORS[index % COLORS.length]}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #333",
                                        borderRadius: "8px",
                                    }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Top Performers */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Top Performers
                        </h3>
                        <div className="space-y-3">
                            {topPerformers.slice(0, 5).map((performer, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-background rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#9ACD32]/20 flex items-center justify-center text-[#9ACD32] font-semibold">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">
                                                {performer.user?.name || "Unknown"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {performer.dealsWon} deals won
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-[#9ACD32]">
                                            ${performer.revenue.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Email Performance */}
                {emailPerf && (
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                            Email Performance
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-foreground">
                                    {emailPerf.totalSent}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Sent</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-400">
                                    {emailPerf.openRate}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Open Rate</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-400">
                                    {emailPerf.clickRate}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Click Rate</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-400">
                                    {emailPerf.replyRate}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Reply Rate</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-400">
                                    {emailPerf.bounceRate}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Bounce Rate</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
