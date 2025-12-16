"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO, addMonths, subMonths } from "date-fns";
import { Plus, Calendar, Clock, Video, MapPin, User, ChevronLeft, ChevronRight, X, Edit, Trash2, MoreHorizontal } from "lucide-react";
import { getMeetings, createMeeting, updateMeeting, deleteMeeting, Meeting, CreateMeetingInput } from "@/lib/api/meeting";
import { toast } from "react-hot-toast";

type ViewMode = "list" | "calendar";

export default function MeetingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        startDate: "",
        startTime: "",
        duration: "30",
        location: "",
        meetingUrl: "",
        conferenceProvider: "",
        notes: "",
    });

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const startDate = startOfMonth(currentMonth).toISOString();
            const endDate = endOfMonth(currentMonth).toISOString();

            const response = await getMeetings(workspaceId, { startDate, endDate, limit: 100 });
            if (response.success) {
                setMeetings(response.data);
            }
        } catch (error) {
            console.error("Error fetching meetings:", error);
            toast.error("Failed to load meetings");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (workspaceId) {
            fetchMeetings();
        }
    }, [workspaceId, currentMonth]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.startDate || !formData.startTime) {
            toast.error("Please fill in required fields");
            return;
        }

        try {
            const startTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const duration = parseInt(formData.duration);
            const endTime = new Date(startTime.getTime() + duration * 60000);

            const data: CreateMeetingInput = {
                title: formData.title,
                description: formData.description || undefined,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
                duration,
                location: formData.location || undefined,
                meetingUrl: formData.meetingUrl || undefined,
                conferenceProvider: formData.conferenceProvider || undefined,
                notes: formData.notes || undefined,
            };

            if (selectedMeeting) {
                await updateMeeting(workspaceId, selectedMeeting._id, data);
                toast.success("Meeting updated");
            } else {
                await createMeeting(workspaceId, data);
                toast.success("Meeting created");
            }

            setIsModalOpen(false);
            resetForm();
            fetchMeetings();
        } catch (error: any) {
            console.error("Error saving meeting:", error);
            toast.error(error.response?.data?.error || "Failed to save meeting");
        }
    };

    const handleDelete = async (meetingId: string) => {
        if (!confirm("Are you sure you want to delete this meeting?")) return;

        try {
            await deleteMeeting(workspaceId, meetingId);
            toast.success("Meeting deleted");
            fetchMeetings();
        } catch (error) {
            console.error("Error deleting meeting:", error);
            toast.error("Failed to delete meeting");
        }
    };

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            startDate: "",
            startTime: "",
            duration: "30",
            location: "",
            meetingUrl: "",
            conferenceProvider: "",
            notes: "",
        });
        setSelectedMeeting(null);
    };

    const openEditModal = (meeting: Meeting) => {
        const start = parseISO(meeting.startTime);
        setFormData({
            title: meeting.title,
            description: meeting.description || "",
            startDate: format(start, "yyyy-MM-dd"),
            startTime: format(start, "HH:mm"),
            duration: meeting.duration.toString(),
            location: meeting.location || "",
            meetingUrl: meeting.meetingUrl || "",
            conferenceProvider: meeting.conferenceProvider || "",
            notes: meeting.notes || "",
        });
        setSelectedMeeting(meeting);
        setIsModalOpen(true);
    };

    // Calendar helpers
    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const getMeetingsForDay = (date: Date) => {
        return meetings.filter((meeting) => {
            const meetingDate = parseISO(meeting.startTime);
            return isSameDay(meetingDate, date);
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "scheduled": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            case "confirmed": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
            case "completed": return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
            case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meetings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Schedule and manage meetings with contacts
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode("list")}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${viewMode === "list"
                                    ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setViewMode("calendar")}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${viewMode === "calendar"
                                    ? "bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white"
                                    : "text-gray-600 dark:text-gray-400"
                                }`}
                        >
                            Calendar
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        <Plus size={20} />
                        New Meeting
                    </button>
                </div>
            </div>

            {/* Calendar View Header */}
            {viewMode === "calendar" && (
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <button
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : viewMode === "list" ? (
                /* List View */
                <div className="space-y-3">
                    {meetings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <Calendar size={48} className="text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No meetings scheduled</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">Schedule your first meeting</p>
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                            >
                                <Plus size={20} />
                                Schedule Meeting
                            </button>
                        </div>
                    ) : (
                        meetings.map((meeting) => (
                            <div
                                key={meeting._id}
                                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-medium text-gray-900 dark:text-white">
                                                {meeting.title}
                                            </h3>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(meeting.status)}`}>
                                                {meeting.status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {format(parseISO(meeting.startTime), "MMM d, yyyy")}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {format(parseISO(meeting.startTime), "h:mm a")} ({meeting.duration} min)
                                            </span>
                                            {meeting.location && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {meeting.location}
                                                </span>
                                            )}
                                            {meeting.meetingUrl && (
                                                <span className="flex items-center gap-1">
                                                    <Video size={14} />
                                                    Virtual
                                                </span>
                                            )}
                                            {meeting.contactId && (
                                                <span className="flex items-center gap-1">
                                                    <User size={14} />
                                                    {meeting.contactId.firstName} {meeting.contactId.lastName}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openEditModal(meeting)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <Edit size={16} className="text-gray-500" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(meeting._id)}
                                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* Calendar View */
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day} className="py-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7">
                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-24 border-b border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"></div>
                        ))}

                        {daysInMonth.map((day) => {
                            const dayMeetings = getMeetingsForDay(day);
                            return (
                                <div
                                    key={day.toISOString()}
                                    className={`h-24 p-1 border-b border-r border-gray-200 dark:border-gray-700 ${isToday(day) ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                                        }`}
                                >
                                    <div className={`text-sm mb-1 ${isToday(day)
                                            ? "text-indigo-600 font-bold"
                                            : "text-gray-900 dark:text-white"
                                        }`}>
                                        {format(day, "d")}
                                    </div>
                                    <div className="space-y-1 overflow-hidden">
                                        {dayMeetings.slice(0, 2).map((meeting) => (
                                            <div
                                                key={meeting._id}
                                                onClick={() => openEditModal(meeting)}
                                                className="text-xs truncate px-1 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-200"
                                            >
                                                {format(parseISO(meeting.startTime), "h:mm")} {meeting.title}
                                            </div>
                                        ))}
                                        {dayMeetings.length > 2 && (
                                            <div className="text-xs text-gray-500 px-1">
                                                +{dayMeetings.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Meeting Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {selectedMeeting ? "Edit Meeting" : "Schedule Meeting"}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    resetForm();
                                }}
                                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Meeting title"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Time *
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Duration
                                </label>
                                <select
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="15">15 minutes</option>
                                    <option value="30">30 minutes</option>
                                    <option value="45">45 minutes</option>
                                    <option value="60">1 hour</option>
                                    <option value="90">1.5 hours</option>
                                    <option value="120">2 hours</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Office, Coffee shop, etc."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Meeting Link
                                </label>
                                <input
                                    type="url"
                                    value={formData.meetingUrl}
                                    onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
                                    placeholder="https://zoom.us/..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Meeting notes..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                                >
                                    {selectedMeeting ? "Update Meeting" : "Schedule Meeting"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
