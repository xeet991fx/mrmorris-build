"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    SparklesIcon,
    ArrowPathIcon,
    CalendarIcon,
    UserGroupIcon,
    DocumentTextIcon,
    LightBulbIcon,
    ClockIcon,
    BriefcaseIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
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
        if (meeting) {
            fetchInsights();
        }
    }, [meeting, workspaceId]);

    if (!meeting) {
        return (
            <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a meeting to see AI insights</p>
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
                    <SparklesIcon className="w-5 h-5 text-purple-500" />
                    <h3 className="text-lg font-semibold text-foreground">Meeting Intelligence</h3>
                </div>
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowPathIcon className={cn("w-4 h-4", isGenerating && "animate-spin")} />
                    {isGenerating ? "Preparing..." : "Refresh"}
                </button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-400" />
                </div>
            )}

            {!isLoading && (
                <>
                    {/* Meeting Status Badge */}
                    <div className="flex items-center gap-2">
                        {isUpcoming && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                <ClockIcon className="w-3 h-3 inline mr-1" />
                                Upcoming - {formatDistanceToNow(meetingDate, { addSuffix: true })}
                            </span>
                        )}
                        {isTodayMeeting && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                <CalendarIcon className="w-3 h-3 inline mr-1" />
                                Today at {format(meetingDate, 'h:mm a')}
                            </span>
                        )}
                        {isPastMeeting && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500">
                                <CheckCircleIcon className="w-3 h-3 inline mr-1" />
                                Completed
                            </span>
                        )}
                    </div>

                    {/* Pre-Meeting Brief (for upcoming meetings) */}
                    {isUpcoming && preMeetingBrief && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <DocumentTextIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-semibold text-foreground">Pre-Meeting Brief</span>
                            </div>

                            {/* Contact Info */}
                            <div className="mb-4 p-3 rounded bg-muted/30">
                                <h4 className="font-medium text-foreground mb-2">{preMeetingBrief.contact.name}</h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <p>{preMeetingBrief.contact.role} at {preMeetingBrief.contact.company}</p>
                                    <p>Last contact: {preMeetingBrief.contact.lastContact}</p>
                                    <p>Email engagement: {preMeetingBrief.contact.emailEngagement}%</p>
                                </div>
                            </div>

                            {/* Open Deals */}
                            {preMeetingBrief.openDeals?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-foreground mb-2">Open Opportunities</h5>
                                    {preMeetingBrief.openDeals.map((deal, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 mb-2">
                                            <div>
                                                <p className="text-sm font-medium text-foreground">{deal.name}</p>
                                                <p className="text-xs text-muted-foreground">{deal.stage}</p>
                                            </div>
                                            <p className="text-sm font-bold text-green-500">
                                                ${(deal.value / 1000).toFixed(0)}K
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Warnings */}
                            {preMeetingBrief.warnings?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-1">
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        Heads Up
                                    </h5>
                                    {preMeetingBrief.warnings.map((warning, idx) => (
                                        <p key={idx} className="text-xs text-red-500 mb-1">• {warning}</p>
                                    ))}
                                </div>
                            )}

                            {/* Talking Points */}
                            {preMeetingBrief.talkingPoints?.length > 0 && (
                                <div className="mb-4">
                                    <h5 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1">
                                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                        Recommended Talking Points
                                    </h5>
                                    {preMeetingBrief.talkingPoints.map((point, idx) => (
                                        <p key={idx} className="text-xs text-foreground mb-1">✓ {point}</p>
                                    ))}
                                </div>
                            )}

                            {/* Opportunities */}
                            {preMeetingBrief.opportunities?.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-medium text-green-500 mb-2 flex items-center gap-1">
                                        <LightBulbIcon className="w-4 h-4" />
                                        Opportunities to Mention
                                    </h5>
                                    {preMeetingBrief.opportunities.map((opp, idx) => (
                                        <p key={idx} className="text-xs text-green-500 mb-1">💡 {opp}</p>
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
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <DocumentTextIcon className="w-5 h-5 text-purple-500" />
                                <span className="font-semibold text-foreground">Suggested Agenda</span>
                            </div>
                            <div className="space-y-2">
                                {agenda.map((item, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <span className="text-sm font-bold text-purple-500">{idx + 1}.</span>
                                        <p className="text-sm text-foreground">{item}</p>
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
                            className="rounded-lg border border-border bg-card p-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                                <span className="font-semibold text-foreground">Recommended Follow-Up</span>
                            </div>
                            <div className="space-y-2">
                                {postMeetingActions.map((action, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded bg-muted/30">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-foreground">{action.title}</p>
                                            {action.deadline && (
                                                <p className="text-xs text-muted-foreground">Due: {action.deadline}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => onActionTaken?.(action.type)}
                                            className="px-3 py-1 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700"
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
                            <BriefcaseIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-2">No meeting insights yet</p>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="px-4 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
