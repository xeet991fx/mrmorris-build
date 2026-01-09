"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { DailyBriefingPanel } from "@/components/dashboard/DailyBriefingPanel";
import {
    UserGroupIcon,
    EnvelopeIcon,
    CalendarDaysIcon,
    ChartBarIcon,
    BriefcaseIcon,
    TicketIcon,
    SparklesIcon,
    ArrowTrendingUpIcon,
    BoltIcon,
    RocketLaunchIcon,
    CpuChipIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickAction {
    label: string;
    icon: React.ReactNode;
    href: string;
}

export default function DashboardPage() {
    const params = useParams();
    const workspaceId = params.id as string;
    const { currentWorkspace, fetchWorkspace } = useWorkspaceStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (workspaceId) {
            fetchWorkspace(workspaceId)
                .finally(() => setIsLoading(false));
        }
    }, [workspaceId, fetchWorkspace]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 18) return "Good afternoon";
        return "Good evening";
    };

    const quickActions: QuickAction[] = [
        { label: "Contacts", icon: <UserGroupIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/contacts` },
        { label: "Inbox", icon: <EnvelopeIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/inbox` },
        { label: "Meetings", icon: <CalendarDaysIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/meetings` },
        { label: "Pipelines", icon: <BriefcaseIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/pipelines` },
        { label: "Workflows", icon: <BoltIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/workflows` },
        { label: "Campaigns", icon: <RocketLaunchIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/campaigns` },
    ];

    const aiModules = [
        { label: "Data Quality", icon: <CpuChipIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/data-quality` },
        { label: "Lead Scoring", icon: <ArrowTrendingUpIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/lead-scores` },
        { label: "Analytics", icon: <ChartBarIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/analytics` },
        { label: "Tickets", icon: <TicketIcon className="w-4 h-4" />, href: `/projects/${workspaceId}/tickets` },
    ];

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            {/* Hero Section - Clean Greeting */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 sm:pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">
                        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                        {getGreeting()}, <span className="text-emerald-600 dark:text-emerald-400">{currentWorkspace?.name?.split(' ')[0] || 'there'}</span>
                    </h1>
                </motion.div>

                {/* Quick Actions - Horizontal Pills */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="mt-6 sm:mt-8 flex flex-wrap gap-2"
                >
                    {quickActions.map((action, idx) => (
                        <Link key={action.label} href={action.href}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.15 + idx * 0.03 }}
                                className={cn(
                                    "flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2",
                                    "bg-zinc-100 dark:bg-zinc-800/50",
                                    "hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
                                    "text-zinc-700 dark:text-zinc-300",
                                    "hover:text-emerald-700 dark:hover:text-emerald-400",
                                    "rounded-full transition-all duration-200 cursor-pointer",
                                    "border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                                )}
                            >
                                <span className="opacity-70">{action.icon}</span>
                                <span className="text-sm font-medium">{action.label}</span>
                            </motion.div>
                        </Link>
                    ))}
                </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Main Content Grid */}
            <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* AI Briefing - Full Width or 2 Cols */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="xl:col-span-2"
                >
                    <div className="flex items-center gap-2 mb-4">
                        <SparklesIcon className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                            Daily Briefing
                        </h2>
                    </div>
                    <DailyBriefingPanel
                        workspaceId={workspaceId}
                        userName={currentWorkspace?.name?.split(' ')[0] || 'there'}
                    />
                </motion.div>

                {/* AI Modules Sidebar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                        AI Tools
                    </h2>
                    <div className="space-y-1">
                        {aiModules.map((module, idx) => (
                            <Link key={module.label} href={module.href}>
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 + idx * 0.05 }}
                                    className={cn(
                                        "flex items-center justify-between py-3 px-4 -mx-4",
                                        "hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                                        "text-zinc-700 dark:text-zinc-300",
                                        "group cursor-pointer transition-colors rounded-lg"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-zinc-400 group-hover:text-emerald-500 transition-colors">
                                            {module.icon}
                                        </span>
                                        <span className="text-sm font-medium group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                            {module.label}
                                        </span>
                                    </div>
                                    <ArrowRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                                </motion.div>
                            </Link>
                        ))}
                    </div>

                    {/* Stats Section */}
                    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                            Quick Stats
                        </h2>
                        <div className="space-y-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex items-center justify-between"
                            >
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">Active deals</span>
                                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">—</span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.55 }}
                                className="flex items-center justify-between"
                            >
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">Pending tasks</span>
                                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">—</span>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                className="flex items-center justify-between"
                            >
                                <span className="text-sm text-zinc-500 dark:text-zinc-400">This month</span>
                                <span className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">—</span>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
