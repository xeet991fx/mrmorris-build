"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    XMarkIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import {
    Phone,
    Plus,
    RefreshCw,
    Play,
    Pause,
    FileText,
    User,
    Clock,
    Tag,
    Trash2,
    Mic,
    Upload,
} from "lucide-react";
import {
    getCallRecordings,
    uploadCallRecording,
    deleteCallRecording,
    CallRecording,
} from "@/lib/api/callRecording";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export default function CallRecordingsPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const [recordings, setRecordings] = useState<CallRecording[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedRecording, setSelectedRecording] = useState<CallRecording | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [uploadData, setUploadData] = useState({
        title: "",
        audioFile: null as File | null,
        transcript: "",
        participants: [] as string[],
        tags: [] as string[],
    });
    const [uploading, setUploading] = useState(false);

    const loadRecordings = async () => {
        setIsLoading(true);
        try {
            const response = await getCallRecordings(workspaceId);
            if (response.success) {
                setRecordings(response.data);
            }
        } catch (error) {
            console.error("Error loading call recordings:", error);
            toast.error("Failed to load call recordings");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRecordings();
    }, [workspaceId]);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadData.title || !uploadData.audioFile) {
            toast.error("Please provide a title and audio file");
            return;
        }

        setUploading(true);
        try {
            await uploadCallRecording(workspaceId, {
                title: uploadData.title,
                audio: uploadData.audioFile,
                transcript: uploadData.transcript || undefined,
                participants: uploadData.participants.length > 0 ? uploadData.participants : undefined,
                tags: uploadData.tags.length > 0 ? uploadData.tags : undefined,
            });

            toast.success("Call recording uploaded successfully");
            setShowUploadModal(false);
            setUploadData({ title: "", audioFile: null, transcript: "", participants: [], tags: [] });
            loadRecordings();
        } catch (error) {
            console.error("Error uploading recording:", error);
            toast.error("Failed to upload recording");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this recording?")) return;

        try {
            await deleteCallRecording(workspaceId, id);
            toast.success("Recording deleted");
            loadRecordings();
            if (selectedRecording?._id === id) {
                setSelectedRecording(null);
            }
        } catch (error) {
            console.error("Error deleting recording:", error);
            toast.error("Failed to delete recording");
        }
    };

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatDuration = (seconds?: number) => {
        if (!seconds) return "0:00";
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getSentimentBadge = (sentiment?: string) => {
        const badges: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            positive: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
            negative: { bg: "bg-rose-500/10", text: "text-rose-500", icon: <XCircleIcon className="w-3.5 h-3.5" /> },
            neutral: { bg: "bg-amber-500/10", text: "text-amber-500", icon: <ExclamationCircleIcon className="w-3.5 h-3.5" /> },
        };
        const badge = badges[sentiment || "neutral"] || badges.neutral;
        return (
            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", badge.bg, badge.text)}>
                {badge.icon}
                {sentiment ? sentiment.charAt(0).toUpperCase() + sentiment.slice(1) : "Neutral"}
            </span>
        );
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-zinc-500">Loading call recordings...</p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-zinc-900">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-violet-500" />
                        <div>
                            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Call Recordings</h1>
                            <p className="text-xs text-zinc-500">{recordings.length} recordings • AI-powered insights</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadRecordings}
                            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Upload Recording
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recordings List */}
                    <div className="lg:col-span-1 space-y-3">
                        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Recordings ({recordings.length})
                        </h2>

                        {recordings.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-12 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl"
                            >
                                <Phone className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                <p className="text-sm text-zinc-500 mb-4">No call recordings yet</p>
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    Upload First Recording
                                </button>
                            </motion.div>
                        ) : (
                            <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                                {recordings.map((recording, index) => (
                                    <motion.div
                                        key={recording._id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => setSelectedRecording(recording)}
                                        className={cn(
                                            "p-4 rounded-xl border cursor-pointer transition-all",
                                            selectedRecording?._id === recording._id
                                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                                                : "border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-700"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 text-sm">{recording.title}</h3>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(recording._id);
                                                }}
                                                className="text-zinc-400 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(recording.recordedAt).toLocaleDateString()}</span>
                                            {recording.duration && (
                                                <>
                                                    <span className="text-zinc-300 dark:text-zinc-600">•</span>
                                                    <span>{formatDuration(recording.duration)}</span>
                                                </>
                                            )}
                                        </div>
                                        {recording.contactId && (
                                            <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-2">
                                                <User className="w-3 h-3" />
                                                <span>{recording.contactId.firstName} {recording.contactId.lastName}</span>
                                            </div>
                                        )}
                                        {recording.overallSentiment && getSentimentBadge(recording.overallSentiment)}
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recording Detail */}
                    <div className="lg:col-span-2">
                        {selectedRecording ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                {/* Player */}
                                {selectedRecording.audioUrl && (
                                    <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <div className="flex items-center gap-4">
                                            <button
                                                onClick={togglePlayPause}
                                                className="p-4 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                            >
                                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                            </button>
                                            <div className="flex-1">
                                                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedRecording.title}</h2>
                                                <p className="text-sm text-zinc-500">{new Date(selectedRecording.recordedAt).toLocaleString()}</p>
                                            </div>
                                            {selectedRecording.overallSentiment && getSentimentBadge(selectedRecording.overallSentiment)}
                                        </div>
                                        <audio
                                            ref={audioRef}
                                            src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}${selectedRecording.audioUrl}`}
                                            onEnded={() => setIsPlaying(false)}
                                            className="w-full mt-4"
                                            controls
                                        />
                                    </div>
                                )}

                                {/* Summary */}
                                {selectedRecording.summary && (
                                    <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-violet-500 rounded-full" />
                                            AI Summary
                                        </h3>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{selectedRecording.summary}</p>
                                    </div>
                                )}

                                {/* BANT Insights */}
                                {selectedRecording.keyInsights && (
                                    <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                            BANT Insights
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedRecording.keyInsights.budget?.mentioned && (
                                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">💰 Budget</p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedRecording.keyInsights.budget.details}</p>
                                                </div>
                                            )}
                                            {selectedRecording.keyInsights.authority?.decisionMaker && (
                                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">👑 Authority</p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedRecording.keyInsights.authority.details}</p>
                                                </div>
                                            )}
                                            {selectedRecording.keyInsights.need?.identified && (
                                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mb-1">🎯 Need</p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedRecording.keyInsights.need.painPoints?.join(", ")}</p>
                                                </div>
                                            )}
                                            {selectedRecording.keyInsights.timeline?.mentioned && (
                                                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                                                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">⏰ Timeline</p>
                                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedRecording.keyInsights.timeline.details}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Action Items */}
                                {selectedRecording.actionItems && selectedRecording.actionItems.length > 0 && (
                                    <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-amber-500 rounded-full" />
                                            Action Items
                                        </h3>
                                        <div className="space-y-2">
                                            {selectedRecording.actionItems.map((item, idx) => (
                                                <div key={idx} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                    <CheckCircleIcon className={cn(
                                                        "w-4 h-4 mt-0.5 flex-shrink-0",
                                                        item.completed ? "text-emerald-500" : "text-zinc-300 dark:text-zinc-600"
                                                    )} />
                                                    <div className="flex-1">
                                                        <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.task}</p>
                                                        {item.assignee && (
                                                            <p className="text-xs text-zinc-500 mt-0.5">Assigned to: {item.assignee}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transcript */}
                                {selectedRecording.transcript && (
                                    <div className="p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                                        <div className="flex items-center gap-2 mb-3">
                                            <FileText className="w-4 h-4 text-emerald-500" />
                                            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Transcript</h3>
                                        </div>
                                        <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                            {selectedRecording.transcript}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="flex items-center justify-center h-full min-h-[400px] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                                <div className="text-center">
                                    <Mic className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                    <p className="text-sm text-zinc-500">Select a recording to view details</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                        onClick={() => setShowUploadModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center gap-3">
                                    <Upload className="w-5 h-5 text-emerald-500" />
                                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Upload Call Recording</h2>
                                </div>
                                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                                    <XMarkIcon className="w-5 h-5 text-zinc-500" />
                                </button>
                            </div>

                            <form onSubmit={handleUpload} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Title *</label>
                                    <input
                                        type="text"
                                        value={uploadData.title}
                                        onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        placeholder="e.g., Discovery call with Acme Corp"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Audio File *</label>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setUploadData({ ...uploadData, audioFile: e.target.files?.[0] || null })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:bg-emerald-500 file:text-white file:text-xs file:font-medium"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Transcript (Optional)</label>
                                    <textarea
                                        value={uploadData.transcript}
                                        onChange={(e) => setUploadData({ ...uploadData, transcript: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                        rows={4}
                                        placeholder="Paste transcript here (optional)"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="flex-1 px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="flex-1 px-4 py-2 rounded-full bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        {uploading ? "Uploading..." : "Upload"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
