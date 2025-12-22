"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
    ChartBarIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";
import {
    getReportsOverview,
    getReportsPipeline,
    getReportsActivity,
    getReportsEmail,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { ReportInsightsPanel } from "@/components/reports/ReportInsightsPanel";

// ============================================
// STAT CARD
// ============================================

function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: string;
}) {
    return (
        <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
                <div className={cn("p-2 rounded-lg", color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
    );
}

// ============================================
// PIPELINE CHART (Simple Bar)
// ============================================

function PipelineChart({ data }: { data: { _id: string; count: number; totalValue: number }[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="space-y-3">
            {data.map((item, i) => (
                <div key={item._id || i} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted-foreground truncate">
                        {item._id || "Unknown"}
                    </span>
                    <div className="flex-1 h-6 bg-muted/50 rounded overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-[#9ACD32] to-[#7CB342] rounded transition-all duration-500"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                    </div>
                    <span className="w-12 text-sm font-medium text-foreground text-right">
                        {item.count}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ============================================
// MAIN PAGE
// ============================================

export default function ReportsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [overview, setOverview] = useState<any>(null);
    const [pipeline, setPipeline] = useState<any>(null);
    const [email, setEmail] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const { track } = useInsightTracking({
        workspaceId,
        page: 'reports',
        enabled: !!workspaceId,
    });

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [overviewRes, pipelineRes, emailRes] = await Promise.all([
                    getReportsOverview(workspaceId),
                    getReportsPipeline(workspaceId),
                    getReportsEmail(workspaceId),
                ]);

                if (overviewRes.success) setOverview(overviewRes.data);
                if (pipelineRes.success) setPipeline(pipelineRes.data);
                if (emailRes.success) setEmail(emailRes.data);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
            }
            setIsLoading(false);
        };

        if (workspaceId) fetchData();
    }, [workspaceId]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-card/95 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse" />
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-card/95">
            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center sticky top-0 z-10 bg-card">
                <div className="flex items-center gap-3">
                    <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
                    <h1 className="text-lg font-semibold text-foreground">Reports</h1>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                {/* Overview Stats */}
                {overview && (
                    <>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground mb-4">Overview</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard
                                    title="Total Contacts"
                                    value={overview.contacts?.total || 0}
                                    subtitle={`+${overview.contacts?.newThisMonth || 0} this month`}
                                    icon={UserGroupIcon}
                                    color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                />
                                <StatCard
                                    title="Open Deals"
                                    value={overview.deals?.open || 0}
                                    subtitle={`${overview.deals?.total || 0} total`}
                                    icon={CurrencyDollarIcon}
                                    color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                />
                                <StatCard
                                    title="Revenue Won"
                                    value={`$${(overview.deals?.wonValue || 0).toLocaleString()}`}
                                    icon={CurrencyDollarIcon}
                                    color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                />
                                <StatCard
                                    title="Tasks Completed"
                                    value={`${overview.tasks?.completionRate || 0}%`}
                                    subtitle={`${overview.tasks?.completed || 0} of ${overview.tasks?.total || 0}`}
                                    icon={CheckCircleIcon}
                                    color="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Pipeline & Win Rate */}
                {pipeline && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-semibold text-foreground mb-4">Pipeline by Stage</h3>
                            {pipeline.byStage?.length > 0 ? (
                                <PipelineChart data={pipeline.byStage} />
                            ) : (
                                <p className="text-muted-foreground text-sm">No deals yet</p>
                            )}
                        </div>
                        <div className="bg-card border border-border rounded-xl p-6">
                            <h3 className="font-semibold text-foreground mb-4">Win Rate (90 days)</h3>
                            <div className="flex items-center justify-center h-40">
                                <div className="text-center">
                                    <p className="text-5xl font-bold text-[#9ACD32]">{pipeline.winRate || 0}%</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {pipeline.wonCount || 0} won / {pipeline.lostCount || 0} lost
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Email Performance */}
                {email && (
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h3 className="font-semibold text-foreground mb-4">Email Performance</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4">
                                <p className="text-3xl font-bold text-foreground">{email.totalSent || 0}</p>
                                <p className="text-sm text-muted-foreground">Emails Sent</p>
                            </div>
                            <div className="text-center p-4">
                                <p className="text-3xl font-bold text-blue-500">{email.openRate || 0}%</p>
                                <p className="text-sm text-muted-foreground">Open Rate</p>
                            </div>
                            <div className="text-center p-4">
                                <p className="text-3xl font-bold text-green-500">{email.clickRate || 0}%</p>
                                <p className="text-sm text-muted-foreground">Click Rate</p>
                            </div>
                            <div className="text-center p-4">
                                <p className="text-3xl font-bold text-purple-500">{email.replyRate || 0}%</p>
                                <p className="text-sm text-muted-foreground">Reply Rate</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* AI Analytics Intelligence */}
                <ReportInsightsPanel workspaceId={workspaceId} />
            </div>
        </div>
    );
}
