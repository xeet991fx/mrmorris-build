"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    VideoCameraIcon,
    XMarkIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";

interface RecordingDisclaimerProps {
    isVisible: boolean;
    onAccept?: () => void;
    onDecline?: () => void;
    meetingTitle?: string;
    hostName?: string;
}

export function RecordingDisclaimer({
    isVisible,
    onAccept,
    onDecline,
    meetingTitle,
    hostName,
}: RecordingDisclaimerProps) {
    const [isClosing, setIsClosing] = useState(false);

    const handleAccept = () => {
        setIsClosing(true);
        setTimeout(() => {
            onAccept?.();
        }, 200);
    };

    const handleDecline = () => {
        setIsClosing(true);
        setTimeout(() => {
            onDecline?.();
        }, 200);
    };

    return (
        <AnimatePresence>
            {isVisible && !isClosing && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <VideoCameraIcon className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">
                                        Recording Notice
                                    </h2>
                                    <p className="text-red-100 text-sm">
                                        This meeting will be recorded
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="space-y-4">
                                <p className="text-gray-700">
                                    {hostName ? (
                                        <>
                                            <span className="font-semibold">{hostName}</span> has
                                            enabled recording for this meeting
                                            {meetingTitle && (
                                                <>
                                                    : <span className="font-medium">{meetingTitle}</span>
                                                </>
                                            )}
                                            .
                                        </>
                                    ) : (
                                        <>
                                            The host has enabled recording for this meeting
                                            {meetingTitle && (
                                                <>
                                                    : <span className="font-medium">{meetingTitle}</span>
                                                </>
                                            )}
                                            .
                                        </>
                                    )}
                                </p>

                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <ShieldCheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                        <div className="text-sm text-gray-600">
                                            <p className="font-medium text-gray-800 mb-1">
                                                Privacy Information
                                            </p>
                                            <ul className="space-y-1">
                                                <li>
                                                    Your video, audio, and shared content may be recorded
                                                </li>
                                                <li>
                                                    The recording will be saved to the host's Google Drive
                                                </li>
                                                <li>You can leave the meeting at any time</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-500">
                                    By joining this meeting, you consent to being recorded. If you
                                    do not wish to be recorded, please leave the meeting.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-6">
                                {onDecline && (
                                    <button
                                        onClick={handleDecline}
                                        className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                    >
                                        Leave Meeting
                                    </button>
                                )}
                                <button
                                    onClick={handleAccept}
                                    className="flex-1 px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                                >
                                    Join Anyway
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Simple inline recording notice (non-modal)
export function RecordingNotice({
    isRecording,
    variant = "banner",
    className = "",
}: {
    isRecording: boolean;
    variant?: "banner" | "inline";
    className?: string;
}) {
    if (!isRecording) return null;

    if (variant === "banner") {
        return (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`w-full bg-red-50 border-b border-red-200 px-4 py-2 ${className}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-medium text-red-700">
                        This meeting is being recorded
                    </span>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg ${className}`}
        >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-700">Recording</span>
        </motion.div>
    );
}
