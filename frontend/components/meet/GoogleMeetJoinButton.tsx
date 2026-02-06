"use client";

import { useState } from "react";
import { ClipboardDocumentIcon, CheckIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

interface GoogleMeetJoinButtonProps {
    hangoutLink: string;
    meetingCode: string;
    recordingEnabled?: boolean;
    duration: number;
    scheduledAt: string;
}

export function GoogleMeetJoinButton({
    hangoutLink,
    meetingCode,
    recordingEnabled,
    duration,
    scheduledAt,
}: GoogleMeetJoinButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(hangoutLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy link:", error);
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(meetingCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Failed to copy code:", error);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                    <VideoCameraIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Google Meet</h3>
                    <p className="text-sm text-gray-500">Video conferencing</p>
                </div>
            </div>

            {/* Join Button */}
            <a
                href={hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors mb-4"
            >
                <VideoCameraIcon className="w-5 h-5" />
                Join Google Meet
            </a>

            {/* Meeting Code */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 mb-3">
                <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-0.5">Meeting Code</p>
                    <p className="font-mono text-sm text-gray-900">{meetingCode}</p>
                </div>
                <button
                    onClick={handleCopyCode}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy meeting code"
                >
                    {copied ? (
                        <CheckIcon className="w-5 h-5 text-green-500" />
                    ) : (
                        <ClipboardDocumentIcon className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Meeting Link */}
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 mb-3">
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-0.5">Meeting Link</p>
                    <p className="text-sm text-blue-600 truncate">{hangoutLink}</p>
                </div>
                <button
                    onClick={handleCopyLink}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title="Copy meeting link"
                >
                    {copied ? (
                        <CheckIcon className="w-5 h-5 text-green-500" />
                    ) : (
                        <ClipboardDocumentIcon className="w-5 h-5" />
                    )}
                </button>
            </div>

            {/* Recording Notice */}
            {recordingEnabled && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <p className="text-sm text-amber-800">
                        This meeting may be recorded
                    </p>
                </div>
            )}

            {/* Additional Instructions */}
            <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                    Click "Join Google Meet" when your meeting is scheduled to start. If you have trouble,
                    you can also join by entering the meeting code at{" "}
                    <a
                        href="https://meet.google.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                    >
                        meet.google.com
                    </a>
                </p>
            </div>
        </div>
    );
}
