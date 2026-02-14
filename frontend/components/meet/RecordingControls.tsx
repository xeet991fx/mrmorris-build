"use client";

import { motion } from "framer-motion";
import {
    VideoCameraIcon,
    CheckCircleIcon,
    ArrowTopRightOnSquareIcon,
    InformationCircleIcon,
} from "@heroicons/react/24/outline";

interface RecordingControlsProps {
    isHost: boolean;
    recordingStatus: "not_started" | "recording" | "completed" | "failed";
    meetingLink?: string;
}

export function RecordingControls({
    isHost,
    recordingStatus,
    meetingLink,
}: RecordingControlsProps) {
    // Recording already synced from Google Drive
    if (recordingStatus === "completed") {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
            >
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 text-sm">Recording Available</h3>
                        <p className="text-xs text-gray-500">Synced from Google Drive</p>
                    </div>
                </div>
                <p className="text-sm text-gray-600">
                    This meeting was recorded. View it in the{" "}
                    <span className="font-medium text-blue-600">Recordings</span> tab.
                </p>
            </motion.div>
        );
    }

    // Main guidance panel
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                    <VideoCameraIcon className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">Meeting Recording</h3>
            </div>

            {/* Info Banner */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    Recording is handled by Google Meet. Start recording inside your
                    Google Meet call — it will sync here automatically via Google Drive.
                </p>
            </div>

            {/* Steps */}
            <div className="space-y-3 mb-4">
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">1</span>
                    </div>
                    <p className="text-xs text-gray-600">
                        Join the Google Meet call
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">2</span>
                    </div>
                    <p className="text-xs text-gray-600">
                        Click <span className="font-medium text-gray-800">Activities → Recording</span> in the Meet toolbar
                    </p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-bold text-gray-500">3</span>
                    </div>
                    <p className="text-xs text-gray-600">
                        The recording auto-saves to Google Drive and syncs here after the meeting ends
                    </p>
                </div>
            </div>

            {/* Open Google Meet Button */}
            {meetingLink && (
                <a
                    href={meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                    Open Google Meet
                </a>
            )}

            {/* Note for non-hosts */}
            {!isHost && (
                <p className="mt-3 text-[11px] text-gray-400 text-center">
                    Only the meeting host can start recording in Google Meet.
                </p>
            )}
        </motion.div>
    );
}
