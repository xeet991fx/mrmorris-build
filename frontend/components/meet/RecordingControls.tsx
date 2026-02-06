"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlayIcon,
    StopIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/solid";

interface RecordingControlsProps {
    isHost: boolean;
    recordingStatus: "not_started" | "recording" | "completed" | "failed";
    autoStartEnabled?: boolean;
    notifyParticipants?: boolean;
    onStartRecording?: () => Promise<void>;
    onStopRecording?: () => Promise<void>;
    meetingStartTime?: Date;
}

export function RecordingControls({
    isHost,
    recordingStatus,
    autoStartEnabled = false,
    notifyParticipants = true,
    onStartRecording,
    onStopRecording,
    meetingStartTime,
}: RecordingControlsProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [duration, setDuration] = useState(0);
    const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Timer for recording duration
    useEffect(() => {
        if (recordingStatus === "recording" && !intervalRef.current) {
            const startTime = recordingStartTime || new Date();
            if (!recordingStartTime) {
                setRecordingStartTime(startTime);
            }

            intervalRef.current = setInterval(() => {
                const now = new Date();
                const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                setDuration(diff);
            }, 1000);
        }

        if (recordingStatus !== "recording" && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [recordingStatus, recordingStartTime]);

    // Auto-start recording when meeting starts
    useEffect(() => {
        if (
            autoStartEnabled &&
            isHost &&
            recordingStatus === "not_started" &&
            meetingStartTime &&
            onStartRecording
        ) {
            const startDelay = setTimeout(() => {
                handleStartRecording();
            }, 3000); // 3 second delay after meeting starts

            return () => clearTimeout(startDelay);
        }
    }, [autoStartEnabled, isHost, recordingStatus, meetingStartTime]);

    const formatDuration = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours.toString().padStart(2, "0")}:${minutes
                .toString()
                .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    const handleStartRecording = async () => {
        if (!onStartRecording || isProcessing) return;

        setIsProcessing(true);
        try {
            await onStartRecording();
            setRecordingStartTime(new Date());
        } catch (error) {
            console.error("Failed to start recording:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStopRecording = async () => {
        if (!onStopRecording || isProcessing) return;

        setIsProcessing(true);
        try {
            await onStopRecording();
            setRecordingStartTime(null);
            setDuration(0);
        } catch (error) {
            console.error("Failed to stop recording:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Non-host view - just show recording status
    if (!isHost) {
        return (
            <AnimatePresence>
                {recordingStatus === "recording" && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg"
                    >
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-sm font-medium text-red-700">Recording</span>
                        </div>
                        <span className="text-sm text-red-600 font-mono">
                            {formatDuration(duration)}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Recording Controls</h3>
                {recordingStatus === "recording" && (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-sm font-mono text-gray-700">
                            {formatDuration(duration)}
                        </span>
                    </div>
                )}
            </div>

            {/* Recording Status */}
            <div className="mb-4">
                <div
                    className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${recordingStatus === "recording"
                            ? "bg-red-100 text-red-700"
                            : recordingStatus === "completed"
                                ? "bg-green-100 text-green-700"
                                : recordingStatus === "failed"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-gray-100 text-gray-600"
                        }`}
                >
                    {recordingStatus === "recording" && (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
                    )}
                    {recordingStatus === "recording"
                        ? "Recording in progress"
                        : recordingStatus === "completed"
                            ? "Recording stopped"
                            : recordingStatus === "failed"
                                ? "Recording failed"
                                : "Ready to record"}
                </div>
            </div>

            {/* Control Buttons */}
            <div className="flex gap-3">
                {recordingStatus === "not_started" && (
                    <button
                        onClick={handleStartRecording}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <div className="w-3 h-3 rounded-full bg-white" />
                        )}
                        {isProcessing ? "Starting..." : "Start Recording"}
                    </button>
                )}

                {recordingStatus === "recording" && (
                    <button
                        onClick={handleStopRecording}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {isProcessing ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <StopIcon className="w-5 h-5" />
                        )}
                        {isProcessing ? "Stopping..." : "Stop Recording"}
                    </button>
                )}

                {recordingStatus === "failed" && (
                    <button
                        onClick={handleStartRecording}
                        disabled={isProcessing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <PlayIcon className="w-5 h-5" />
                        Retry Recording
                    </button>
                )}
            </div>

            {/* Participant Notification */}
            {notifyParticipants && recordingStatus === "recording" && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                        All participants have been notified that this meeting is being recorded.
                    </p>
                </div>
            )}

            {/* Recording Info */}
            <div className="mt-4 text-xs text-gray-500">
                <p>
                    Recordings are saved to Google Drive and will be available after the meeting ends.
                </p>
                {autoStartEnabled && recordingStatus === "not_started" && (
                    <p className="mt-1 text-blue-600">
                        Auto-start is enabled. Recording will begin automatically.
                    </p>
                )}
            </div>
        </div>
    );
}
