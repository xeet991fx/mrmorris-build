"use client";

import { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BoltIcon, PlayIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";
import { Workflow } from "@/lib/workflow/types";
import { fetchWorkflows, enrollInWorkflow } from "@/lib/workflow/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

// ============================================
// PROPS
// ============================================

interface EnrollInWorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
    entityType: "contact" | "deal" | "company";
    entityId: string;
    entityName: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function EnrollInWorkflowModal({
    isOpen,
    onClose,
    entityType,
    entityId,
    entityName,
}: EnrollInWorkflowModalProps) {
    const params = useParams();
    const workspaceId = params.id as string;

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
    const [isEnrolling, setIsEnrolling] = useState(false);

    // Fetch active workflows on mount
    useEffect(() => {
        if (isOpen && workspaceId) {
            loadWorkflows();
        }
    }, [isOpen, workspaceId]);

    const loadWorkflows = async () => {
        setIsLoading(true);
        try {
            const { workflows: data } = await fetchWorkflows(workspaceId, {
                status: "active",
                triggerEntityType: entityType,
            });
            setWorkflows(data);
        } catch (error) {
            console.error("Failed to load workflows:", error);
            toast.error("Failed to load workflows");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnroll = async () => {
        if (!selectedWorkflowId) return;

        setIsEnrolling(true);
        try {
            await enrollInWorkflow(workspaceId, selectedWorkflowId, {
                entityType,
                entityId,
            });
            toast.success(`${entityName} enrolled in workflow!`);
            onClose();
        } catch (error: any) {
            console.error("Failed to enroll:", error);
            toast.error(error.response?.data?.error || "Failed to enroll in workflow");
        } finally {
            setIsEnrolling(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-card border border-border shadow-xl transition-all">
                                {/* Header */}
                                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <BoltIcon className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <Dialog.Title className="text-lg font-semibold text-foreground">
                                                Add to Workflow
                                            </Dialog.Title>
                                            <p className="text-xs text-muted-foreground">
                                                Enroll {entityName} in a workflow
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-1.5 rounded-md hover:bg-muted transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5 text-muted-foreground" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {isLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                        </div>
                                    ) : workflows.length === 0 ? (
                                        <div className="text-center py-8">
                                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                                                <BoltIcon className="w-6 h-6 text-muted-foreground" />
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                No active workflows for {entityType}s.
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Create a workflow first, then activate it.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <p className="text-sm text-muted-foreground mb-3">
                                                Select a workflow to enroll this {entityType}:
                                            </p>
                                            {workflows.map((workflow) => (
                                                <button
                                                    key={workflow._id}
                                                    onClick={() => setSelectedWorkflowId(workflow._id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                                                        selectedWorkflowId === workflow._id
                                                            ? "border-primary bg-primary/5"
                                                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0",
                                                            selectedWorkflowId === workflow._id
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted"
                                                        )}
                                                    >
                                                        {selectedWorkflowId === workflow._id ? (
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        ) : (
                                                            <PlayIcon className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">
                                                            {workflow.name}
                                                        </p>
                                                        {workflow.description && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {workflow.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {workflow.steps.length} steps
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {workflows.length > 0 && (
                                    <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
                                        <button
                                            onClick={onClose}
                                            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleEnroll}
                                            disabled={!selectedWorkflowId || isEnrolling}
                                            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                                        >
                                            {isEnrolling ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    Enrolling...
                                                </span>
                                            ) : (
                                                "Enroll in Workflow"
                                            )}
                                        </button>
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
