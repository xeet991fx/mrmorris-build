"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { getWorkflow, getWorkflowAnalytics, type WorkflowAnalytics } from "@/lib/api/workflow";
import { Workflow } from "@/lib/workflow/types";
import { Line, Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function WorkflowAnalyticsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const workflowId = params.workflowId as string;

    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchData = async (refresh = false) => {
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const [workflowRes, analyticsRes] = await Promise.all([
                getWorkflow(workspaceId, workflowId),
                getWorkflowAnalytics(workspaceId, workflowId),
            ]);

            if (workflowRes.success && workflowRes.data?.workflow) {
                setWorkflow(workflowRes.data.workflow);
            }

            if (analyticsRes.success && analyticsRes.data) {
                setAnalytics(analyticsRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, workflowId]);

    const handleBack = () => {
        router.push(`/projects/${workspaceId}/workflows/${workflowId}`);
    };

    const handleRefresh = () => {
        fetchData(true);
    };

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!workflow || !analytics) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Failed to load analytics</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Prepare chart data for timeline
    const timelineChartData = {
        labels: analytics.timeline.map((t) => new Date(t.date).toLocaleDateString()),
        datasets: [
            {
                label: "Enrolled",
                data: analytics.timeline.map((t) => t.enrolled),
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
                tension: 0.4,
            },
            {
                label: "Completed",
                data: analytics.timeline.map((t) => t.completed),
                borderColor: "rgb(34, 197, 94)",
                backgroundColor: "rgba(34, 197, 94, 0.1)",
                fill: true,
                tension: 0.4,
            },
            {
                label: "Failed",
                data: analytics.timeline.map((t) => t.failed),
                borderColor: "rgb(239, 68, 68)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                fill: true,
                tension: 0.4,
            },
        ],
    };

    // Prepare chart data for funnel
    const funnelChartData = {
        labels: analytics.funnel.map((s) => s.stepName),
        datasets: [
            {
                label: "Completed",
                data: analytics.funnel.map((s) => s.completed),
                backgroundColor: "rgba(34, 197, 94, 0.8)",
            },
            {
                label: "Failed",
                data: analytics.funnel.map((s) => s.failed),
                backgroundColor: "rgba(239, 68, 68, 0.8)",
            },
            {
                label: "Drop Off",
                data: analytics.funnel.map((s) => s.dropOff),
                backgroundColor: "rgba(156, 163, 175, 0.8)",
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: "top" as const,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
            },
        },
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Back to workflow"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{workflow.name}</h1>
                        <p className="text-xs text-muted-foreground">Analytics Dashboard</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
                {/* Overview Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                >
                    <StatCard
                        label="Total Enrolled"
                        value={analytics.overview.totalEnrolled}
                        icon="👥"
                        color="blue"
                    />
                    <StatCard
                        label="Currently Active"
                        value={analytics.overview.currentlyActive}
                        icon="⚡"
                        color="green"
                    />
                    <StatCard
                        label="Completed"
                        value={analytics.overview.completed}
                        suffix={`${Math.round(analytics.overview.completionRate * 100)}%`}
                        icon="✅"
                        color="emerald"
                    />
                    <StatCard
                        label="Failed"
                        value={analytics.overview.failed}
                        icon="❌"
                        color="red"
                    />
                </motion.div>

                {/* Additional Stats */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">⏱️</span>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Avg. Time to Complete
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    {analytics.overview.avgTimeToComplete.toFixed(1)} days
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Average time from enrollment to completion
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">📊</span>
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Success Rate
                                </p>
                                <p className="text-2xl font-bold text-foreground">
                                    {Math.round(analytics.overview.completionRate * 100)}%
                                </p>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Percentage of enrollments that complete successfully
                        </p>
                    </div>
                </motion.div>

                {/* Timeline Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4">
                        Enrollment Timeline (Last 30 Days)
                    </h3>
                    <div className="h-80">
                        <Line data={timelineChartData} options={chartOptions} />
                    </div>
                </motion.div>

                {/* Funnel Chart */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4">Step Performance Funnel</h3>
                    <div className="h-96">
                        <Bar data={funnelChartData} options={chartOptions} />
                    </div>
                </motion.div>

                {/* Detailed Funnel Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-card border border-border rounded-xl p-6"
                >
                    <h3 className="text-lg font-semibold text-foreground mb-4">Detailed Step Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-border">
                                <tr className="text-left text-sm text-muted-foreground">
                                    <th className="pb-3 font-medium">Step</th>
                                    <th className="pb-3 font-medium">Type</th>
                                    <th className="pb-3 font-medium text-right">Entered</th>
                                    <th className="pb-3 font-medium text-right">Completed</th>
                                    <th className="pb-3 font-medium text-right">Failed</th>
                                    <th className="pb-3 font-medium text-right">Drop Off</th>
                                    <th className="pb-3 font-medium text-right">Success Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {analytics.funnel.map((step, index) => {
                                    const successRate =
                                        step.entered > 0
                                            ? Math.round((step.completed / step.entered) * 100)
                                            : 0;
                                    return (
                                        <tr key={step.stepId} className="text-sm">
                                            <td className="py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                        {index + 1}
                                                    </span>
                                                    <span className="font-medium text-foreground">
                                                        {step.stepName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-3">
                                                <StepTypeBadge type={step.stepType} />
                                            </td>
                                            <td className="py-3 text-right text-foreground font-medium">
                                                {step.entered}
                                            </td>
                                            <td className="py-3 text-right text-green-600 font-medium">
                                                {step.completed}
                                            </td>
                                            <td className="py-3 text-right text-red-600 font-medium">
                                                {step.failed}
                                            </td>
                                            <td className="py-3 text-right text-gray-600 font-medium">
                                                {step.dropOff}
                                            </td>
                                            <td className="py-3 text-right">
                                                <span
                                                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                        successRate >= 80
                                                            ? "bg-green-100 text-green-700"
                                                            : successRate >= 50
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-red-100 text-red-700"
                                                    }`}
                                                >
                                                    {successRate}%
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

// Sub-components
function StatCard({
    label,
    value,
    suffix,
    icon,
    color,
}: {
    label: string;
    value: number;
    suffix?: string;
    icon: string;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20",
        green: "from-green-500/10 to-green-500/5 border-green-500/20",
        emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
        red: "from-red-500/10 to-red-500/5 border-red-500/20",
    };

    return (
        <div
            className={`p-4 rounded-xl bg-gradient-to-br border ${
                colorClasses[color] || colorClasses.blue
            }`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{value}</span>
                {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
        </div>
    );
}

function StepTypeBadge({ type }: { type: string }) {
    const config: Record<string, { label: string; color: string }> = {
        trigger: { label: "Trigger", color: "bg-violet-500/10 text-violet-600" },
        action: { label: "Action", color: "bg-blue-500/10 text-blue-600" },
        delay: { label: "Delay", color: "bg-orange-500/10 text-orange-600" },
        condition: { label: "Condition", color: "bg-teal-500/10 text-teal-600" },
    };

    const { label, color } = config[type] || { label: type, color: "bg-gray-500/10 text-gray-600" };

    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>
    );
}
