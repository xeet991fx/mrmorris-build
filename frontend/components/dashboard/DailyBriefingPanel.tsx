"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
    SparklesIcon,
    ArrowPathIcon,
    CalendarDaysIcon,
    EnvelopeIcon,
    PhoneIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    CurrencyDollarIcon,
    LightBulbIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { getDashboardBriefing, DashboardBriefing } from "@/lib/api/dashboard";

interface DailyBriefingPanelProps {
    workspaceId: string;
    userName?: string;
}

interface BriefingData {
    greeting: string;
    summary: string;
    priorities: {
        title: string;
        type: "meeting" | "deal" | "task" | "email" | "follow_up";
        urgency: "high" | "medium" | "low";
        description: string;
        time?: string;
    }[];
    metrics: {
        label: string;
        value: string | number;
        change?: number;
        changeLabel?: string;
    }[];
    alerts: {
        type: "warning" | "success" | "info";
        message: string;
    }[];
    suggestedActions: {
        action: string;
        reason: string;
    }[];
}

export const DailyBriefingPanel: React.FC<DailyBriefingPanelProps> = ({
    workspaceId,
    userName = "there",
}) => {
    const router = useRouter();
    const [briefing, setBriefing] = useState<BriefingData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const getIcon = (type: string) => {
        const iconClass = "w-4 h-4";
        switch (type) {
            case "meeting": return <CalendarDaysIcon className={cn(iconClass, "text-blue-500")} />;
            case "deal": return <CurrencyDollarIcon className={cn(iconClass, "text-emerald-500")} />;
            case "task": return <CheckCircleIcon className={cn(iconClass, "text-violet-500")} />;
            case "email": return <EnvelopeIcon className={cn(iconClass, "text-orange-500")} />;
            case "follow_up": return <PhoneIcon className={cn(iconClass, "text-cyan-500")} />;
            default: return <ClockIcon className={cn(iconClass, "text-zinc-400")} />;
        }
    };

    const fetchBriefing = async () => {
        setIsLoading(true);
        try {
            const response = await getDashboardBriefing(workspaceId);
            if (response.success && response.data) {
                setBriefing(response.data as BriefingData);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsGenerating(true);
        try {
            const response = await getDashboardBriefing(workspaceId);
            if (response.success && response.data) {
                setBriefing(response.data as BriefingData);
                toast.success("Dashboard refreshed");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to refresh");
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchBriefing();
    }, [workspaceId]);

    const defaultBriefing: BriefingData = {
        greeting: `${getGreeting()}, ${userName}!`,
        summary: "Analyzing your workspace data to provide personalized insights...",
        priorities: [],
        metrics: [
            { label: "Pipeline Value", value: "—" },
            { label: "Open Deals", value: "—" },
            { label: "Meetings Today", value: "—" },
            { label: "Tasks Due", value: "—" },
        ],
        alerts: [],
        suggestedActions: [],
    };

    const displayBriefing: BriefingData = briefing || defaultBriefing;

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 text-zinc-400 py-12">
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading briefing...</span>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* AI Summary Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-4"
            >
                <div className="flex-shrink-0 w-1 h-full min-h-[60px] bg-emerald-500 rounded-full" />
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-emerald-500" />
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">AI Summary</span>
                        </div>
                        <button
                            onClick={handleRefresh}
                            disabled={isGenerating}
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors disabled:opacity-50"
                        >
                            <ArrowPathIcon className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                            Refresh
                        </button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
                        {displayBriefing.summary}
                    </p>
                </div>
            </motion.div>

            {/* Metrics Row */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {displayBriefing.metrics.map((metric, idx) => (
                    <div key={idx}>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">{metric.label}</p>
                        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{metric.value}</p>
                        {metric.change !== undefined && (
                            <p className={cn("text-xs mt-0.5", {
                                "text-emerald-500": metric.change > 0,
                                "text-red-500": metric.change < 0,
                                "text-zinc-400": metric.change === 0,
                            })}>
                                {metric.change > 0 ? '+' : ''}{metric.change}% {metric.changeLabel}
                            </p>
                        )}
                    </div>
                ))}
            </motion.div>

            {/* Divider */}
            <div className="border-t border-zinc-200 dark:border-zinc-800" />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Priorities */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                        Today's Priorities
                    </h3>
                    {displayBriefing.priorities.length === 0 ? (
                        <p className="text-sm text-zinc-400">No priorities for today</p>
                    ) : (
                        <div className="space-y-3">
                            {displayBriefing.priorities.map((priority, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        const routes: Record<string, string> = {
                                            meeting: `/projects/${workspaceId}/meetings`,
                                            deal: `/projects/${workspaceId}/pipelines`,
                                            task: `/projects/${workspaceId}/tasks`,
                                            email: `/projects/${workspaceId}/inbox`,
                                            follow_up: `/projects/${workspaceId}/contacts`,
                                        };
                                        if (routes[priority.type]) {
                                            router.push(routes[priority.type]);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-start gap-3 py-3 cursor-pointer group",
                                        "border-l-2 pl-4 -ml-4 transition-colors",
                                        priority.urgency === "high" && "border-red-500",
                                        priority.urgency === "medium" && "border-amber-500",
                                        priority.urgency === "low" && "border-zinc-300 dark:border-zinc-600"
                                    )}
                                >
                                    <span className="mt-0.5">{getIcon(priority.type)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                            {priority.title}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                            {priority.description}
                                        </p>
                                    </div>
                                    {priority.time && (
                                        <span className="text-xs text-zinc-400 flex-shrink-0">{priority.time}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {/* Suggestions & Alerts */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="space-y-6"
                >
                    {/* AI Suggestions */}
                    {displayBriefing.suggestedActions.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                                Suggestions
                            </h3>
                            <div className="space-y-2">
                                {displayBriefing.suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            toast.success(`Action: ${action.action}`);
                                            if (action.action.toLowerCase().includes('deal')) {
                                                router.push(`/projects/${workspaceId}/pipelines`);
                                            } else if (action.action.toLowerCase().includes('meeting')) {
                                                router.push(`/projects/${workspaceId}/meetings`);
                                            } else if (action.action.toLowerCase().includes('email')) {
                                                router.push(`/projects/${workspaceId}/inbox`);
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 py-2 text-left group"
                                    >
                                        <LightBulbIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-zinc-700 dark:text-zinc-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {action.action}
                                            </p>
                                            <p className="text-xs text-zinc-400 truncate">{action.reason}</p>
                                        </div>
                                        <ArrowRightIcon className="w-3.5 h-3.5 text-zinc-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Alerts */}
                    {displayBriefing.alerts.length > 0 && (
                        <div>
                            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
                                Alerts
                            </h3>
                            <div className="space-y-2">
                                {displayBriefing.alerts.map((alert, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "flex items-start gap-3 py-2 pl-3 border-l-2",
                                            alert.type === "warning" && "border-amber-500",
                                            alert.type === "success" && "border-emerald-500",
                                            alert.type === "info" && "border-blue-500"
                                        )}
                                    >
                                        {alert.type === "warning" && <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                                        {alert.type === "success" && <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                                        {alert.type === "info" && <SparklesIcon className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                                        <p className="text-sm text-zinc-600 dark:text-zinc-300">{alert.message}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default DailyBriefingPanel;
