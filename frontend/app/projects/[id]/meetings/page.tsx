"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    CalendarDaysIcon,
    PlusIcon,
    ArrowPathIcon,
    MapPinIcon,
    ClockIcon,
    UserGroupIcon,
    VideoCameraIcon,
    TrashIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    getCalendarEvents,
    getCalendarIntegrations,
    createCalendarEvent,
    deleteCalendarEvent,
    CalendarEvent,
    CalendarIntegration,
} from "@/lib/api/calendarIntegration";
import toast from "react-hot-toast";
import Link from "next/link";

export default function MeetingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewMeeting, setShowNewMeeting] = useState(false);
    const [creating, setCreating] = useState(false);

    // New meeting form
    const [newMeeting, setNewMeeting] = useState({
        title: "",
        date: "",
        time: "",
        duration: 30,
        description: "",
        location: "",
        syncToGoogle: true,
    });

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [eventsRes, integrationsRes] = await Promise.all([
                getCalendarEvents(workspaceId),
                getCalendarIntegrations(workspaceId),
            ]);

            if (eventsRes.success) {
                setEvents(eventsRes.data.events);
            }
            if (integrationsRes.success) {
                setIntegrations(integrationsRes.data.integrations);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
        }
        setLoading(false);
    };

    const handleCreateMeeting = async () => {
        if (!newMeeting.title || !newMeeting.date || !newMeeting.time) {
            toast.error("Please fill in title, date, and time");
            return;
        }

        setCreating(true);
        try {
            const startTime = new Date(`${newMeeting.date}T${newMeeting.time}`);
            const endTime = new Date(startTime.getTime() + newMeeting.duration * 60000);

            const result = await createCalendarEvent({
                workspaceId,
                title: newMeeting.title,
                description: newMeeting.description,
                location: newMeeting.location,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                syncToGoogle: newMeeting.syncToGoogle && integrations.length > 0,
            });

            if (result.success) {
                toast.success("Meeting created!");
                setShowNewMeeting(false);
                setNewMeeting({
                    title: "",
                    date: "",
                    time: "",
                    duration: 30,
                    description: "",
                    location: "",
                    syncToGoogle: true,
                });
                loadData();
            } else {
                toast.error(result.error || "Failed to create meeting");
            }
        } catch (error) {
            toast.error("Failed to create meeting");
        }
        setCreating(false);
    };

    const handleDeleteMeeting = async (eventId: string) => {
        if (!confirm("Delete this meeting?")) return;

        const result = await deleteCalendarEvent(eventId);
        if (result.success) {
            toast.success("Meeting deleted");
            setEvents(events.filter((e) => e._id !== eventId));
        } else {
            toast.error(result.error || "Failed to delete");
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDuration = (start: string, end: string) => {
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const mins = Math.round(diff / 60000);
        if (mins < 60) return `${mins} min`;
        return `${Math.round(mins / 60)} hr`;
    };

    // Group events by date
    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = formatDate(event.startTime);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    const hasCalendarConnected = integrations.length > 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b border-border px-8 py-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            <CalendarDaysIcon className="w-7 h-7 text-primary" />
                            Meetings
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Manage your calendar and upcoming meetings
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadData}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/30 transition-colors"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowNewMeeting(true)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            New Meeting
                        </button>
                    </div>
                </div>

                {/* Calendar Connection Warning */}
                {!hasCalendarConnected && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                    >
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-amber-200 flex-1">
                            Connect Google Calendar to sync your meetings
                        </p>
                        <Link
                            href={`/projects/${workspaceId}/settings/integrations`}
                            className="text-sm font-medium text-amber-500 hover:text-amber-400"
                        >
                            Connect Calendar →
                        </Link>
                    </motion.div>
                )}
            </div>

            {/* Content */}
            <div className="p-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <ArrowPathIcon className="w-8 h-8 text-muted-foreground animate-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <CalendarDaysIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                            No upcoming meetings
                        </h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                            {hasCalendarConnected
                                ? "Sync your calendar to see your meetings here, or create a new one"
                                : "Connect your Google Calendar to sync meetings, or create one manually"}
                        </p>
                        <button
                            onClick={() => setShowNewMeeting(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                        >
                            <PlusIcon className="w-4 h-4" />
                            Schedule Meeting
                        </button>
                    </div>
                ) : (
                    <div className="space-y-8 max-w-4xl">
                        {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                            <div key={date}>
                                <h2 className="text-sm font-semibold text-muted-foreground mb-3">
                                    {date}
                                </h2>
                                <div className="space-y-2">
                                    {dayEvents.map((event) => (
                                        <motion.div
                                            key={event._id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group flex items-center gap-4 p-4 bg-card border border-border rounded-lg hover:border-neutral-700 transition-all"
                                        >
                                            {/* Time */}
                                            <div className="w-20 text-center flex-shrink-0">
                                                <div className="text-sm font-semibold text-foreground">
                                                    {formatTime(event.startTime)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {formatDuration(event.startTime, event.endTime)}
                                                </div>
                                            </div>

                                            {/* Divider */}
                                            <div className="w-px h-10 bg-primary/50" />

                                            {/* Details */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-semibold text-foreground truncate">
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                                                    {event.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPinIcon className="w-3 h-3" />
                                                            {event.location}
                                                        </span>
                                                    )}
                                                    {event.meetingLink && (
                                                        <a
                                                            href={event.meetingLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 text-primary hover:underline"
                                                        >
                                                            <VideoCameraIcon className="w-3 h-3" />
                                                            Join Meeting
                                                        </a>
                                                    )}
                                                    {event.contactId && (
                                                        <span className="flex items-center gap-1">
                                                            <UserGroupIcon className="w-3 h-3" />
                                                            {event.contactId.firstName} {event.contactId.lastName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <button
                                                onClick={() => handleDeleteMeeting(event._id)}
                                                className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* New Meeting Modal */}
            <AnimatePresence>
                {showNewMeeting && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setShowNewMeeting(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl shadow-2xl z-50"
                        >
                            <div className="p-6">
                                <h2 className="text-lg font-semibold text-foreground mb-4">
                                    Schedule Meeting
                                </h2>

                                <div className="space-y-4">
                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Title *
                                        </label>
                                        <input
                                            type="text"
                                            value={newMeeting.title}
                                            onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Meeting with..."
                                        />
                                    </div>

                                    {/* Date & Time */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Date *
                                            </label>
                                            <input
                                                type="date"
                                                value={newMeeting.date}
                                                onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Time *
                                            </label>
                                            <input
                                                type="time"
                                                value={newMeeting.time}
                                                onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    {/* Duration */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Duration
                                        </label>
                                        <select
                                            value={newMeeting.duration}
                                            onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number(e.target.value) })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            <option value={15}>15 minutes</option>
                                            <option value={30}>30 minutes</option>
                                            <option value={45}>45 minutes</option>
                                            <option value={60}>1 hour</option>
                                            <option value={90}>1.5 hours</option>
                                            <option value={120}>2 hours</option>
                                        </select>
                                    </div>

                                    {/* Location */}
                                    <div>
                                        <label className="block text-sm font-medium text-foreground mb-1">
                                            Location (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={newMeeting.location}
                                            onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="Google Meet, Office, etc."
                                        />
                                    </div>

                                    {/* Sync to Google */}
                                    {hasCalendarConnected && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={newMeeting.syncToGoogle}
                                                onChange={(e) => setNewMeeting({ ...newMeeting, syncToGoogle: e.target.checked })}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm text-foreground">
                                                Add to Google Calendar
                                            </span>
                                        </label>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-3 mt-6">
                                    <button
                                        onClick={() => setShowNewMeeting(false)}
                                        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateMeeting}
                                        disabled={creating}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                    >
                                        {creating ? "Creating..." : "Create Meeting"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
