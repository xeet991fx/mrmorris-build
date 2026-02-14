"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    VideoCameraIcon,
    PlayIcon,
    TrashIcon,
    ShareIcon,
    ArrowDownTrayIcon,
    CalendarIcon,
    ClockIcon,
    UserGroupIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
} from "@heroicons/react/24/outline";
import { RecordingPlayer } from "@/components/meet";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";

interface Recording {
    _id: string;
    meetingTitle: string;
    scheduledAt: string;
    meetingDuration: number;
    attendees: {
        name: string;
        email: string;
    }[];
    status: "processing" | "ready" | "failed" | "deleted";
    driveFileId: string;
    driveFileUrl: string;
    recordingDuration: number;
}

export default function RecordingsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"date" | "duration">("date");
    const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

    // Close player on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setSelectedRecording(null);
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    const fetchRecordings = useCallback(async () => {
        try {
            const response = await axiosInstance.get(
                `/workspaces/${workspaceId}/recordings`
            );
            if (response.data.success) {
                setRecordings(response.data.data || []);
            }
        } catch (error: any) {
            toast.error("Failed to fetch recordings");
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    useEffect(() => {
        fetchRecordings();
    }, [fetchRecordings]);

    const handleDelete = async (recordingId: string) => {
        if (!confirm("Are you sure you want to delete this recording?")) {
            return;
        }

        try {
            await axiosInstance.delete(
                `/workspaces/${workspaceId}/recordings/${recordingId}`
            );
            toast.success("Recording deleted");
            fetchRecordings();
        } catch (error: any) {
            toast.error("Failed to delete recording");
        }
    };

    const handleShare = async (recording: Recording) => {
        try {
            // For now, copy the Drive URL to clipboard
            if (recording.driveFileUrl) {
                await navigator.clipboard.writeText(recording.driveFileUrl);
                toast.success("Recording link copied to clipboard");
            } else {
                toast.error("Recording URL not available");
            }
        } catch (error) {
            toast.error("Failed to copy link");
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return "N/A";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m ${secs}s`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    // Filter and sort recordings
    const filteredRecordings = recordings
        .filter((rec) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    rec.meetingTitle.toLowerCase().includes(query) ||
                    rec.attendees.some(
                        (a) =>
                            a.name.toLowerCase().includes(query) ||
                            a.email.toLowerCase().includes(query)
                    )
                );
            }
            return true;
        })
        .filter((rec) => {
            // Status filter
            if (filterStatus === "all") return true;
            return rec.status === filterStatus;
        })
        .sort((a, b) => {
            // Sort
            if (sortBy === "date") {
                return (
                    new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
                );
            }
            return (b.recordingDuration || 0) - (a.recordingDuration || 0);
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Loading recordings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Recordings</h1>
                    <p className="text-gray-600 mt-1">
                        View and manage your meeting recordings
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by meeting title or participant..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center gap-2">
                            <FunnelIcon className="w-5 h-5 text-gray-400" />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="all">All Status</option>
                                <option value="ready">Completed</option>
                                <option value="processing">Processing</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>

                        {/* Sort */}
                        <div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="date">Sort by Date</option>
                                <option value="duration">Sort by Duration</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Recordings Grid */}
                {filteredRecordings.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <VideoCameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {recordings.length === 0 ? "No recordings yet" : "No matching recordings"}
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                            {recordings.length === 0
                                ? "To record a meeting, start recording inside Google Meet during the call. Recordings are saved to Google Drive and sync here automatically."
                                : "Try adjusting your search or filter criteria"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredRecordings.map((recording) => (
                            <motion.div
                                key={recording._id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                {/* Thumbnail / Preview */}
                                <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 aspect-video flex items-center justify-center">
                                    {recording.status === "ready" ? (
                                        <button
                                            onClick={() => setSelectedRecording(recording)}
                                            className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors group w-full h-full"
                                        >
                                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <PlayIcon className="w-8 h-8 text-gray-900 ml-1" />
                                            </div>
                                        </button>
                                    ) : recording.status === "processing" ? (
                                        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500 rounded-full">
                                            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                            <span className="text-white text-sm font-medium">Processing</span>
                                        </div>
                                    ) : recording.status === "failed" ? (
                                        <div className="text-center">
                                            <div className="text-red-400 text-sm mb-1">Recording failed</div>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-sm">No recording</div>
                                    )}

                                    {/* Duration badge */}
                                    {recording.recordingDuration > 0 && (
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
                                            {formatDuration(recording.recordingDuration)}
                                        </div>
                                    )}
                                </div>

                                {/* Details */}
                                <div className="p-4">
                                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-1">
                                        {recording.meetingTitle}
                                    </h3>

                                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-4 h-4" />
                                            <span>
                                                {formatDate(recording.scheduledAt)} at {formatTime(recording.scheduledAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ClockIcon className="w-4 h-4" />
                                            <span>{recording.meetingDuration} min meeting</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <UserGroupIcon className="w-4 h-4" />
                                            <span>
                                                {recording.attendees.length} participant
                                                {recording.attendees.length !== 1 ? "s" : ""}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mb-4">
                                        <span
                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${recording.status === "ready"
                                                ? "bg-green-100 text-green-800"
                                                : recording.status === "processing"
                                                    ? "bg-blue-100 text-blue-800"
                                                    : recording.status === "failed"
                                                        ? "bg-red-100 text-red-800"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                        >
                                            {recording.status === "ready"
                                                ? "Completed"
                                                : recording.status === "processing"
                                                    ? "Processing"
                                                    : recording.status === "failed"
                                                        ? "Failed"
                                                        : "Pending"}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    {recording.status === "ready" && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedRecording(recording)}
                                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <PlayIcon className="w-4 h-4" />
                                                Watch
                                            </button>
                                            <button
                                                onClick={() => handleShare(recording)}
                                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Share Link"
                                            >
                                                <ShareIcon className="w-4 h-4" />
                                            </button>
                                            <a
                                                href={`https://drive.google.com/uc?export=download&id=${recording.driveFileId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                                title="Download"
                                            >
                                                <ArrowDownTrayIcon className="w-4 h-4" />
                                            </a>
                                            <button
                                                onClick={() => handleDelete(recording._id)}
                                                className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                                title="Delete"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Pagination placeholder */}
                {filteredRecordings.length > 0 && (
                    <div className="mt-8 flex justify-center">
                        <p className="text-sm text-gray-500">
                            Showing {filteredRecordings.length} of {recordings.length} recordings
                        </p>
                    </div>
                )}
            </div>

            {/* Recording Player Modal */}
            <AnimatePresence>
                {selectedRecording && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                        onClick={() => setSelectedRecording(null)}
                    >
                        <div
                            className="w-full max-w-6xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <RecordingPlayer
                                videoUrl={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/workspaces/${workspaceId}/recordings/${selectedRecording._id}/stream?token=${typeof window !== 'undefined' ? localStorage.getItem('token') : ''}`}
                                title={selectedRecording.meetingTitle}
                                duration={selectedRecording.recordingDuration}
                                onClose={() => setSelectedRecording(null)}
                                autoPlay
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
