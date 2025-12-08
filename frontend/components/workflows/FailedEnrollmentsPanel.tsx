"use client";

import { useState, useEffect } from "react";
import {
    ExclamationCircleIcon,
    ArrowPathIcon,
    XMarkIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FailedEnrollment {
    _id: string;
    entityId: {
        _id: string;
        firstName?: string;
        lastName?: string;
        name?: string;
        email?: string;
    };
    entityType: string;
    currentStepId: string;
    lastError: string;
    errorCount: number;
    status: "failed" | "retrying";
    nextExecutionTime?: string;
    stepsExecuted: Array<{
        stepName: string;
        status: string;
        error?: string;
    }>;
    createdAt: string;
}

interface FailedEnrollmentsPanelProps {
    workspaceId: string;
    workflowId: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function FailedEnrollmentsPanel({
    workspaceId,
    workflowId,
    isOpen,
    onClose,
}: FailedEnrollmentsPanelProps) {
    const [enrollments, setEnrollments] = useState<FailedEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            fetchFailedEnrollments();
        }
    }, [isOpen, workspaceId, workflowId]);

    const fetchFailedEnrollments = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/workflows/${workflowId}/enrollments?status=failed,retrying`
            );
            if (!response.ok) throw new Error("Failed to fetch enrollments");

            const data = await response.json();
            setEnrollments(data.data?.enrollments || []);
        } catch (error) {
            console.error("Failed to fetch enrollments:", error);
            toast.error("Failed to load failed enrollments");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRetry = async (enrollmentId: string) => {
        setRetryingIds((prev) => new Set(prev).add(enrollmentId));

        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/workflows/${workflowId}/enrollments/${enrollmentId}/retry`,
                { method: "POST" }
            );

            if (!response.ok) throw new Error("Retry failed");

            toast.success("Enrollment retrying...");
            await fetchFailedEnrollments();
        } catch (error) {
            console.error("Retry error:", error);
            toast.error("Failed to retry enrollment");
        } finally {
            setRetryingIds((prev) => {
                const newSet = new Set(prev);
                newSet.delete(enrollmentId);
                return newSet;
            });
        }
    };

    const handleCancel = async (enrollmentId: string) => {
        try {
            const response = await fetch(
                `/api/workspaces/${workspaceId}/workflows/${workflowId}/enrollments/${enrollmentId}`,
                { method: "DELETE" }
            );

            if (!response.ok) throw new Error("Cancel failed");

            toast.success("Enrollment cancelled");
            await fetchFailedEnrollments();
        } catch (error) {
            console.error("Cancel error:", error);
            toast.error("Failed to cancel enrollment");
        }
    };

    const getEntityName = (enrollment: FailedEnrollment): string => {
        const entity = enrollment.entityId;
        if (entity.firstName || entity.lastName) {
            return `${entity.firstName || ""} ${entity.lastName || ""}`.trim();
        }
        return entity.name || entity.email || "Unknown";
    };

    const getFailedStepName = (enrollment: FailedEnrollment): string => {
        const failedStep = enrollment.stepsExecuted
            .reverse()
            .find((step) => step.status === "failed");
        return failedStep?.stepName || "Unknown step";
    };

    const formatTimeAgo = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;

        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? "s" : ""} ago`;

        const diffDays = Math.round(diffHours / 24);
        return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    };

    const formatNextRetry = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);

        if (diffMins < 0) return "pending";
        if (diffMins < 1) return "in a moment";
        if (diffMins < 60) return `in ${diffMins} min${diffMins > 1 ? "s" : ""}`;

        const diffHours = Math.round(diffMins / 60);
        return `in ${diffHours} hr${diffHours > 1 ? "s" : ""}`;
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                {/* Panel */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="relative w-full max-w-3xl max-h-[85vh] bg-card border-t sm:border border-border sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-red-500/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                <ExclamationCircleIcon className="w-5 h-5 text-red-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">
                                    Failed Enrollments
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {enrollments.length} enrollment{enrollments.length !== 1 ? "s" : ""}{" "}
                                    need attention
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : enrollments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                    <svg
                                        className="w-8 h-8 text-green-500"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <p className="text-lg font-semibold text-foreground">
                                    No Failed Enrollments
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    All enrollments are running smoothly
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {enrollments.map((enrollment) => (
                                    <div
                                        key={enrollment._id}
                                        className="p-6 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                {/* Entity Name & Status */}
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-foreground">
                                                        {getEntityName(enrollment)}
                                                    </h3>
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            enrollment.status === "retrying"
                                                                ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                                                        }`}
                                                    >
                                                        {enrollment.status === "retrying"
                                                            ? "Retrying"
                                                            : "Failed"}
                                                    </span>
                                                </div>

                                                {/* Failed Step */}
                                                <div className="text-sm text-muted-foreground mb-1">
                                                    Failed at:{" "}
                                                    <span className="font-medium text-foreground">
                                                        {getFailedStepName(enrollment)}
                                                    </span>
                                                </div>

                                                {/* Error Message */}
                                                <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-3 mb-3">
                                                    <p className="text-sm text-red-600 dark:text-red-400">
                                                        {enrollment.lastError}
                                                    </p>
                                                </div>

                                                {/* Metadata */}
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <ExclamationCircleIcon className="w-3.5 h-3.5" />
                                                        {enrollment.errorCount} attempt
                                                        {enrollment.errorCount !== 1 ? "s" : ""}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <ClockIcon className="w-3.5 h-3.5" />
                                                        {formatTimeAgo(enrollment.createdAt)}
                                                    </div>
                                                    {enrollment.status === "retrying" &&
                                                        enrollment.nextExecutionTime && (
                                                            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                                                                <ArrowPathIcon className="w-3.5 h-3.5" />
                                                                Next retry{" "}
                                                                {formatNextRetry(
                                                                    enrollment.nextExecutionTime
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => handleRetry(enrollment._id)}
                                                    disabled={retryingIds.has(enrollment._id)}
                                                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                                                >
                                                    {retryingIds.has(enrollment._id) ? (
                                                        <>
                                                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Retrying...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ArrowPathIcon className="w-4 h-4" />
                                                            Retry
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleCancel(enrollment._id)}
                                                    className="px-3 py-1.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {enrollments.length > 0 && (
                        <div className="px-6 py-4 border-t border-border bg-muted/30">
                            <p className="text-xs text-muted-foreground">
                                Failed enrollments are automatically retried up to 3 times with
                                exponential backoff (1min, 5min, 15min)
                            </p>
                        </div>
                    )}
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
