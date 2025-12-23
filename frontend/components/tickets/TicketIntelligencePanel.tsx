"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    TicketIcon,
    ExclamationTriangleIcon,
    UserIcon,
    ClockIcon,
    TagIcon,
    LightBulbIcon,
    CheckCircleIcon,
    PlusIcon,
    BoltIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";
import { toast } from "sonner";

interface TicketIntelligencePanelProps {
    workspaceId: string;
    ticketId?: string;
    tickets?: any[];
}

export const TicketIntelligencePanel: React.FC<TicketIntelligencePanelProps> = ({
    workspaceId,
    ticketId,
    tickets = [],
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchInsights = async () => {
        if (!ticketId && tickets.length === 0) return;

        setIsLoading(true);
        try {
            const contextId = ticketId || 'workspace';
            const response = await getInsights(workspaceId, 'ticket', contextId);
            if (response.success) {
                setInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const contextId = ticketId || 'workspace';
            const response = await generateInsights(workspaceId, 'ticket', contextId);
            if (response.success) {
                setInsights(prev => [...response.data, ...prev]);
                toast.success("AI analysis complete!");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, [ticketId, workspaceId]);

    const handleDismiss = (insightId: string) => {
        setInsights(prev => prev.filter(i => i._id !== insightId));
    };

    const handleAction = (action: string) => {
        toast.success(`Action: ${action}`);
    };

    // Get stats from tickets
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const urgentTickets = tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length;
    const avgResponseTime = tickets.length > 0 ? "~2h" : "-";

    // Mock AI suggestions based on tickets data
    const suggestions = [
        {
            id: "1",
            title: "Auto-Categorize Tickets",
            description: "AI can automatically categorize incoming tickets based on subject and content.",
            frequency: Math.floor(tickets.length * 0.3) || 5,
            timeSavings: 30,
            action: "Enable Auto-Categorization",
        },
        {
            id: "2",
            title: "Priority Scoring",
            description: urgentTickets > 0
                ? `${urgentTickets} high-priority tickets detected - AI can help prioritize`
                : "AI can automatically score ticket priority based on customer data",
            frequency: urgentTickets || 8,
            timeSavings: 45,
            action: "Enable Priority Scoring",
        },
        {
            id: "3",
            title: "Smart Agent Assignment",
            description: "Automatically assign tickets to the right agent based on expertise and workload.",
            frequency: Math.floor(tickets.length * 0.5) || 12,
            timeSavings: 60,
            action: "Enable Smart Assignment",
        },
    ];

    return (
        <div className="space-y-3">
            {/* Grid of AI Suggestions - Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {suggestions.map((suggestion, idx) => (
                    <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-foreground line-clamp-1">
                                    {suggestion.title}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {suggestion.description}
                                </p>
                            </div>
                            <SparklesIcon className="w-4 h-4 text-purple-500 shrink-0" />
                        </div>

                        {/* Pattern Info */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <ArrowPathIcon className="w-3 h-3" />
                                {suggestion.frequency}x in 30 days
                            </span>
                            <span className="flex items-center gap-1 text-green-600">
                                <ClockIcon className="w-3 h-3" />
                                Save ~{suggestion.timeSavings} min/month
                            </span>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => handleAction(suggestion.action)}
                            className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-all"
                        >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Enable Feature
                        </button>
                    </motion.div>
                ))}
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-blue-500">{openTickets}</p>
                    <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-red-500">{urgentTickets}</p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-green-500">{tickets.filter(t => t.status === 'resolved').length}</p>
                    <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                    <p className="text-lg font-bold text-foreground">{avgResponseTime}</p>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                </div>
            </div>

            {/* Info Footer */}
            <div className="mt-2 pt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground text-center">
                    💡 Tip: The more you use the app, the smarter our suggestions become
                </p>
            </div>
        </div>
    );
};

export default TicketIntelligencePanel;
