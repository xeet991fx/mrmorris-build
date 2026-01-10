"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowPathIcon,
    ChevronRightIcon,
    ChevronDownIcon,
    GlobeAltIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { Users, Eye, UserCheck, TrendingUp, Activity, Globe, Zap } from "lucide-react";
import { getVisitors, getTrackingStats, Visitor, TrackingStats } from "@/lib/api/tracking";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

// Clean Stat Component - no boxy icons
function StatItem({ value, label, color, icon: Icon }: {
    value: string | number;
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
}) {
    return (
        <motion.div variants={itemVariants} className="flex items-center gap-3">
            <Icon className={cn("w-5 h-5", color)} />
            <div>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
            </div>
        </motion.div>
    );
}

// Event Pill Component
function EventPill({ type, count }: { type: string; count: number }) {
    const getColor = () => {
        switch (type) {
            case 'page_view': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600';
            case 'form_submit': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600';
            case 'click': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600';
            default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600';
        }
    };

    return (
        <span className={cn("px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-2", getColor())}>
            <span className="font-bold">{count.toLocaleString()}</span>
            <span className="capitalize">{type.replace('_', ' ')}</span>
        </span>
    );
}

// Visitor Card Component
function VisitorCard({ visitor, isExpanded, onToggle }: {
    visitor: Visitor;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <motion.div
            variants={itemVariants}
            className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden mb-2 last:mb-0"
        >
            {/* Main Row */}
            <div
                className="p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                onClick={onToggle}
            >
                {/* Status Dot */}
                <div className={cn(
                    "w-2.5 h-2.5 rounded-full flex-shrink-0",
                    visitor.contactId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
                )} />

                {/* Visitor Info */}
                <div className="flex-1 min-w-0">
                    {visitor.contactId ? (
                        <>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                {visitor.contactId.firstName} {visitor.contactId.lastName}
                            </p>
                            <p className="text-xs text-zinc-500 truncate">{visitor.contactId.email}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-sm font-medium text-zinc-500">Anonymous Visitor</p>
                            <p className="text-xs text-zinc-400 font-mono">{visitor.visitorId.slice(0, 10)}...</p>
                        </>
                    )}
                </div>

                {/* Status */}
                <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium hidden sm:inline",
                    visitor.contactId
                        ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                )}>
                    {visitor.contactId ? "Identified" : "Anonymous"}
                </span>

                {/* Quick Stats */}
                <div className="hidden md:flex items-center gap-6 text-xs text-zinc-500">
                    <div className="text-center">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{visitor.sessionCount}</span>
                        <span className="ml-1">sessions</span>
                    </div>
                    <div className="text-center">
                        <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{visitor.pageViewCount}</span>
                        <span className="ml-1">pages</span>
                    </div>
                </div>

                {/* Last Seen */}
                <p className="text-xs text-zinc-400 hidden lg:block">
                    {formatDistanceToNow(new Date(visitor.lastSeen), { addSuffix: true })}
                </p>

                {/* Chevron */}
                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronRightIcon className="w-4 h-4 text-zinc-400" />
                </motion.div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Globe className="w-4 h-4 text-blue-500" />
                                    <span className="text-zinc-600 dark:text-zinc-400 truncate">
                                        {visitor.websites?.[0] || "Unknown"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <TrendingUp className="w-4 h-4 text-purple-500" />
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        {visitor.firstUtmSource || visitor.firstSource || "Direct"}
                                    </span>
                                </div>
                                {visitor.firstUtmCampaign && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span className="text-zinc-600 dark:text-zinc-400 truncate">
                                            {visitor.firstUtmCampaign}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm">
                                    <ClockIcon className="w-4 h-4 text-emerald-500" />
                                    <span className="text-zinc-600 dark:text-zinc-400">
                                        First: {formatDistanceToNow(new Date(visitor.firstSeen), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default function VisitorsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [stats, setStats] = useState<TrackingStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filterType, setFilterType] = useState<"all" | "identified" | "anonymous">("all");
    const [minSessions, setMinSessions] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [workspaceId, filterType, minSessions]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [visitorsRes, statsRes] = await Promise.all([
                getVisitors(workspaceId, {
                    identified: filterType === "all" ? undefined : filterType === "identified",
                    minSessions: minSessions === "all" ? undefined : parseInt(minSessions),
                    limit: 50,
                }),
                getTrackingStats(workspaceId),
            ]);

            if (visitorsRes.success) setVisitors(visitorsRes.data);
            if (statsRes.success) setStats(statsRes.data);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">Loading visitors...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 sm:px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0"
            >
                <div>
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-500" />
                        Visitor Analytics
                    </h1>
                    <p className="text-sm text-zinc-500 mt-0.5">Track visitors and monitor conversions</p>
                </div>

                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Refresh
                </button>
            </motion.div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {/* Stats Row - Clean, no boxes */}
                {stats && (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-wrap items-center gap-6 sm:gap-10"
                    >
                        <StatItem
                            icon={Users}
                            value={stats.totalVisitors.toLocaleString()}
                            label="Total"
                            color="text-blue-500"
                        />
                        <div className="hidden sm:block w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                        <StatItem
                            icon={Eye}
                            value={stats.anonymousVisitors.toLocaleString()}
                            label="Anonymous"
                            color="text-zinc-500"
                        />
                        <div className="hidden sm:block w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                        <StatItem
                            icon={UserCheck}
                            value={stats.identifiedVisitors.toLocaleString()}
                            label="Identified"
                            color="text-emerald-500"
                        />
                        <div className="hidden sm:block w-px h-8 bg-zinc-200 dark:bg-zinc-700" />
                        <StatItem
                            icon={TrendingUp}
                            value={`${stats.conversionRate.toFixed(1)}%`}
                            label="Conversion"
                            color="text-purple-500"
                        />
                    </motion.div>
                )}

                {/* Event Pills */}
                {stats?.eventsByType && Object.keys(stats.eventsByType).length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex flex-wrap gap-2"
                    >
                        {Object.entries(stats.eventsByType).map(([type, count]) => (
                            <EventPill key={type} type={type} count={count} />
                        ))}
                    </motion.div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Type Filter Pills */}
                    <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
                        {(["all", "identified", "anonymous"] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all capitalize",
                                    filterType === type
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                {type}
                            </button>
                        ))}
                    </div>

                    {/* Sessions Filter */}
                    <select
                        value={minSessions}
                        onChange={(e) => setMinSessions(e.target.value)}
                        className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm border-0 focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="all">All Sessions</option>
                        <option value="2">2+ Sessions</option>
                        <option value="3">3+ Sessions</option>
                        <option value="5">5+ Sessions</option>
                    </select>
                </div>

                {/* Visitors List */}
                <div>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                        {visitors.length} Visitors
                    </p>

                    {visitors.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center justify-center py-16 text-center"
                        >
                            <Users className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No visitors yet</h3>
                            <p className="text-sm text-zinc-500 max-w-md">
                                Install the tracking script on your website to start tracking visitors.
                            </p>
                        </motion.div>
                    ) : (
                        <motion.div variants={containerVariants} initial="hidden" animate="visible">
                            {visitors.map((visitor) => (
                                <VisitorCard
                                    key={visitor._id}
                                    visitor={visitor}
                                    isExpanded={expandedId === visitor._id}
                                    onToggle={() => setExpandedId(expandedId === visitor._id ? null : visitor._id)}
                                />
                            ))}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
