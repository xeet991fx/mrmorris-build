/**
 * Workflow Analytics Dashboard
 * 
 * Displays comprehensive analytics for workflow performance
 * including enrollment funnel, step completion rates, and goal conversions.
 */

"use client";

import { useState, useEffect } from "react";
import { Workflow, WorkflowEnrollment } from "@/lib/workflow/types";

interface WorkflowAnalyticsProps {
    workflow: Workflow;
    workspaceId: string;
}

interface AnalyticsData {
    enrollments: WorkflowEnrollment[];
    stepStats: {
        stepId: string;
        stepName: string;
        stepType: string;
        completed: number;
        failed: number;
        pending: number;
    }[];
}

export default function WorkflowAnalytics({ workflow, workspaceId }: WorkflowAnalyticsProps) {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    useEffect(() => {
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workflow._id]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/workflows/${workflow._id}/enrollments`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            const data = await res.json();

            if (data.success) {
                const enrollments = data.data?.enrollments || [];

                // Calculate step statistics
                const stepStats = workflow.steps.map(step => {
                    const stepExecutions = enrollments.flatMap((e: WorkflowEnrollment) =>
                        e.stepsExecuted?.filter(se => se.stepId === step.id) || []
                    );

                    return {
                        stepId: step.id,
                        stepName: step.name,
                        stepType: step.type,
                        completed: stepExecutions.filter((se: any) => se.status === 'completed').length,
                        failed: stepExecutions.filter((se: any) => se.status === 'failed').length,
                        pending: stepExecutions.filter((se: any) => se.status === 'pending' || se.status === 'running').length,
                    };
                });

                setAnalytics({ enrollments, stepStats });
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 bg-card rounded-xl border border-border animate-pulse">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-24 bg-muted rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    const { stats } = workflow;
    const completionRate = stats.totalEnrolled > 0
        ? Math.round((stats.completed / stats.totalEnrolled) * 100)
        : 0;
    const goalRate = stats.totalEnrolled > 0
        ? Math.round((stats.goalsMet / stats.totalEnrolled) * 100)
        : 0;

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Enrolled"
                    value={stats.totalEnrolled}
                    icon="👥"
                    color="blue"
                />
                <StatCard
                    label="Currently Active"
                    value={stats.currentlyActive}
                    icon="⚡"
                    color="green"
                />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    suffix={`(${completionRate}%)`}
                    icon="✅"
                    color="emerald"
                />
                <StatCard
                    label="Goals Met"
                    value={stats.goalsMet}
                    suffix={`(${goalRate}%)`}
                    icon="🎯"
                    color="purple"
                />
            </div>

            {/* Enrollment Funnel */}
            <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    📊 Step Performance
                </h3>

                {analytics?.stepStats && analytics.stepStats.length > 0 ? (
                    <div className="space-y-3">
                        {analytics.stepStats.map((step, index) => {
                            const total = step.completed + step.failed + step.pending;
                            const successRate = total > 0
                                ? Math.round((step.completed / total) * 100)
                                : 0;

                            return (
                                <div key={step.stepId} className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-foreground">
                                                {step.stepName}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {step.completed} completed • {successRate}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                                                style={{ width: `${successRate}%` }}
                                            />
                                        </div>
                                    </div>
                                    <StepTypeBadge type={step.stepType} />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No step data available yet.</p>
                        <p className="text-sm">Enroll contacts to see analytics.</p>
                    </div>
                )}
            </div>

            {/* Failure Stats */}
            {stats.failed > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                            <h4 className="font-medium text-red-600 dark:text-red-400">
                                {stats.failed} Failed Enrollments
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                Check workflow configuration and retry failed enrollments
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Sub-components
function StatCard({
    label,
    value,
    suffix,
    icon,
    color
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
        purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20",
    };

    return (
        <div className={`p-4 rounded-xl bg-gradient-to-br border ${colorClasses[color] || colorClasses.blue}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{icon}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {label}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">{value}</span>
                {suffix && (
                    <span className="text-sm text-muted-foreground">{suffix}</span>
                )}
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
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
            {label}
        </span>
    );
}
