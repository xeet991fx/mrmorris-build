"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    PlusIcon,
    BoltIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    QuestionMarkCircleIcon,
    DocumentDuplicateIcon,
    SparklesIcon,
    XMarkIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { Workflow, WorkflowStatus } from "@/lib/workflow/types";
import { instantiateTemplate, WorkflowTemplate } from "@/lib/workflow/templates";
import { cn } from "@/lib/utils";
import TemplateSelector from "@/components/workflows/TemplateSelector";
import { TemplateGallery } from "@/components/shared/TemplateGallery";
import { AutomationSuggestionsCard } from "@/components/workflows/AutomationSuggestionsCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useInsightTracking } from "@/hooks/useInsightTracking";

// Status indicator colors
const STATUS_COLORS: Record<WorkflowStatus, string> = {
    draft: "bg-zinc-400",
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    archived: "bg-zinc-300",
};

// Workflow row component
function WorkflowRow({
    workflow,
    onEdit,
    onActivate,
    onPause,
    onClone,
    onDelete,
}: {
    workflow: Workflow;
    onEdit: () => void;
    onActivate: () => void;
    onPause: () => void;
    onClone: () => void;
    onDelete: () => void;
}) {
    const triggerStep = workflow.steps.find((s) => s.type === "trigger");

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
            onClick={onEdit}
        >
            {/* Status indicator */}
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[workflow.status])} />

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {workflow.name}
                    </p>
                    <span className="text-xs text-zinc-400 capitalize">{workflow.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                    {triggerStep && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Triggers on: {triggerStep.config.triggerType?.replace(/_/g, " ")}
                        </p>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-xs text-zinc-500">
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{workflow.steps.length}</p>
                    <p>steps</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">{workflow.stats.totalEnrolled}</p>
                    <p>enrolled</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold text-emerald-500">{workflow.stats.currentlyActive}</p>
                    <p>active</p>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                {workflow.status === "active" ? (
                    <button
                        onClick={onPause}
                        className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                        title="Pause"
                    >
                        <PauseIcon className="w-4 h-4" />
                    </button>
                ) : workflow.status === "draft" || workflow.status === "paused" ? (
                    <button
                        onClick={onActivate}
                        className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        title="Activate"
                    >
                        <PlayIcon className="w-4 h-4" />
                    </button>
                ) : null}
                <button
                    onClick={onClone}
                    className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title="Clone"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>

            <ChevronRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </motion.div>
    );
}

// Main page component
export default function WorkflowsPage() {
    const params = useParams();
    const router = useRouter();
    const workspaceId = params.id as string;

    const {
        workflows,
        isLoading,
        fetchWorkflows,
        createWorkflow,
        activateWorkflow,
        pauseWorkflow,
        cloneWorkflow,
        deleteWorkflow,
    } = useWorkflowStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<WorkflowStatus | "all">("all");
    const [isCreating, setIsCreating] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [showAISidebar, setShowAISidebar] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

    const { track } = useInsightTracking({
        workspaceId,
        page: 'workflows',
        enabled: !!workspaceId,
    });

    useEffect(() => {
        if (workspaceId) {
            fetchWorkflows(workspaceId);
        }
    }, [workspaceId, fetchWorkflows]);

    const handleCreateNew = () => setShowTemplateSelector(true);

    const handleCreateBlank = async () => {
        setIsCreating(true);
        const workflow = await createWorkflow(workspaceId, {
            name: "New Workflow",
            description: "",
            triggerEntityType: "contact",
            steps: [],
        });
        setIsCreating(false);
        if (workflow) {
            router.push(`/projects/${workspaceId}/workflows/${workflow._id}`);
        }
    };

    const handleSelectTemplate = async (template: WorkflowTemplate) => {
        setIsCreating(true);
        const instantiated = instantiateTemplate(template);
        const workflow = await createWorkflow(workspaceId, {
            name: instantiated.name,
            description: instantiated.description,
            triggerEntityType: instantiated.triggerEntityType,
            steps: instantiated.steps,
        });
        setIsCreating(false);
        if (workflow) {
            router.push(`/projects/${workspaceId}/workflows/${workflow._id}`);
        }
    };

    const handleEdit = (workflowId: string) => {
        router.push(`/projects/${workspaceId}/workflows/${workflowId}`);
    };

    const handleActivate = async (workflowId: string) => {
        await activateWorkflow(workspaceId, workflowId);
    };

    const handlePause = async (workflowId: string) => {
        await pauseWorkflow(workspaceId, workflowId);
    };

    const handleDelete = async () => {
        if (!workflowToDelete) return;
        await deleteWorkflow(workspaceId, workflowToDelete);
        setWorkflowToDelete(null);
    };

    const openDeleteConfirm = (workflowId: string) => {
        setWorkflowToDelete(workflowId);
        setDeleteConfirmOpen(true);
    };

    const handleClone = async (workflowId: string) => {
        await cloneWorkflow(workspaceId, workflowId);
    };

    const filteredWorkflows = workflows.filter((w) => {
        const matchesSearch =
            searchQuery === "" ||
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || w.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Stats
    const activeCount = workflows.filter(w => w.status === "active").length;
    const draftCount = workflows.filter(w => w.status === "draft").length;
    const pausedCount = workflows.filter(w => w.status === "paused").length;

    return (
        <div className="h-full overflow-y-auto">
            {/* Template Selector Modal */}
            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleSelectTemplate}
                onCreateBlank={handleCreateBlank}
            />

            {/* Hero Section */}
            <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                >
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                            Workflows
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Automate your sales and marketing processes
                        </p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => router.push(`/projects/${workspaceId}/workflows/guide`)}
                            className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            <QuestionMarkCircleIcon className="w-4 h-4" />
                            Guide
                        </button>
                        <button
                            onClick={() => setShowAISidebar(true)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-full transition-colors"
                        >
                            <SparklesIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">AI Suggestions</span>
                        </button>
                        <button
                            onClick={handleCreateNew}
                            disabled={isCreating}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                        >
                            {isCreating ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span className="hidden sm:inline">Creating...</span>
                                </>
                            ) : (
                                <>
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Workflow</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mt-6 sm:mt-8 grid grid-cols-2 sm:flex sm:items-center gap-4 sm:gap-8"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{workflows.length}</span>
                        <span className="text-sm text-zinc-500">total</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-2xl font-bold text-emerald-500">{activeCount}</span>
                        <span className="text-sm text-zinc-500">active</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-zinc-400" />
                        <span className="text-2xl font-bold text-zinc-500">{draftCount}</span>
                        <span className="text-sm text-zinc-500">draft</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                        <span className="text-2xl font-bold text-amber-500">{pausedCount}</span>
                        <span className="text-sm text-zinc-500">paused</span>
                    </div>
                </motion.div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

            {/* Search & Filter */}
            <div className="px-4 sm:px-6 lg:px-8 py-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
                >
                    {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                        />
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center gap-2">
                        {(["all", "active", "draft", "paused", "archived"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                                    statusFilter === status
                                        ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                                )}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* Workflow List */}
            <div className="px-8 pb-8">
                {isLoading ? (
                    <div className="space-y-4 py-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    workflows.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-16"
                        >
                            <BoltIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No workflows yet</h3>
                            <p className="text-sm text-zinc-500 mb-6">Create your first workflow to automate your processes</p>
                            <button
                                onClick={handleCreateNew}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Workflow
                            </button>
                        </motion.div>
                    ) : (
                        <div className="text-center py-12 text-zinc-500">
                            No workflows match your search.
                        </div>
                    )
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredWorkflows.map((workflow) => (
                            <WorkflowRow
                                key={workflow._id}
                                workflow={workflow}
                                onEdit={() => handleEdit(workflow._id)}
                                onActivate={() => handleActivate(workflow._id)}
                                onPause={() => handlePause(workflow._id)}
                                onClone={() => handleClone(workflow._id)}
                                onDelete={() => openDeleteConfirm(workflow._id)}
                            />
                        ))}
                    </motion.div>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setWorkflowToDelete(null);
                }}
                onConfirm={handleDelete}
                title="Delete Workflow"
                message="Are you sure you want to delete this workflow? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />

            {/* AI Suggestions Sidebar */}
            <AnimatePresence>
                {showAISidebar && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/30 z-40"
                            onClick={() => setShowAISidebar(false)}
                        />
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-50 overflow-y-auto"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-violet-500" />
                                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">AI Suggestions</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowAISidebar(false)}
                                        className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                                <AutomationSuggestionsCard workspaceId={workspaceId} />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
