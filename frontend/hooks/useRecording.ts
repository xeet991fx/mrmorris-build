"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { updateRecordingStatus, getRecording } from "@/lib/api/googleMeet";
import { IGoogleMeetRecording } from "@/lib/api/googleMeet.types";

export type RecordingStatus = "not_started" | "recording" | "completed" | "failed";

interface UseRecordingOptions {
    workspaceId: string;
    meetingId: string;
    autoStart?: boolean;
    notifyParticipants?: boolean;
    onRecordingStarted?: () => void;
    onRecordingStopped?: () => void;
    onError?: (error: string) => void;
}

interface UseRecordingReturn {
    status: RecordingStatus;
    isRecording: boolean;
    duration: number;
    isProcessing: boolean;
    showConsentModal: boolean;
    recordingData: IGoogleMeetRecording | null;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<void>;
    confirmConsent: () => void;
    declineConsent: () => void;
    formatDuration: (seconds: number) => string;
}

export function useRecording({
    workspaceId,
    meetingId,
    autoStart = false,
    notifyParticipants = true,
    onRecordingStarted,
    onRecordingStopped,
    onError,
}: UseRecordingOptions): UseRecordingReturn {
    const [status, setStatus] = useState<RecordingStatus>("not_started");
    const [duration, setDuration] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showConsentModal, setShowConsentModal] = useState(false);
    const [recordingData, setRecordingData] = useState<IGoogleMeetRecording | null>(null);
    const [recordingStartTime, setRecordingStartTime] = useState<Date | null>(null);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const pendingStart = useRef(false);

    // Format duration helper (no dependencies)
    const formatDuration = useCallback((seconds: number): string => {
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
    }, []);

    // Start recording API call (declare before initiateStartRecording)
    const doStartRecording = useCallback(async () => {
        setIsProcessing(true);
        try {
            const response = await updateRecordingStatus(workspaceId, meetingId, {
                status: "recording",
            });

            if (response.success) {
                setStatus("recording");
                setRecordingStartTime(new Date());
                setRecordingData(response.data?.recording || null);
                onRecordingStarted?.();
            } else {
                onError?.(response.error || "Failed to start recording");
            }
        } catch (error: any) {
            onError?.(error.message || "Failed to start recording");
        } finally {
            setIsProcessing(false);
        }
    }, [workspaceId, meetingId, onRecordingStarted, onError]);

    // Initiate recording with optional consent (declared after doStartRecording)
    const initiateStartRecording = useCallback(() => {
        if (notifyParticipants) {
            setShowConsentModal(true);
        } else {
            doStartRecording();
        }
    }, [notifyParticipants, doStartRecording]);

    // Duration timer
    useEffect(() => {
        if (status === "recording" && !intervalRef.current) {
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

        if (status !== "recording" && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [status, recordingStartTime]);

    // Fetch initial recording status
    useEffect(() => {
        if (workspaceId && meetingId) {
            getRecording(workspaceId, meetingId).then((response) => {
                if (response.success && response.data) {
                    setRecordingData({
                        status: "completed",
                        driveFileId: response.data.driveFileId,
                        driveFileUrl: response.data.driveFileUrl,
                        duration: response.data.duration,
                    });
                    setStatus("completed");
                }
            }).catch(() => {
                // No recording exists, that's fine
            });
        }
    }, [workspaceId, meetingId]);

    // Auto-start handling
    useEffect(() => {
        if (autoStart && status === "not_started" && !pendingStart.current) {
            pendingStart.current = true;
            const timer = setTimeout(() => {
                initiateStartRecording();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [autoStart, status, initiateStartRecording]);

    const startRecording = useCallback(async () => {
        if (isProcessing || status === "recording") return;
        initiateStartRecording();
    }, [isProcessing, status, initiateStartRecording]);

    const stopRecording = useCallback(async () => {
        if (isProcessing || status !== "recording") return;

        setIsProcessing(true);
        try {
            const response = await updateRecordingStatus(workspaceId, meetingId, {
                status: "completed",
                duration,
            });

            if (response.success) {
                setStatus("completed");
                setRecordingData(response.data?.recording || null);
                setRecordingStartTime(null);
                onRecordingStopped?.();
            } else {
                onError?.(response.error || "Failed to stop recording");
            }
        } catch (error: any) {
            onError?.(error.message || "Failed to stop recording");
        } finally {
            setIsProcessing(false);
        }
    }, [workspaceId, meetingId, isProcessing, status, duration, onRecordingStopped, onError]);

    const confirmConsent = useCallback(() => {
        setShowConsentModal(false);
        doStartRecording();
    }, [doStartRecording]);

    const declineConsent = useCallback(() => {
        setShowConsentModal(false);
        pendingStart.current = false;
    }, []);

    return {
        status,
        isRecording: status === "recording",
        duration,
        isProcessing,
        showConsentModal,
        recordingData,
        startRecording,
        stopRecording,
        confirmConsent,
        declineConsent,
        formatDuration,
    };
}
