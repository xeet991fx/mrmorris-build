"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
    Calendar,
    Plus,
    RefreshCw,
    MapPin,
    Clock,
    Users,
    Video,
    Trash2,
    Pencil,
    AlertCircle,
    ExternalLink,
} from "lucide-react";
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
import { MeetingIntelligencePanel } from "@/components/meetings/MeetingIntelligencePanel";
import { cn } from "@/lib/utils";

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
    const [selectedMeeting, setSelectedMeeting] = useState<CalendarEvent | null>(null);
    const [addingMeetToEventId, setAddingMeetToEventId] = useState<string | null>(null);

    const [newMeeting, setNewMeeting] = useState({
        title: "",
        date: "",
        time: "",
        duration: 30,
        description: "",
        location: "",
        syncToGoogle: true,
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [eventsRes, integrationsRes] = await Promise.all([
                getCalendarEvents(workspaceId),
                getCalendarIntegrations(workspaceId),
            ]);
            if (eventsRes.success) setEvents(eventsRes.data.events);
            if (integrationsRes.success) setIntegrations(integrationsRes.data.integrations);
        } catch (error) { console.error("Failed to load data:", error); }
        setLoading(false);
    }, [workspaceId]);

    useEffect(() => { loadData(); }, [loadData]);

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
                setNewMeeting({ title: "", date: "", time: "", duration: 30, description: "", location: "", syncToGoogle: true });
                loadData();
            } else { toast.error(result.error || "Failed to create meeting"); }
        } catch (error) { toast.error("Failed to create meeting"); }
        setCreating(false);
    };

    const handleDeleteMeeting = async (eventId: string) => {
        if (!confirm("Delete this meeting?")) return;
        const result = await deleteCalendarEvent(eventId);
        if (result.success) { toast.success("Meeting deleted"); setEvents(events.filter((e) => e._id !== eventId)); }
        else { toast.error(result.error || "Failed to delete"); }
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
            if (result.success) { toast.success("Meeting updated!"); setEditingEvent(null); loadData(); }
            else { toast.error(result.error || "Failed to update meeting"); }
        } catch (error) { toast.error("Failed to update meeting"); }
        setSaving(false);
    };

    const handleAddGoogleMeet = async (eventId: string) => {
        setAddingMeetToEventId(eventId);
        try {
            const result = await syncEventToGoogle(eventId);
            if (result.success) {
                toast.success("Google Meet created!");
                // Get meeting link from response - try both locations
                const meetingLink = result.data.meetingLink || result.data.event?.meetingLink;
                console.log("Meet link received:", meetingLink);

                // Update the event in local state with the new meeting link
                setEvents(events.map(e =>
                    e._id === eventId
                        ? { ...e, meetingLink, externalId: result.data.event?.externalId, provider: "google" as const }
                        : e
                ));

                // Automatically open the Google Meet link
                if (meetingLink) {
                    window.open(meetingLink, '_blank');
                } else {
                    toast.error("Meet link not found in response. Try refreshing.");
                }
            } else {
                toast.error(result.error || "Failed to add Google Meet");
            }
        } catch (error: any) {
            console.error("Add Google Meet error:", error);
            toast.error(error.message || "Failed to add Google Meet. Check if Google Calendar is connected.");
        }
        setAddingMeetToEventId(null);
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    const formatDuration = (start: string, end: string) => {
        const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
        return mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`;
    };

    const groupedEvents = events.reduce((acc, event) => {
        const dateKey = formatDate(event.startTime);
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    const hasCalendarConnected = integrations.length > 0;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">Loading meetings...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        <div>
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Meetings</h1>
                            <p className="text-xs text-zinc-500">{events.length} upcoming meetings</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadData} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowNewMeeting(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors">
                            <Plus className="w-4 h-4" />
                            New Meeting
                        </button>
                    </div>
                </div>

                {!hasCalendarConnected && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">Connect Google Calendar to sync your meetings</p>
                        <Link href={`/projects/${workspaceId}/settings/integrations`} className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1">
                            Connect <ExternalLink className="w-3 h-3" />
                        </Link>
                    </motion.div>
                )}
            </motion.div>

            {/* Content */}
            <div className="p-6">
                {events.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
                        <Calendar className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">No upcoming meetings</h3>
                        <p className="text-zinc-500 mb-6">Sync your calendar or schedule a new meeting</p>
                        <button onClick={() => setShowNewMeeting(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors">
                            <Plus className="w-4 h-4" />
                            Schedule Meeting
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Meetings List */}
                        <div className="lg:col-span-2 space-y-6">
                            {Object.entries(groupedEvents).map(([date, dayEvents]) => (
                                <div key={date}>
                                    <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{date}</h2>
                                    <div className="space-y-2">
                                        {dayEvents.map((event, index) => (
                                            <motion.div
                                                key={event._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                onClick={() => setSelectedMeeting(event)}
                                                className={cn(
                                                    "group flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                                                    selectedMeeting?._id === event._id
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                        : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-700"
                                                )}
                                            >
                                                {/* Time */}
                                                <div className="w-16 text-center flex-shrink-0">
                                                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatTime(event.startTime)}</div>
                                                    <div className="text-xs text-zinc-500">{formatDuration(event.startTime, event.endTime)}</div>
                                                </div>

                                                <div className="w-px h-10 bg-emerald-500/50" />

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{event.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                                                        {event.location && (
                                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                                                        )}
                                                        {event.meetingLink && (
                                                            <a
                                                                href={event.meetingLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <Video className="w-3 h-3" />
                                                                Start Meeting
                                                            </a>
                                                        )}
                                                        {!event.meetingLink && hasCalendarConnected && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleAddGoogleMeet(event._id); }}
                                                                disabled={addingMeetToEventId === event._id}
                                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                                                            >
                                                                <Video className="w-3 h-3" />
                                                                {addingMeetToEventId === event._id ? "Creating Meet..." : "Start with Google Meet"}
                                                            </button>
                                                        )}
                                                        {event.contactId && (
                                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.contactId.firstName} {event.contactId.lastName}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingEvent(event); }} className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all">
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteMeeting(event._id); }} className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Intelligence Panel */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-8 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-4">
                                <MeetingIntelligencePanel
                                    workspaceId={workspaceId}
                                    meeting={selectedMeeting ? {
                                        ...selectedMeeting,
                                        date: selectedMeeting.startTime,
                                        contactId: (selectedMeeting.contactId as any)?._id || selectedMeeting.contactId
                                    } : undefined}
                                    onActionTaken={(action) => { toast.success(`Action created: ${action}`); loadData(); }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* New Meeting Modal */}
            <AnimatePresence>
                {showNewMeeting && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowNewMeeting(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Calendar className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Schedule Meeting</h2>
                                </div>
                                <button onClick={() => setShowNewMeeting(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <XMarkIcon className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Title *</label>
                                    <input type="text" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Meeting with..." />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Date *</label>
                                        <input type="date" value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Time *</label>
                                        <input type="time" value={newMeeting.time} onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Duration</label>
                                    <select value={newMeeting.duration} onChange={(e) => setNewMeeting({ ...newMeeting, duration: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Location (optional)</label>
                                    <input type="text" value={newMeeting.location} onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Google Meet, Office, etc." />
                                </div>
                                {hasCalendarConnected && (
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <input type="checkbox" checked={newMeeting.syncToGoogle} onChange={(e) => setNewMeeting({ ...newMeeting, syncToGoogle: e.target.checked })} className="w-4 h-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-500" />
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Add Google Meet link</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                            <div className="flex items-center justify-end gap-3 p-5 border-t border-zinc-100 dark:border-zinc-800">
                                <button onClick={() => setShowNewMeeting(false)} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Cancel</button>
                                <button onClick={handleCreateMeeting} disabled={creating} className="px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                    {creating ? "Creating..." : "Create Meeting"}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Edit Meeting Modal */}
            <AnimatePresence>
                {editingEvent && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditingEvent(null)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Pencil className="w-5 h-5 text-blue-500" />
                                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Edit Meeting</h2>
                                </div>
                                <button onClick={() => setEditingEvent(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <XMarkIcon className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Title</label>
                                    <input type="text" value={editingEvent.title} onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Start Date</label>
                                        <input type="date" value={editingEvent.startTime.split("T")[0]} onChange={(e) => { const time = editingEvent.startTime.split("T")[1] || "00:00:00.000Z"; setEditingEvent({ ...editingEvent, startTime: `${e.target.value}T${time}` }); }} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Start Time</label>
                                        <input type="time" value={new Date(editingEvent.startTime).toTimeString().slice(0, 5)} onChange={(e) => { const date = editingEvent.startTime.split("T")[0]; setEditingEvent({ ...editingEvent, startTime: new Date(`${date}T${e.target.value}`).toISOString() }); }} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Duration</label>
                                    <select value={Math.round((new Date(editingEvent.endTime).getTime() - new Date(editingEvent.startTime).getTime()) / 60000)} onChange={(e) => { const durationMins = Number(e.target.value); const newEndTime = new Date(new Date(editingEvent.startTime).getTime() + durationMins * 60000); setEditingEvent({ ...editingEvent, endTime: newEndTime.toISOString() }); }} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                        <option value={15}>15 minutes</option>
                                        <option value={30}>30 minutes</option>
                                        <option value={45}>45 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={90}>1.5 hours</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Location</label>
                                    <input type="text" value={editingEvent.location || ""} onChange={(e) => setEditingEvent({ ...editingEvent, location: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Add location..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Description</label>
                                    <textarea value={editingEvent.description || ""} onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })} rows={3} className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Add description..." />
                                </div>
                                {hasCalendarConnected && (
                                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <svg className="w-5 h-5 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            </svg>
                                            <span className="text-sm text-zinc-700 dark:text-zinc-300">Sync to Google Calendar</span>
                                        </div>
                                        <button type="button" onClick={async () => {
                                            const isSynced = !!editingEvent.externalId;
                                            try {
                                                if (isSynced) {
                                                    toast.loading("Removing from Google Calendar...");
                                                    const result = await unsyncEventFromGoogle(editingEvent._id);
                                                    toast.dismiss();
                                                    if (result.success) { toast.success("Removed from Google Calendar"); setEditingEvent({ ...editingEvent, externalId: undefined, provider: "internal" }); }
                                                    else { toast.error(result.error || "Failed to unsync"); }
                                                } else {
                                                    toast.loading("Syncing to Google Calendar...");
                                                    const result = await syncEventToGoogle(editingEvent._id);
                                                    toast.dismiss();
                                                    if (result.success) { toast.success("Synced to Google Calendar!"); setEditingEvent({ ...editingEvent, externalId: result.data.event.externalId, provider: "google" }); }
                                                    else { toast.error(result.error || "Failed to sync"); }
                                                }
                                            } catch (error) { toast.dismiss(); toast.error("Sync operation failed"); }
                                        }} className={cn("relative w-9 h-5 rounded-full transition-colors", !!editingEvent.externalId ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-700")}>
                                            <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform", !!editingEvent.externalId ? "left-[18px]" : "left-0.5")} />
                                        </button>
                                    </div>
                                )}
                                {editingEvent.meetingLink && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Meeting Link</label>
                                        <a href={editingEvent.meetingLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-500 hover:underline">
                                            <Video className="w-4 h-4" />Join Meeting
                                        </a>
                                    </div>
                                )}
                                {editingEvent.contactId && (
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Contact</label>
                                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                                            <Users className="w-4 h-4" />
                                            {editingEvent.contactId.firstName} {editingEvent.contactId.lastName}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center justify-between p-5 border-t border-zinc-100 dark:border-zinc-800">
                                <button onClick={() => { handleDeleteMeeting(editingEvent._id); setEditingEvent(null); }} className="px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                                    Delete Meeting
                                </button>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => setEditingEvent(null)} className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">Cancel</button>
                                    <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50">
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
