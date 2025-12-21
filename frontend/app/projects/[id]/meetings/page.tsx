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
    PencilIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    getCalendarEvents,
    getCalendarIntegrations,
    createCalendarEvent,
    deleteCalendarEvent,
    updateCalendarEvent,
    syncEventToGoogle,
    unsyncEventFromGoogle,
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
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
    const [saving, setSaving] = useState(false);

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

    const handleEditMeeting = (event: CalendarEvent) => {
        setEditingEvent(event);
    };

    const handleSaveEdit = async () => {
        if (!editingEvent) return;

        setSaving(true);
        try {
            const result = await updateCalendarEvent(editingEvent._id, {
                title: editingEvent.title,
                description: editingEvent.description,
                location: editingEvent.location,
                startTime: editingEvent.startTime,
                endTime: editingEvent.endTime,
            });

            if (result.success) {
                toast.success("Meeting updated!");
                setEditingEvent(null);
                loadData();
            } else {
                toast.error(result.error || "Failed to update meeting");
            }
        } catch (error) {
            toast.error("Failed to update meeting");
        }
        setSaving(false);
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

                                            {/* Actions - Always visible */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleEditMeeting(event)}
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    title="Edit meeting"
                                                >
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMeeting(event._id)}
                                                    className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                    title="Delete meeting"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
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

            {/* Edit Meeting Modal */}
            <AnimatePresence>
                {editingEvent && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-40"
                            onClick={() => setEditingEvent(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                                <div className="p-6">
                                    <h2 className="text-lg font-semibold text-foreground mb-4">
                                        Edit Meeting
                                    </h2>

                                    <div className="space-y-4">
                                        {/* Title */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Title
                                            </label>
                                            <input
                                                type="text"
                                                value={editingEvent.title}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>

                                        {/* Date & Time */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Start Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={editingEvent.startTime.split("T")[0]}
                                                    onChange={(e) => {
                                                        const time = editingEvent.startTime.split("T")[1] || "00:00:00.000Z";
                                                        setEditingEvent({ ...editingEvent, startTime: `${e.target.value}T${time}` });
                                                    }}
                                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={new Date(editingEvent.startTime).toTimeString().slice(0, 5)}
                                                    onChange={(e) => {
                                                        const date = editingEvent.startTime.split("T")[0];
                                                        setEditingEvent({ ...editingEvent, startTime: new Date(`${date}T${e.target.value}`).toISOString() });
                                                    }}
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
                                                value={Math.round((new Date(editingEvent.endTime).getTime() - new Date(editingEvent.startTime).getTime()) / 60000)}
                                                onChange={(e) => {
                                                    const durationMins = Number(e.target.value);
                                                    const newEndTime = new Date(new Date(editingEvent.startTime).getTime() + durationMins * 60000);
                                                    setEditingEvent({ ...editingEvent, endTime: newEndTime.toISOString() });
                                                }}
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
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                value={editingEvent.location || ""}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                                placeholder="Add location..."
                                            />
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">
                                                Description
                                            </label>
                                            <textarea
                                                value={editingEvent.description || ""}
                                                onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                                rows={3}
                                                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                                placeholder="Add description..."
                                            />
                                        </div>

                                        {/* Google Calendar Sync Toggle */}
                                        {hasCalendarConnected && (
                                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <svg className="w-5 h-5 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                    </svg>
                                                    <span className="text-sm text-foreground">
                                                        Sync to Google Calendar
                                                    </span>
                                                </div>
                                                {/* Toggle Switch */}
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const isSynced = !!editingEvent.externalId;
                                                        try {
                                                            if (isSynced) {
                                                                // Unsync from Google
                                                                toast.loading("Removing from Google Calendar...");
                                                                const result = await unsyncEventFromGoogle(editingEvent._id);
                                                                toast.dismiss();
                                                                if (result.success) {
                                                                    toast.success("Removed from Google Calendar");
                                                                    setEditingEvent({ ...editingEvent, externalId: undefined, provider: "internal" });
                                                                } else {
                                                                    toast.error(result.error || "Failed to unsync");
                                                                }
                                                            } else {
                                                                // Sync to Google
                                                                toast.loading("Syncing to Google Calendar...");
                                                                const result = await syncEventToGoogle(editingEvent._id);
                                                                toast.dismiss();
                                                                if (result.success) {
                                                                    toast.success("Synced to Google Calendar!");
                                                                    setEditingEvent({ ...editingEvent, externalId: result.data.event.externalId, provider: "google" });
                                                                } else {
                                                                    toast.error(result.error || "Failed to sync");
                                                                }
                                                            }
                                                        } catch (error) {
                                                            toast.dismiss();
                                                            toast.error("Sync operation failed");
                                                        }
                                                    }}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${!!editingEvent.externalId ? "bg-primary" : "bg-muted"
                                                        }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!!editingEvent.externalId ? "translate-x-6" : "translate-x-1"
                                                            }`}
                                                    />
                                                </button>
                                            </div>
                                        )}

                                        {/* Meeting Link */}
                                        {editingEvent.meetingLink && (
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Meeting Link
                                                </label>
                                                <a
                                                    href={editingEvent.meetingLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                                                >
                                                    <VideoCameraIcon className="w-4 h-4" />
                                                    Join Meeting
                                                </a>
                                            </div>
                                        )}

                                        {/* Contact */}
                                        {editingEvent.contactId && (
                                            <div>
                                                <label className="block text-sm font-medium text-foreground mb-1">
                                                    Contact
                                                </label>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <UserGroupIcon className="w-4 h-4" />
                                                    {editingEvent.contactId.firstName} {editingEvent.contactId.lastName}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between mt-6">
                                        <button
                                            onClick={() => {
                                                handleDeleteMeeting(editingEvent._id);
                                                setEditingEvent(null);
                                            }}
                                            className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            Delete Meeting
                                        </button>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setEditingEvent(null)}
                                                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                disabled={saving}
                                                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                            >
                                                {saving ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
