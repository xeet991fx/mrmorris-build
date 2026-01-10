"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    RefreshCw,
    Calendar,
    Users,
    FileText,
    Lightbulb,
    Clock,
    Briefcase,
    MessageSquare,
    CheckCircle,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Insight,
    getInsights,
    generateInsights
} from "@/lib/api/insights";
import { InsightCard } from "@/components/ui/InsightCard";
import { format, formatDistanceToNow, isPast, isFuture, isToday } from "date-fns";

interface MeetingIntelligencePanelProps {
    workspaceId: string;
    meeting?: any;
    onActionTaken?: (action: string) => void;
}

interface PreMeetingBrief {
    contact: {
        name: string;
        company: string;
        role: string;
        lastContact: string;
        emailEngagement: number;
    };
    recentActivity: Array<{
        type: string;
        date: string;
        summary: string;
    }>;
    openDeals: Array<{
        id: string;
        name: string;
        stage: string;
        value: number;
    }>;
    lastMeetingNotes: string;
    talkingPoints: string[];
    warnings: string[];
    opportunities: string[];
}

export const MeetingIntelligencePanel: React.FC<MeetingIntelligencePanelProps> = ({
    workspaceId,
    meeting,
    onActionTaken,
}) => {
    const [insights, setInsights] = useState<Insight[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [preMeetingBrief, setPreMeetingBrief] = useState<PreMeetingBrief | null>(null);
    const [agenda, setAgenda] = useState<string[]>([]);
    const [postMeetingActions, setPostMeetingActions] = useState<any[]>([]);

    const fetchInsights = async () => {
        if (!meeting) return;
        setIsLoading(true);
        try {
            const response = await getInsights(workspaceId, 'contact', meeting.contactId);
            if (response.success) {
                setInsights(response.data);
                processMeetingInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!meeting) return;
        setIsGenerating(true);
        try {
            const response = await generateInsights(workspaceId, 'contact', meeting.contactId);
            if (response.success) {
                setInsights(response.data);
                processMeetingInsights(response.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    const processMeetingInsights = (insightsData: Insight[]) => {
        const meetingInsight = insightsData.find(i => i.insights.type === 'meeting_preparation');
        if (meetingInsight?.insights.data) {
            setPreMeetingBrief(meetingInsight.insights.data.brief);
            setAgenda(meetingInsight.insights.data.suggestedAgenda || []);
            setPostMeetingActions(meetingInsight.insights.data.followUpActions || []);
        }
    };

    useEffect(() => {
        if (meeting) fetchInsights();
    }, [meeting, workspaceId]);

    if (!meeting) {
        return (
            <div className="text-center py-8">
                <Calendar className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">Select a meeting to see AI insights</p>
            </div>
        );
    }

    const meetingDate = new Date(meeting.date);
    const isUpcoming = isFuture(meetingDate);
    const isPastMeeting = isPast(meetingDate);
    const isTodayMeeting = isToday(meetingDate);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-500" />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Meeting Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                    {isGenerating ? "Preparing..." : "Refresh"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Meeting Status Badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {isUpcoming && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Upcoming - {formatDistanceToNow(meetingDate, { addSuffix: true })}
                            </span>
                        )}
                        {isTodayMeeting && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Today at {format(meetingDate, 'h:mm a')}
                            </span>
                        )}
                        {isPastMeeting && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-500/10 text-zinc-500 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Completed
                            </span>
                        )}
                    </div>

                    {/* Pre-Meeting Brief */}
                    {isUpcoming && preMeetingBrief && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-blue-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Pre-Meeting Brief</span>
                            </div>

                            {/* Contact Info */}
                            <div className="mb-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                <h4 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 mb-1">{preMeetingBrief.contact.name}</h4>
                                <div className="space-y-0.5 text-xs text-zinc-500">
                                    <p>{preMeetingBrief.contact.role} at {preMeetingBrief.contact.company}</p>
                                    <p>Last contact: {preMeetingBrief.contact.lastContact}</p>
                                    <p>Email engagement: {preMeetingBrief.contact.emailEngagement}%</p>
                                </div>
                            </div>

                            {/* Open Deals */}
                            {preMeetingBrief.openDeals?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Open Opportunities</h5>
                                    {preMeetingBrief.openDeals.map((deal, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 mb-2">
                                            <div>
                                                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{deal.name}</p>
                                                <p className="text-[10px] text-zinc-500">{deal.stage}</p>
                                            </div>
                                            <p className="text-xs font-bold text-emerald-500">
                                                ${(deal.value / 1000).toFixed(0)}K
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Warnings */}
                            {preMeetingBrief.warnings?.length > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                                    <h5 className="text-xs font-semibold text-rose-500 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5" />
                                        Heads Up
                                    </h5>
                                    {preMeetingBrief.warnings.map((warning, idx) => (
                                        <p key={idx} className="text-xs text-rose-500 mb-1">• {warning}</p>
                                    ))}
                                </div>
                            )}

                            {/* Talking Points */}
                            {preMeetingBrief.talkingPoints?.length > 0 && (
                                <div className="mb-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                                    <h5 className="text-xs font-semibold text-blue-500 mb-2 flex items-center gap-1">
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        Talking Points
                                    </h5>
                                    {preMeetingBrief.talkingPoints.map((point, idx) => (
                                        <p key={idx} className="text-xs text-blue-600 dark:text-blue-400 mb-1">✓ {point}</p>
                                    ))}
                                </div>
                            )}

                            {/* Opportunities */}
                            {preMeetingBrief.opportunities?.length > 0 && (
                                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
                                    <h5 className="text-xs font-semibold text-emerald-500 mb-2 flex items-center gap-1">
                                        <Lightbulb className="w-3.5 h-3.5" />
                                        Opportunities
                                    </h5>
                                    {preMeetingBrief.opportunities.map((opp, idx) => (
                                        <p key={idx} className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">💡 {opp}</p>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Suggested Agenda */}
                    {isUpcoming && agenda.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <FileText className="w-4 h-4 text-violet-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Suggested Agenda</span>
                            </div>
                            <div className="space-y-2">
                                {agenda.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <span className="w-5 h-5 rounded-full bg-violet-500/10 text-violet-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                                        <p className="text-xs text-zinc-700 dark:text-zinc-300">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Post-Meeting Actions */}
                    {isPastMeeting && postMeetingActions.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircle className="w-4 h-4 text-emerald-500" />
                                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recommended Follow-Up</span>
                            </div>
                            <div className="space-y-2">
                                {postMeetingActions.map((action, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                        <div className="flex-1">
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{action.title}</p>
                                            {action.deadline && (
                                                <p className="text-[10px] text-zinc-500">Due: {action.deadline}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onActionTaken?.(action.type)}
                                            className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
                                        >
                                            Create Task
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* AI Insights Cards */}
                    <AnimatePresence>
                        {insights.filter(i => i.insights.type !== 'meeting_preparation').map((insight) => (
                            <InsightCard
                                key={insight._id}
                                insight={insight}
                                workspaceId={workspaceId}
                                onDismiss={() => setInsights(prev => prev.filter(i => i._id !== insight._id))}
                            />
                        ))}
                    </AnimatePresence>

                    {/* Empty State */}
                    {insights.length === 0 && !preMeetingBrief && !isLoading && (
                        <div className="text-center py-8">
                            <Briefcase className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                            <p className="text-xs text-zinc-500 mb-3">No meeting insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-xs font-medium bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
                            >
                                Prepare for Meeting
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MeetingIntelligencePanel;
