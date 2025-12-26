"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PhoneIcon,
    PlusIcon,
    ArrowPathIcon,
    PlayIcon,
    PauseIcon,
    DocumentTextIcon,
    UserIcon,
    ClockIcon,
    TagIcon,
    TrashIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationCircleIcon,
    MicrophoneIcon,
} from "@heroicons/react/24/outline";
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

    // Upload form state
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
            setUploadData({
                title: "",
                audioFile: null,
                transcript: "",
                participants: [],
                tags: [],
            });
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

    const getSentimentColor = (sentiment?: string) => {
        switch (sentiment) {
            case "positive": return "text-green-500";
            case "negative": return "text-red-500";
            default: return "text-yellow-500";
        }
    };

    const getSentimentIcon = (sentiment?: string) => {
        switch (sentiment) {
            case "positive": return <CheckCircleIcon className="w-5 h-5" />;
            case "negative": return <XCircleIcon className="w-5 h-5" />;
            default: return <ExclamationCircleIcon className="w-5 h-5" />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Call Recordings</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Upload and analyze sales call recordings with AI insights
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadRecordings}
                        disabled={isLoading}
                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                    >
                        <ArrowPathIcon className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    </button>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Upload Recording
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recordings List */}
                <div className="lg:col-span-1 space-y-3">
                    <h2 className="text-lg font-semibold text-foreground">Recordings ({recordings.length})</h2>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <ArrowPathIcon className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : recordings.length === 0 ? (
                        <div className="text-center py-12 border border-dashed border-border rounded-lg">
                            <PhoneIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No call recordings yet</p>
                            <button
                                onClick={() => setShowUploadModal(true)}
                                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Upload First Recording
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto">
                            {recordings.map((recording) => (
                                <motion.div
                                    key={recording._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => setSelectedRecording(recording)}
                                    className={cn(
                                        "p-4 rounded-lg border cursor-pointer transition-all",
                                        selectedRecording?._id === recording._id
                                            ? "border-primary bg-primary/5"
                                            : "border-border bg-card hover:border-primary/50"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-foreground line-clamp-1">
                                            {recording.title}
                                        </h3>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(recording._id);
                                            }}
                                            className="text-red-500 hover:text-red-600"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <ClockIcon className="w-3 h-3" />
                                        <span>{new Date(recording.recordedAt).toLocaleDateString()}</span>
                                        {recording.duration && (
                                            <>
                                                <span>•</span>
                                                <span>{formatDuration(recording.duration)}</span>
                                            </>
                                        )}
                                    </div>
                                    {recording.contactId && (
                                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                            <UserIcon className="w-3 h-3" />
                                            <span>
                                                {recording.contactId.firstName} {recording.contactId.lastName}
                                            </span>
                                        </div>
                                    )}
                                    {recording.overallSentiment && (
                                        <div className={cn("flex items-center gap-1 mt-2", getSentimentColor(recording.overallSentiment))}>
                                            {getSentimentIcon(recording.overallSentiment)}
                                            <span className="text-xs capitalize">{recording.overallSentiment}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recording Detail */}
                <div className="lg:col-span-2">
                    {selectedRecording ? (
                        <div className="space-y-4">
                            {/* Player */}
                            {selectedRecording.audioUrl && (
                                <div className="p-6 rounded-lg border border-border bg-card">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={togglePlayPause}
                                            className="p-4 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                        >
                                            {isPlaying ? (
                                                <PauseIcon className="w-6 h-6" />
                                            ) : (
                                                <PlayIcon className="w-6 h-6" />
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <h2 className="font-semibold text-foreground">{selectedRecording.title}</h2>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(selectedRecording.recordedAt).toLocaleString()}
                                            </p>
                                        </div>
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
                                <div className="p-6 rounded-lg border border-border bg-card">
                                    <h3 className="font-semibold text-foreground mb-2">AI Summary</h3>
                                    <p className="text-sm text-foreground">{selectedRecording.summary}</p>
                                </div>
                            )}

                            {/* BANT Insights */}
                            {selectedRecording.keyInsights && (
                                <div className="p-6 rounded-lg border border-border bg-card">
                                    <h3 className="font-semibold text-foreground mb-4">BANT Insights</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedRecording.keyInsights.budget?.mentioned && (
                                            <div className="p-3 rounded bg-muted/30">
                                                <p className="text-sm font-medium text-foreground">Budget</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedRecording.keyInsights.budget.details}
                                                </p>
                                            </div>
                                        )}
                                        {selectedRecording.keyInsights.authority?.decisionMaker && (
                                            <div className="p-3 rounded bg-muted/30">
                                                <p className="text-sm font-medium text-foreground">Authority</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedRecording.keyInsights.authority.details}
                                                </p>
                                            </div>
                                        )}
                                        {selectedRecording.keyInsights.need?.identified && (
                                            <div className="p-3 rounded bg-muted/30">
                                                <p className="text-sm font-medium text-foreground">Need</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedRecording.keyInsights.need.painPoints?.join(", ")}
                                                </p>
                                            </div>
                                        )}
                                        {selectedRecording.keyInsights.timeline?.mentioned && (
                                            <div className="p-3 rounded bg-muted/30">
                                                <p className="text-sm font-medium text-foreground">Timeline</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {selectedRecording.keyInsights.timeline.details}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Action Items */}
                            {selectedRecording.actionItems && selectedRecording.actionItems.length > 0 && (
                                <div className="p-6 rounded-lg border border-border bg-card">
                                    <h3 className="font-semibold text-foreground mb-3">Action Items</h3>
                                    <div className="space-y-2">
                                        {selectedRecording.actionItems.map((item, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <CheckCircleIcon className={cn(
                                                    "w-4 h-4 mt-0.5",
                                                    item.completed ? "text-green-500" : "text-muted-foreground"
                                                )} />
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground">{item.task}</p>
                                                    {item.assignee && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Assigned to: {item.assignee}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Transcript */}
                            {selectedRecording.transcript && (
                                <div className="p-6 rounded-lg border border-border bg-card">
                                    <div className="flex items-center gap-2 mb-3">
                                        <DocumentTextIcon className="w-5 h-5 text-primary" />
                                        <h3 className="font-semibold text-foreground">Transcript</h3>
                                    </div>
                                    <div className="prose prose-sm max-w-none">
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {selectedRecording.transcript}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full border border-dashed border-border rounded-lg">
                            <div className="text-center">
                                <MicrophoneIcon className="w-16 h-16 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Select a recording to view details
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Modal */}
            <AnimatePresence>
                {showUploadModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                        onClick={() => setShowUploadModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-card border border-border rounded-lg p-6 w-full max-w-lg"
                        >
                            <h2 className="text-xl font-bold text-foreground mb-4">Upload Call Recording</h2>

                            <form onSubmit={handleUpload} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={uploadData.title}
                                        onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                                        placeholder="e.g., Discovery call with Acme Corp"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Audio File *
                                    </label>
                                    <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => setUploadData({
                                            ...uploadData,
                                            audioFile: e.target.files?.[0] || null
                                        })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-foreground mb-1">
                                        Transcript (Optional)
                                    </label>
                                    <textarea
                                        value={uploadData.transcript}
                                        onChange={(e) => setUploadData({ ...uploadData, transcript: e.target.value })}
                                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground"
                                        rows={4}
                                        placeholder="Paste transcript here (optional)"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowUploadModal(false)}
                                        className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/70 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={uploading}
                                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
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
