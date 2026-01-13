"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ChartBarIcon,
    UserGroupIcon,
    CurrencyDollarIcon,
    CheckCircleIcon,
    SparklesIcon,
    ArrowPathIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    LinkIcon,
} from "@heroicons/react/24/outline";
import {
    getReportsOverview,
    getReportsPipeline,
    getReportsActivity,
    getReportsEmail,
    getReportsEmailDetails,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";
import { useInsightTracking } from "@/hooks/useInsightTracking";
import { ReportInsightsPanel } from "@/components/reports/ReportInsightsPanel";

// ============================================
// PIPELINE CHART (Clean Horizontal Bars)
// ============================================

function PipelineChart({ data }: { data: { _id: string; count: number; totalValue: number }[] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="space-y-3">
            {data.map((item, i) => (
                <div key={item._id || i} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                            {item._id || "Unknown"}
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            {item.count}
                        </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(item.count / maxCount) * 100}%` }}
                            transition={{ duration: 0.6, delay: i * 0.1 }}
                            className="h-full bg-emerald-500 rounded-full"
                        />
                    </div>
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
    const [emailDetails, setEmailDetails] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showInsights, setShowInsights] = useState(false);
    const [showEmailDetails, setShowEmailDetails] = useState(false);
    const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

    const { track } = useInsightTracking({
        workspaceId,
        page: 'reports',
        enabled: !!workspaceId,
    });

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

    const fetchEmailDetails = async () => {
        try {
            const detailsRes = await getReportsEmailDetails(workspaceId);
            if (detailsRes.success) setEmailDetails(detailsRes.data);
        } catch (error) {
            console.error("Failed to fetch email details:", error);
        }
    };

    useEffect(() => {
        if (workspaceId) fetchData();
    }, [workspaceId]);

    if (isLoading) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6">
                    <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse mb-8" />
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-24 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
                        ))}
                    </div>
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
                            Reports
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Business performance at a glance
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setShowInsights(!showInsights)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors",
                                showInsights
                                    ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                            )}
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">AI Insights</span>
                        </button>
                        <button
                            onClick={fetchData}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                {overview && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-2xl font-bold text-blue-500">{overview.contacts?.total || 0}</span>
                            <span className="text-sm text-zinc-500">contacts</span>
                        </div>
                        <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-2xl font-bold text-emerald-500">{overview.deals?.open || 0}</span>
                            <span className="text-sm text-zinc-500">open deals</span>
                        </div>
                        <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                ${((overview.deals?.wonValue || 0) / 1000).toFixed(0)}k
                            </span>
                            <span className="text-sm text-zinc-500">revenue</span>
                        </div>
                        <div className="hidden sm:block w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-amber-500">{overview.tasks?.completionRate || 0}%</span>
                            <span className="text-sm text-zinc-500">tasks done</span>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
                {/* AI Insights Panel */}
                {showInsights && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                            <ReportInsightsPanel workspaceId={workspaceId} />
                        </div>
                    </motion.div>
                )}

                {/* Pipeline & Win Rate */}
                {pipeline && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
                    >
                        {/* Pipeline by Stage */}
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                                Pipeline by Stage
                            </h3>
                            {pipeline.byStage?.length > 0 ? (
                                <PipelineChart data={pipeline.byStage} />
                            ) : (
                                <p className="text-sm text-zinc-400">No deals yet</p>
                            )}
                        </div>

                        {/* Win Rate */}
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                                Win Rate (90 days)
                            </h3>
                            <div className="flex items-center gap-6">
                                <div className="relative w-28 h-28">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        <path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            className="text-zinc-100 dark:text-zinc-800"
                                        />
                                        <motion.path
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            strokeDasharray={`${pipeline.winRate || 0}, 100`}
                                            strokeLinecap="round"
                                            className="text-emerald-500"
                                            initial={{ strokeDasharray: "0, 100" }}
                                            animate={{ strokeDasharray: `${pipeline.winRate || 0}, 100` }}
                                            transition={{ duration: 1, delay: 0.3 }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                            {pipeline.winRate || 0}%
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{pipeline.wonCount || 0} won</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{pipeline.lostCount || 0} lost</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Email Performance */}
                {email && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Email Performance
                            </h3>
                            <button
                                onClick={() => {
                                    setShowEmailDetails(!showEmailDetails);
                                    if (!showEmailDetails && !emailDetails) {
                                        fetchEmailDetails();
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                            >
                                {showEmailDetails ? (
                                    <>
                                        <ChevronUpIcon className="w-4 h-4" />
                                        Hide Details
                                    </>
                                ) : (
                                    <>
                                        <ChevronDownIcon className="w-4 h-4" />
                                        Show Details
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                            <div className="text-center py-4">
                                <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{email.totalSent || 0}</p>
                                <p className="text-sm text-zinc-500 mt-1">Sent</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-3xl font-bold text-blue-500">{email.openRate || 0}%</p>
                                <p className="text-sm text-zinc-500 mt-1">Open Rate</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-3xl font-bold text-emerald-500">{email.clickRate || 0}%</p>
                                <p className="text-sm text-zinc-500 mt-1">Click Rate</p>
                            </div>
                            <div className="text-center py-4">
                                <p className="text-3xl font-bold text-violet-500">{email.replyRate || 0}%</p>
                                <p className="text-sm text-zinc-500 mt-1">Reply Rate</p>
                            </div>
                        </div>

                        {/* Email Details Table */}
                        <AnimatePresence>
                            {showEmailDetails && emailDetails && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-6 overflow-hidden"
                                >
                                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4">
                                        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                                            Recent Emails ({emailDetails.totalCount})
                                        </h4>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {emailDetails.emails?.map((emailItem: any) => (
                                                <div
                                                    key={emailItem._id}
                                                    className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h5 className="font-medium text-zinc-900 dark:text-zinc-100">
                                                                    {emailItem.subject}
                                                                </h5>
                                                                {emailItem.opened && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                                        Opened
                                                                    </span>
                                                                )}
                                                                {emailItem.clicked && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                                                        Clicked
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                                To: {emailItem.toEmail} • {new Date(emailItem.sentAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        {emailItem.linkClicks && emailItem.linkClicks.length > 0 && (
                                                            <button
                                                                onClick={() => setExpandedEmailId(expandedEmailId === emailItem._id ? null : emailItem._id)}
                                                                className="ml-4 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                                            >
                                                                {expandedEmailId === emailItem._id ? (
                                                                    <ChevronUpIcon className="w-5 h-5" />
                                                                ) : (
                                                                    <ChevronDownIcon className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Link Clicks Details */}
                                                    <AnimatePresence>
                                                        {expandedEmailId === emailItem._id && emailItem.linkClicks && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: "auto" }}
                                                                exit={{ opacity: 0, height: 0 }}
                                                                className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700"
                                                            >
                                                                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-2">
                                                                    Link Clicks
                                                                </p>
                                                                <div className="space-y-2">
                                                                    {emailItem.linkClicks.map((click: any, idx: number) => (
                                                                        <div
                                                                            key={idx}
                                                                            className="flex items-start gap-2 text-sm"
                                                                        >
                                                                            <LinkIcon className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-zinc-700 dark:text-zinc-300 truncate">
                                                                                    {click.url}
                                                                                </p>
                                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                                    {click.clickCount} {click.clickCount === 1 ? 'click' : 'clicks'} • Last: {new Date(click.clickedAt).toLocaleString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Link Performance Summary */}
                                        {emailDetails.linkPerformance && emailDetails.linkPerformance.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                                                <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-4">
                                                    Top Performing Links
                                                </h4>
                                                <div className="space-y-2">
                                                    {emailDetails.linkPerformance.slice(0, 5).map((link: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700"
                                                        >
                                                            <div className="flex-1 min-w-0 mr-4">
                                                                <p className="text-sm text-zinc-700 dark:text-zinc-300 truncate">
                                                                    {link.url || link._id}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    {link.uniqueEmailCount} {link.uniqueEmailCount === 1 ? 'email' : 'emails'}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-lg font-bold text-emerald-500">
                                                                    {link.totalClicks}
                                                                </p>
                                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                                    clicks
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
