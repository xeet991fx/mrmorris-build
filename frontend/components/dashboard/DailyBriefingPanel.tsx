"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
    SparklesIcon,
    ArrowPathIcon,
    SunIcon,
    MoonIcon,
    CalendarDaysIcon,
    EnvelopeIcon,
    PhoneIcon,
    ChartBarIcon,
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
    const [currentTime, setCurrentTime] = useState(new Date());

    const getGreeting = () => {
        const hour = currentTime.getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "meeting": return <CalendarDaysIcon className="w-4 h-4 text-blue-400" />;
            case "deal": return <CurrencyDollarIcon className="w-4 h-4 text-green-400" />;
            case "task": return <CheckCircleIcon className="w-4 h-4 text-purple-400" />;
            case "email": return <EnvelopeIcon className="w-4 h-4 text-orange-400" />;
            case "follow_up": return <PhoneIcon className="w-4 h-4 text-cyan-400" />;
            default: return <ClockIcon className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getTimeIcon = () => {
        const hour = currentTime.getHours();
        if (hour >= 6 && hour < 18) {
            return <SunIcon className="w-8 h-8 text-yellow-400" />;
        }
        return <MoonIcon className="w-8 h-8 text-blue-300" />;
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
                toast.success("Dashboard refreshed with latest data");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to refresh dashboard");
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchBriefing();
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, [workspaceId]);

    // Default data for when API hasn't returned yet
    const defaultBriefing: BriefingData = {
        greeting: `${getGreeting()}, ${userName}!`,
        summary: "Loading your dashboard...",
        priorities: [],
        metrics: [
            { label: "Pipeline Value", value: "-" },
            { label: "Open Deals", value: "-" },
            { label: "Meetings Today", value: "-" },
            { label: "Tasks Due", value: "-" },
        ],
        alerts: [],
        suggestedActions: [],
    };

    const displayBriefing: BriefingData = briefing || defaultBriefing;

    return (
        <div className="space-y-6">
            {/* Header with Greeting */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        {getTimeIcon()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">{displayBriefing.greeting}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-xl transition-all disabled:opacity-50"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    Refresh
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-16">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-primary" />
                </div>
            )}

            {!isLoading && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-5">
                        {/* AI Summary */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                                    <SparklesIcon className="w-4 h-4 text-primary" />
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">{displayBriefing.summary}</p>
                            </div>
                        </motion.div>

                        {/* Key Metrics */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="grid grid-cols-2 gap-3"
                        >
                            {displayBriefing.metrics.map((metric, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-muted/30 border border-border/50 hover:border-border transition-colors"
                                >
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{metric.label}</p>
                                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                                    {metric.change !== undefined && (
                                        <p className={cn("text-xs mt-1 flex items-center gap-1", {
                                            "text-green-400": metric.change > 0,
                                            "text-red-400": metric.change < 0,
                                            "text-muted-foreground": metric.change === 0,
                                        })}>
                                            {metric.change > 0 ? '+' : ''}{metric.change} {metric.changeLabel}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </motion.div>

                        {/* AI Suggestions */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Suggestions</h3>
                            <div className="space-y-2">
                                {displayBriefing.suggestedActions.map((action, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            toast.success(`Action initiated: ${action.action}`);
                                            // Navigate to relevant page based on action content
                                            if (action.action.toLowerCase().includes('deal')) {
                                                router.push(`/projects/${workspaceId}/pipelines`);
                                            } else if (action.action.toLowerCase().includes('meeting')) {
                                                router.push(`/projects/${workspaceId}/meetings`);
                                            } else if (action.action.toLowerCase().includes('email') || action.action.toLowerCase().includes('inbox')) {
                                                router.push(`/projects/${workspaceId}/inbox`);
                                            } else if (action.action.toLowerCase().includes('contact')) {
                                                router.push(`/projects/${workspaceId}/contacts`);
                                            }
                                        }}
                                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/50 hover:bg-muted/40 hover:border-primary/30 transition-all text-left group"
                                    >
                                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                                            <LightBulbIcon className="w-4 h-4 text-yellow-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">{action.action}</p>
                                            <p className="text-xs text-muted-foreground truncate">{action.reason}</p>
                                        </div>
                                        <ArrowRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-5">
                        {/* Today's Priorities */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Today's Priorities</h3>
                            <div className="space-y-2">
                                {displayBriefing.priorities.map((priority, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            // Navigate based on priority type
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
                                            "flex items-center gap-3 p-3 rounded-xl bg-muted/20 border transition-all cursor-pointer hover:bg-muted/40",
                                            {
                                                "border-red-500/30 hover:border-red-500/50": priority.urgency === "high",
                                                "border-yellow-500/30 hover:border-yellow-500/50": priority.urgency === "medium",
                                                "border-border/50 hover:border-border": priority.urgency === "low",
                                            }
                                        )}
                                    >
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", {
                                            "bg-blue-500/10": priority.type === "meeting",
                                            "bg-green-500/10": priority.type === "deal",
                                            "bg-purple-500/10": priority.type === "task",
                                            "bg-orange-500/10": priority.type === "email",
                                            "bg-cyan-500/10": priority.type === "follow_up",
                                        })}>
                                            {getIcon(priority.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground">{priority.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{priority.description}</p>
                                        </div>
                                        {priority.time && (
                                            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted/50 rounded-lg flex-shrink-0">
                                                {priority.time}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* Alerts */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="space-y-2"
                        >
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Alerts</h3>
                            {displayBriefing.alerts.map((alert, idx) => (
                                <div
                                    key={idx}
                                    className={cn("flex items-start gap-3 p-3 rounded-xl border", {
                                        "bg-yellow-500/5 border-yellow-500/20": alert.type === "warning",
                                        "bg-green-500/5 border-green-500/20": alert.type === "success",
                                        "bg-blue-500/5 border-blue-500/20": alert.type === "info",
                                    })}
                                >
                                    {alert.type === "warning" && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />}
                                    {alert.type === "success" && <CheckCircleIcon className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                                    {alert.type === "info" && <SparklesIcon className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />}
                                    <p className="text-sm text-foreground">{alert.message}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DailyBriefingPanel;
