"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    EnvelopeIcon,
    PhoneIcon,
    CalendarIcon,
    ChatBubbleLeftIcon,
    BoltIcon,
    ChartBarIcon,
    UserIcon,
} from "@heroicons/react/24/outline";
import {
    getContactActivities,
    ContactActivity,
} from "@/lib/api/contactActivity";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";

interface ContactActivityTabProps {
    workspaceId: string;
    contactId: string;
}

export default function ContactActivityTab({
    workspaceId,
    contactId,
}: ContactActivityTabProps) {
    const [activities, setActivities] = useState<ContactActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadActivities = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getContactActivities(workspaceId, contactId);
            if (response.success && response.data) {
                setActivities(response.data.activities);
            }
        } catch (error) {
            console.error("Failed to load activities:", error);
        } finally {
            setIsLoading(false);
        }
    }, [workspaceId, contactId]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    const getActivityIcon = (type: ContactActivity["type"]) => {
        switch (type) {
            case "email":
                return <EnvelopeIcon className="w-4 h-4" />;
            case "call":
                return <PhoneIcon className="w-4 h-4" />;
            case "meeting":
                return <CalendarIcon className="w-4 h-4" />;
            case "note":
                return <ChatBubbleLeftIcon className="w-4 h-4" />;
            case "workflow_action":
                return <BoltIcon className="w-4 h-4" />;
            case "stage_change":
                return <ChartBarIcon className="w-4 h-4" />;
            default:
                return <UserIcon className="w-4 h-4" />;
        }
    };

    const getActivityColor = (type: ContactActivity["type"]) => {
        switch (type) {
            case "email":
                return "text-blue-400 bg-blue-500/10";
            case "call":
                return "text-green-400 bg-green-500/10";
            case "meeting":
                return "text-purple-400 bg-purple-500/10";
            case "note":
                return "text-yellow-400 bg-yellow-500/10";
            case "workflow_action":
                return "text-orange-400 bg-orange-500/10";
            case "stage_change":
                return "text-cyan-400 bg-cyan-500/10";
            default:
                return "text-muted-foreground bg-muted";
        }
    };

    const groupActivitiesByDate = (activities: ContactActivity[]) => {
        const groups: { [key: string]: ContactActivity[] } = {};

        activities.forEach((activity) => {
            const date = new Date(activity.createdAt);
            let label: string;

            if (isToday(date)) {
                label = "Today";
            } else if (isYesterday(date)) {
                label = "Yesterday";
            } else if (isThisWeek(date)) {
                label = "This Week";
            } else {
                label = format(date, "MMMM yyyy");
            }

            if (!groups[label]) {
                groups[label] = [];
            }
            groups[label].push(activity);
        });

        return groups;
    };

    const groupedActivities = groupActivitiesByDate(activities);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[300px]">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4">
            {/* Activities Timeline */}
            {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <ChatBubbleLeftIcon className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-foreground mb-1">No activity yet</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        Activities like emails, calls, and workflow actions will automatically appear here
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedActivities).map(([dateLabel, dateActivities]) => (
                        <div key={dateLabel}>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    {dateLabel}
                                </span>
                                <div className="flex-1 h-px bg-border" />
                            </div>

                            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-border">
                                {dateActivities.map((activity, index) => (
                                    <motion.div
                                        key={activity._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="flex gap-3 relative"
                                    >
                                        <div
                                            className={cn(
                                                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                                                getActivityColor(activity.type)
                                            )}
                                        >
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">
                                                        {activity.title}
                                                    </p>
                                                    {activity.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                            {activity.description}
                                                        </p>
                                                    )}
                                                    {activity.userId && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            by {activity.userId.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                                    {format(new Date(activity.createdAt), "h:mm a")}
                                                </span>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
