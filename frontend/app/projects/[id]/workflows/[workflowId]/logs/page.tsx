"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeftIcon, ArrowPathIcon, FunnelIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { getWorkflow, getWorkflowEnrollments, type WorkflowEnrollment } from "@/lib/api/workflow";
import { Workflow } from "@/lib/workflow/types";
import { format } from "date-fns";

export default function WorkflowLogsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;
    const workflowId = params.workflowId as string;

    const [workflow, setWorkflow] = useState<Workflow | null>(null);
    const [enrollments, setEnrollments] = useState<WorkflowEnrollment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEnrollment, setSelectedEnrollment] = useState<WorkflowEnrollment | null>(null);

    const fetchData = async (refresh = false) => {
        if (refresh) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const [workflowRes, enrollmentsRes] = await Promise.all([
                getWorkflow(workspaceId, workflowId),
                getWorkflowEnrollments(workspaceId, workflowId, {
                    status: statusFilter === "all" ? undefined : statusFilter,
                }),
            ]);

            if (workflowRes.success && workflowRes.data?.workflow) {
                setWorkflow(workflowRes.data.workflow);
            }

            if (enrollmentsRes.success && enrollmentsRes.data?.enrollments) {
                setEnrollments(enrollmentsRes.data.enrollments);
            }
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, workflowId, statusFilter]);

    const handleBack = () => {
        router.push(`/projects/${workspaceId}/workflows/${workflowId}`);
    };

    const handleRefresh = () => {
        fetchData(true);
    };

    const filteredEnrollments = enrollments.filter((enrollment) => {
        if (searchQuery) {
            const entityIdMatch = enrollment.entityId.toLowerCase().includes(searchQuery.toLowerCase());
            return entityIdMatch;
        }
        return true;
    });

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground">Loading execution logs...</p>
                </div>
            </div>
        );
    }

    if (!workflow) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <p className="text-muted-foreground mb-4">Failed to load workflow</p>
                    <button
                        onClick={handleBack}
                        className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="h-14 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        title="Back to workflow"
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <div>
                        <h1 className="text-lg font-semibold text-foreground">{workflow.name}</h1>
                        <p className="text-xs text-muted-foreground">Execution Logs</p>
                    </div>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                >
                    <ArrowPathIcon className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>

            {/* Filters */}
            <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by entity ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="completed">Completed</option>
                            <option value="failed">Failed</option>
                            <option value="paused">Paused</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                {filteredEnrollments.length === 0 ? (
                    <div className="text-center py-12 bg-card border border-border rounded-xl">
                        <p className="text-muted-foreground mb-2">No execution logs found</p>
                        <p className="text-sm text-muted-foreground">
                            {statusFilter !== "all"
                                ? "Try changing the status filter"
                                : "Enrollments will appear here once the workflow is active"}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Enrollments List */}
                        <div className="space-y-3">
                            {filteredEnrollments.map((enrollment) => (
                                <motion.div
                                    key={enrollment._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => setSelectedEnrollment(enrollment)}
                                    className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
                                        selectedEnrollment?._id === enrollment._id
                                            ? "border-primary ring-2 ring-primary/20"
                                            : "border-border"
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-foreground">
                                                    {enrollment.entityType.charAt(0).toUpperCase() +
                                                        enrollment.entityType.slice(1)}
                                                </span>
                                                <StatusBadge status={enrollment.status} />
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                                                {enrollment.entityId}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>
                                            Enrolled {format(new Date(enrollment.enrolledAt), "MMM d, h:mm a")}
                                        </span>
                                        {enrollment.completedAt && (
                                            <span>
                                                Completed {format(new Date(enrollment.completedAt), "MMM d, h:mm a")}
                                            </span>
                                        )}
                                    </div>

                                    {enrollment.stepsExecuted && enrollment.stepsExecuted.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary transition-all"
                                                        style={{
                                                            width: `${
                                                                (enrollment.stepsExecuted.length /
                                                                    workflow.steps.length) *
                                                                100
                                                            }%`,
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {enrollment.stepsExecuted.length} / {workflow.steps.length} steps
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>

                        {/* Enrollment Details */}
                        {selectedEnrollment ? (
                            <div className="bg-card border border-border rounded-xl p-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] overflow-y-auto">
                                <h3 className="text-lg font-semibold text-foreground mb-4">Execution Details</h3>

                                {/* Info */}
                                <div className="space-y-3 mb-6">
                                    <InfoRow label="Enrollment ID" value={selectedEnrollment._id} />
                                    <InfoRow label="Entity ID" value={selectedEnrollment.entityId} />
                                    <InfoRow
                                        label="Entity Type"
                                        value={
                                            selectedEnrollment.entityType.charAt(0).toUpperCase() +
                                            selectedEnrollment.entityType.slice(1)
                                        }
                                    />
                                    <InfoRow
                                        label="Status"
                                        value={<StatusBadge status={selectedEnrollment.status} />}
                                    />
                                    <InfoRow
                                        label="Enrolled At"
                                        value={format(
                                            new Date(selectedEnrollment.enrolledAt),
                                            "MMM d, yyyy h:mm:ss a"
                                        )}
                                    />
                                    {selectedEnrollment.completedAt && (
                                        <InfoRow
                                            label="Completed At"
                                            value={format(
                                                new Date(selectedEnrollment.completedAt),
                                                "MMM d, yyyy h:mm:ss a"
                                            )}
                                        />
                                    )}
                                    <InfoRow
                                        label="Source"
                                        value={selectedEnrollment.enrollmentSource}
                                    />
                                </div>

                                {/* Steps Executed */}
                                {selectedEnrollment.stepsExecuted &&
                                    selectedEnrollment.stepsExecuted.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-foreground mb-3">
                                                Steps Executed
                                            </h4>
                                            <div className="space-y-2">
                                                {selectedEnrollment.stepsExecuted.map((step, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-muted/50 border border-border rounded-lg p-3"
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                                                    {index + 1}
                                                                </span>
                                                                <span className="text-sm font-medium text-foreground">
                                                                    {step.stepName}
                                                                </span>
                                                            </div>
                                                            <StepStatusBadge status={step.status} />
                                                        </div>
                                                        <div className="ml-8 space-y-1 text-xs text-muted-foreground">
                                                            <p>
                                                                Started: {format(new Date(step.startedAt), "h:mm:ss a")}
                                                            </p>
                                                            {step.completedAt && (
                                                                <p>
                                                                    Completed:{" "}
                                                                    {format(new Date(step.completedAt), "h:mm:ss a")}
                                                                </p>
                                                            )}
                                                            {step.error && (
                                                                <p className="text-red-600 dark:text-red-400">
                                                                    Error: {step.error}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Error Info */}
                                {selectedEnrollment.lastError && (
                                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                        <h4 className="text-sm font-medium text-red-900 dark:text-red-200 mb-2">
                                            Last Error
                                        </h4>
                                        <p className="text-xs text-red-800 dark:text-red-300 font-mono">
                                            {selectedEnrollment.lastError}
                                        </p>
                                        {selectedEnrollment.errorCount && (
                                            <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                                                Error count: {selectedEnrollment.errorCount}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center lg:sticky lg:top-20">
                                <p className="text-muted-foreground">
                                    Select an enrollment to view execution details
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper Components
function StatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        active: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    };

    return (
        <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                colors[status] || colors.active
            }`}
        >
            {status}
        </span>
    );
}

function StepStatusBadge({ status }: { status: string }) {
    const colors: Record<string, string> = {
        completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        running: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };

    return (
        <span
            className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                colors[status] || colors.pending
            }`}
        >
            {status}
        </span>
    );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{label}:</span>
            <span className="text-foreground font-medium">{value}</span>
        </div>
    );
}
