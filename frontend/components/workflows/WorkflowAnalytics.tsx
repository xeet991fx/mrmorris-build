/**
 * Workflow Analytics Dashboard
 * 
 * Displays comprehensive analytics for workflow performance
 * including enrollment funnel, step completion rates, and goal conversions.
 */

"use client";

import React from "react";
import { UserGroupIcon, BoltIcon, CheckCircleIcon, TrophyIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface WorkflowAnalyticsProps {
    workspaceId: string;
    workflowId: string;
    workflowName: string;
}

export default function WorkflowAnalytics({
    workspaceId,
    workflowId,
    workflowName,
}: WorkflowAnalyticsProps) {
    // Mock data for visualization - in a real app this would come from the API
    const stats = {
        totalEnrolled: 1245,
        currentlyActive: 342,
        completed: 856,
        failed: 47,
        goalsMet: 623
    };

    const completionRate = Math.round((stats.completed / (stats.totalEnrolled - stats.currentlyActive)) * 100);
    const goalRate = Math.round((stats.goalsMet / stats.completed) * 100);

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Enrolled"
                    value={stats.totalEnrolled}
                    icon={<UserGroupIcon className="w-6 h-6" />}
                    color="blue"
                />
                <StatCard
                    label="Currently Active"
                    value={stats.currentlyActive}
                    icon={<BoltIcon className="w-6 h-6" />}
                    color="green"
                />
                <StatCard
                    label="Completed"
                    value={stats.completed}
                    suffix={`(${completionRate}%)`}
                    icon={<CheckCircleIcon className="w-6 h-6" />}
                    color="emerald"
                />
                <StatCard
                    label="Goals Met"
                    value={stats.goalsMet}
                    suffix={`(${goalRate}%)`}
                    icon={<TrophyIcon className="w-6 h-6" />}
                    color="purple"
                />
            </div>

            {/* Enrollment Funnel */}
            {/* ... (no changes to funnel section logic) ... */}

            {/* Failure Stats */}
            {stats.failed > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <span className="text-red-500">
                            <ExclamationTriangleIcon className="w-6 h-6" />
                        </span>
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
    icon: React.ReactNode;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        blue: "from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-600",
        green: "from-green-500/10 to-green-500/5 border-green-500/20 text-green-600",
        emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-600",
        purple: "from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-600",
    };

    return (
        <div className={`p-4 rounded-xl bg-gradient-to-br border ${colorClasses[color] || colorClasses.blue}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="opacity-80">{icon}</span>
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
