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
    ClockIcon,
    BoltIcon,
    RocketLaunchIcon,
    CpuChipIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface QuickAction {
    label: string;
    description: string;
    icon: React.ReactNode;
    href: string;
    gradient: string;
    hoverGradient: string;
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

    const quickActions: QuickAction[] = [
        {
            label: "Contacts",
            description: "Manage your leads & customers",
            icon: <UserGroupIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/contacts`,
            gradient: "from-blue-500/20 to-blue-600/10",
            hoverGradient: "hover:from-blue-500/30 hover:to-blue-600/20",
        },
        {
            label: "Inbox",
            description: "View emails & conversations",
            icon: <EnvelopeIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/inbox`,
            gradient: "from-emerald-500/20 to-emerald-600/10",
            hoverGradient: "hover:from-emerald-500/30 hover:to-emerald-600/20",
        },
        {
            label: "Meetings",
            description: "Calendar & scheduling",
            icon: <CalendarDaysIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/meetings`,
            gradient: "from-purple-500/20 to-purple-600/10",
            hoverGradient: "hover:from-purple-500/30 hover:to-purple-600/20",
        },
        {
            label: "Pipelines",
            description: "Track deals & opportunities",
            icon: <BriefcaseIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/pipelines`,
            gradient: "from-orange-500/20 to-orange-600/10",
            hoverGradient: "hover:from-orange-500/30 hover:to-orange-600/20",
        },
        {
            label: "Workflows",
            description: "Automate your processes",
            icon: <BoltIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/workflows`,
            gradient: "from-cyan-500/20 to-cyan-600/10",
            hoverGradient: "hover:from-cyan-500/30 hover:to-cyan-600/20",
        },
        {
            label: "Campaigns",
            description: "Email marketing campaigns",
            icon: <RocketLaunchIcon className="w-6 h-6" />,
            href: `/projects/${workspaceId}/campaigns`,
            gradient: "from-pink-500/20 to-pink-600/10",
            hoverGradient: "hover:from-pink-500/30 hover:to-pink-600/20",
        },
    ];

    const aiModules = [
        { label: "Data Quality", icon: <CpuChipIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/data-quality`, color: "text-blue-400" },
        { label: "Lead Scoring", icon: <ArrowTrendingUpIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/lead-scores`, color: "text-green-400" },
        { label: "Analytics", icon: <ChartBarIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/analytics`, color: "text-purple-400" },
        { label: "Tickets", icon: <TicketIcon className="w-5 h-5" />, href: `/projects/${workspaceId}/tickets`, color: "text-orange-400" },
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                    <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="h-14 px-6 border-b border-border/50 flex items-center justify-between sticky top-0 z-10 bg-background/80 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4"
                >
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                            <SparklesIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">Dashboard</h1>
                            {currentWorkspace && (
                                <p className="text-xs text-muted-foreground">{currentWorkspace.name}</p>
                            )}
                        </div>
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                    <ClockIcon className="w-4 h-4" />
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </motion.div>
            </div>

            {/* Main Content - Full Width */}
            <div className="p-6">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column - AI Briefing (Takes 2 columns on XL) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="xl:col-span-2"
                    >
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-xl shadow-black/5">
                            <DailyBriefingPanel
                                workspaceId={workspaceId}
                                userName={currentWorkspace?.name?.split(' ')[0] || 'there'}
                            />
                        </div>
                    </motion.div>

                    {/* Right Column - Quick Actions & AI Modules */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        {/* Quick Actions */}
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 shadow-xl shadow-black/5">
                            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {quickActions.map((action, idx) => (
                                    <Link key={action.label} href={action.href}>
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.15 + idx * 0.05 }}
                                            className={cn(
                                                "p-4 rounded-xl bg-gradient-to-br border border-border/30 transition-all duration-300 cursor-pointer group",
                                                action.gradient,
                                                action.hoverGradient,
                                                "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                                            )}
                                        >
                                            <div className="text-foreground mb-2 group-hover:scale-110 transition-transform">
                                                {action.icon}
                                            </div>
                                            <p className="text-sm font-medium text-foreground">{action.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* AI Modules */}
                        <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 shadow-xl shadow-black/5">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">AI Modules</h2>
                            </div>
                            <div className="space-y-2">
                                {aiModules.map((module, idx) => (
                                    <Link key={module.label} href={module.href}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.3 + idx * 0.05 }}
                                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-all cursor-pointer group"
                                        >
                                            <div className={cn("p-2 rounded-lg bg-muted/50 group-hover:bg-muted", module.color)}>
                                                {module.icon}
                                            </div>
                                            <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                                                {module.label}
                                            </span>
                                        </motion.div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
