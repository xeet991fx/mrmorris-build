"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
    GlobeAltIcon,
    UserGroupIcon,
    DocumentTextIcon,
    EnvelopeIcon,
    PhoneIcon,
    ArrowTrendingUpIcon,
    SparklesIcon,
    BoltIcon,
    ChartBarIcon,
    ClockIcon,
    ArrowRightIcon,
    PlusIcon,
    EyeIcon,
    CursorArrowRaysIcon,
} from "@heroicons/react/24/outline";
import axios from "@/lib/axios";
import { cn } from "@/lib/utils";

interface LeadActivity {
    _id: string;
    type: "form_submit" | "page_view" | "identify" | "contact_created";
    source: string;
    email?: string;
    name?: string;
    url?: string;
    timestamp: string;
}

interface SourceMetrics {
    source: string;
    count: number;
    percentage: number;
}

interface TodayKPIs {
    newLeads: number;
    pageViews: number;
    formSubmissions: number;
    emailsSent: number;
    meetingsBooked: number;
}

interface HotLead {
    _id: string;
    email: string;
    name?: string;
    company?: string;
    intentScore: number;
    lastActivity: string;
}

export default function CommandCenterPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [kpis, setKpis] = useState<TodayKPIs>({
        newLeads: 0,
        pageViews: 0,
        formSubmissions: 0,
        emailsSent: 0,
        meetingsBooked: 0,
    });
    const [sources, setSources] = useState<SourceMetrics[]>([]);
    const [recentActivity, setRecentActivity] = useState<LeadActivity[]>([]);
    const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
    const [activeVisitors, setActiveVisitors] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = today.toISOString();

            const [kpisRes, sourcesRes, activityRes, hotLeadsRes, realtimeRes] = await Promise.all([
                axios.get(`/workspaces/${workspaceId}/command-center/kpis?startDate=${startDate}`).catch(() => ({ data: { success: false } })),
                axios.get(`/workspaces/${workspaceId}/command-center/sources?startDate=${startDate}`).catch(() => ({ data: { success: false } })),
                axios.get(`/workspaces/${workspaceId}/command-center/activity?limit=15`).catch(() => ({ data: { success: false } })),
                axios.get(`/workspaces/${workspaceId}/intent/hot-leads?limit=5`).catch(() => ({ data: { success: false } })),
                axios.get(`/workspaces/${workspaceId}/analytics/website/realtime`).catch(() => ({ data: { success: false } })),
            ]);

            if (kpisRes.data?.success) setKpis(kpisRes.data.data);
            if (sourcesRes.data?.success) setSources(sourcesRes.data.data);
            if (activityRes.data?.success) setRecentActivity(activityRes.data.data);
            if (hotLeadsRes.data?.success) setHotLeads(hotLeadsRes.data.data?.slice(0, 5) || []);
            if (realtimeRes.data?.success) setActiveVisitors(realtimeRes.data.data.activeVisitors);
        } catch (error) {
            console.error("Command center error:", error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const quickActions = [
        { label: "New Form", icon: <DocumentTextIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/forms/new` },
        { label: "New Page", icon: <GlobeAltIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/pages/new` },
        { label: "View Contacts", icon: <UserGroupIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/contacts` },
        { label: "Website Analytics", icon: <ChartBarIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/website-analytics` },
    ];

    const sourceIcons: Record<string, React.ReactNode> = {
        "Direct": <CursorArrowRaysIcon className="w-4 h-4" />,
        "Organic Search": <GlobeAltIcon className="w-4 h-4" />,
        "Social": <UserGroupIcon className="w-4 h-4" />,
        "Referral": <ArrowRightIcon className="w-4 h-4" />,
        "Form": <DocumentTextIcon className="w-4 h-4" />,
        "Landing Page": <EyeIcon className="w-4 h-4" />,
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading command center...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <BoltIcon className="w-8 h-8 text-amber-500" />
                            Command Center
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            All lead sources in one view
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            {activeVisitors} active now
                        </span>
                    </div>
                </div>
            </div>

            {/* Today's KPIs */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <KPICard label="New Leads" value={kpis.newLeads} icon={<UserGroupIcon className="w-5 h-5" />} color="emerald" />
                    <KPICard label="Page Views" value={kpis.pageViews} icon={<EyeIcon className="w-5 h-5" />} color="blue" />
                    <KPICard label="Form Submits" value={kpis.formSubmissions} icon={<DocumentTextIcon className="w-5 h-5" />} color="violet" />
                    <KPICard label="Emails Sent" value={kpis.emailsSent} icon={<EnvelopeIcon className="w-5 h-5" />} color="amber" />
                    <KPICard label="Meetings" value={kpis.meetingsBooked} icon={<ClockIcon className="w-5 h-5" />} color="rose" />
                </div>
            </div>

            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Main Content */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lead Sources */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-1">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <ArrowTrendingUpIcon className="w-4 h-4" />
                        Lead Sources (Today)
                    </h3>
                    <div className="space-y-3">
                        {sources.length > 0 ? sources.map((source, i) => (
                            <div key={i} className="flex items-center justify-between py-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-zinc-400">{sourceIcons[source.source] || <GlobeAltIcon className="w-4 h-4" />}</span>
                                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{source.source}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{source.count}</span>
                                    <span className="text-xs text-zinc-400">({source.percentage}%)</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-sm text-zinc-400 py-4 text-center">No data yet today</p>
                        )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4">Quick Actions</h3>
                        <div className="space-y-2">
                            {quickActions.map((action) => (
                                <Link key={action.label} href={action.href}>
                                    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer group">
                                        <span className="text-zinc-400 group-hover:text-emerald-500">{action.icon}</span>
                                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{action.label}</span>
                                        <ArrowRightIcon className="w-3 h-3 ml-auto text-zinc-300 group-hover:text-emerald-500" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* Recent Activity Feed */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-1">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" />
                        Recent Activity
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {recentActivity.length > 0 ? recentActivity.map((activity) => (
                            <div key={activity._id} className="flex items-start gap-3 py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                                <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                                    activity.type === "form_submit" ? "bg-violet-100 text-violet-600" :
                                        activity.type === "identify" ? "bg-emerald-100 text-emerald-600" :
                                            activity.type === "contact_created" ? "bg-blue-100 text-blue-600" :
                                                "bg-zinc-100 text-zinc-600"
                                )}>
                                    {activity.type === "form_submit" ? <DocumentTextIcon className="w-4 h-4" /> :
                                        activity.type === "identify" ? <UserGroupIcon className="w-4 h-4" /> :
                                            activity.type === "contact_created" ? <PlusIcon className="w-4 h-4" /> :
                                                <EyeIcon className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {activity.email || activity.name || "Anonymous"}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {activity.type === "form_submit" ? "Submitted form" :
                                            activity.type === "identify" ? "Identified" :
                                                activity.type === "contact_created" ? "New contact" :
                                                    `Viewed ${activity.url?.split("/").pop() || "page"}`}
                                    </p>
                                </div>
                                <span className="text-xs text-zinc-400 flex-shrink-0">
                                    {formatTime(activity.timestamp)}
                                </span>
                            </div>
                        )) : (
                            <p className="text-sm text-zinc-400 py-4 text-center">No recent activity</p>
                        )}
                    </div>
                </motion.div>

                {/* Hot Leads */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-1">
                    <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        Hot Leads
                    </h3>
                    <div className="space-y-3">
                        {hotLeads.length > 0 ? hotLeads.map((lead) => (
                            <Link key={lead._id} href={`/projects/${workspaceId}/contacts/${lead._id}`}>
                                <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                {lead.name || lead.email}
                                            </p>
                                            {lead.company && (
                                                <p className="text-xs text-zinc-500">{lead.company}</p>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-bold",
                                            lead.intentScore >= 80 ? "bg-red-100 text-red-700" :
                                                lead.intentScore >= 60 ? "bg-amber-100 text-amber-700" :
                                                    "bg-emerald-100 text-emerald-700"
                                        )}>
                                            {lead.intentScore}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <p className="text-sm text-zinc-400 py-4 text-center">No hot leads yet</p>
                        )}
                    </div>
                    <Link href={`/projects/${workspaceId}/intent/hot-leads`}>
                        <div className="mt-4 text-center text-sm text-emerald-600 hover:text-emerald-700 cursor-pointer">
                            View all hot leads
                        </div>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
}

function KPICard({ label, value, icon, color }: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: "emerald" | "blue" | "violet" | "amber" | "rose";
}) {
    const colorClasses = {
        emerald: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600",
        blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-600",
        violet: "bg-violet-100 dark:bg-violet-900/30 text-violet-600",
        amber: "bg-amber-100 dark:bg-amber-900/30 text-amber-600",
        rose: "bg-rose-100 dark:bg-rose-900/30 text-rose-600",
    };

    return (
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", colorClasses[color])}>
                {icon}
            </div>
            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
            <p className="text-sm text-zinc-500 mt-1">{label}</p>
        </div>
    );
}

function formatTime(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
}
