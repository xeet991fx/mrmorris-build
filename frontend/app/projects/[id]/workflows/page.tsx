"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    PlusIcon,
    BoltIcon,
    PlayIcon,
    PauseIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    QuestionMarkCircleIcon,
    DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { Workflow, WorkflowStatus, STATUS_COLORS } from "@/lib/workflow/types";
import { instantiateTemplate, WorkflowTemplate } from "@/lib/workflow/templates";
import { cn } from "@/lib/utils";
import TemplateSelector from "@/components/workflows/TemplateSelector";
import { TemplateGallery } from "@/components/shared/TemplateGallery";
import { AutomationSuggestionsCard } from "@/components/workflows/AutomationSuggestionsCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Status badge component
function StatusBadge({ status }: { status: WorkflowStatus }) {
    const colors: Record<WorkflowStatus, string> = {
        draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
        active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        paused: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };

    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium capitalize", colors[status])}>
            {status}
        </span>
    );
}

// Workflow card component
function WorkflowCard({
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
    const actionCount = workflow.steps.filter((s) => s.type === "action").length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-card border border-border rounded-xl p-5 hover:border-[#9ACD32]/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={onEdit}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                        <BoltIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {workflow.name}
                        </h3>
                        <p className="text-xs text-muted-foreground capitalize">
                            {workflow.triggerEntityType}-based workflow
                        </p>
                    </div>
                </div>
                <StatusBadge status={workflow.status} />
            </div>

            {/* Description */}
            {workflow.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {workflow.description}
                </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{workflow.steps.length}</span>
                    <span>steps</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{workflow.stats.totalEnrolled}</span>
                    <span>enrolled</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{workflow.stats.currentlyActive}</span>
                    <span>active</span>
                </div>
            </div>

            {/* Trigger info */}
            {triggerStep && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5 mb-4">
                    <span className="text-violet-500">⚡</span>
                    <span>Triggers when: {triggerStep.config.triggerType?.replace(/_/g, " ")}</span>
                </div>
            )}

            {/* Actions */}
            <div
                className="flex items-center gap-2 pt-3 border-t border-border"
                onClick={(e) => e.stopPropagation()}
            >
                {workflow.status === "active" ? (
                    <button
                        onClick={onPause}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                    >
                        <PauseIcon className="w-4 h-4" />
                        Pause
                    </button>
                ) : workflow.status === "draft" || workflow.status === "paused" ? (
                    <button
                        onClick={onActivate}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                    >
                        <PlayIcon className="w-4 h-4" />
                        Activate
                    </button>
                ) : null}
                <button
                    onClick={onClone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="Clone workflow"
                >
                    <DocumentDuplicateIcon className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-auto"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </motion.div>
    );
}

// Empty state
function EmptyState({ onCreateNew }: { onCreateNew: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mb-6">
                <BoltIcon className="w-10 h-10 text-violet-500" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No workflows yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
                Create automated workflows to nurture leads, follow up on deals, and save time on repetitive
                tasks.
            </p>
            <button
                onClick={onCreateNew}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all"
            >
                <PlusIcon className="w-5 h-5" />
                Create Your First Workflow
            </button>
        </div>
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
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

    useEffect(() => {
        if (workspaceId) {
            fetchWorkflows(workspaceId);
        }
    }, [workspaceId, fetchWorkflows]);

    const handleCreateNew = () => {
        setShowTemplateSelector(true);
    };

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

    // Filter workflows
    const filteredWorkflows = workflows.filter((w) => {
        const matchesSearch =
            searchQuery === "" ||
            w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            w.description?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || w.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-card/95">
            {/* Template Selector Modal */}
            <TemplateSelector
                isOpen={showTemplateSelector}
                onClose={() => setShowTemplateSelector(false)}
                onSelectTemplate={handleSelectTemplate}
                onCreateBlank={handleCreateBlank}
            />

            {/* Header */}
            <div className="h-12 px-6 border-b border-border flex items-center justify-between sticky top-0 z-10">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3"
                >
                    <h1 className="text-lg font-semibold text-foreground">Workflows</h1>
                    <p className="text-xs text-muted-foreground">
                        Automate your sales process
                    </p>
                </motion.div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/projects/${workspaceId}/workflows/guide`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-all"
                    >
                        <QuestionMarkCircleIcon className="w-5 h-5" />
                        Help & Guide
                    </button>
                    <button
                        onClick={handleCreateNew}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9ACD32] text-background font-medium hover:bg-[#8AB82E] transition-all disabled:opacity-50"
                    >
                        {isCreating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-5 h-5" />
                                New Workflow
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search workflows..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                        />
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <FunnelIcon className="w-4 h-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | "all")}
                            className="px-3 py-2 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#9ACD32] focus:border-[#9ACD32] transition-all"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* AI Automation Suggestions */}
            <div className="max-w-7xl mx-auto px-6 mb-6">
                <AutomationSuggestionsCard workspaceId={workspaceId} />
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-56 rounded-xl bg-card border border-border animate-pulse"
                            />
                        ))}
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    workflows.length === 0 ? (
                        <TemplateGallery
                            title="Start Automating"
                            description="Choose a template to get started quickly or build from scratch."
                            onCreateBlank={handleCreateBlank}
                            onSelect={(id) => {
                                // Find template and instantiate
                                // In a real app we'd have a look up
                                const template = [
                                    { id: "nurture", title: "Nurture Sequence", description: "Send a series of emails to warm up leads.", icon: "🌱", tags: ["Popular"] },
                                    { id: "onboarding", title: "Onboarding Flow", description: "Welcome new users and guide them to activation.", icon: "👋" },
                                    { id: "reengagement", title: "Re-engagement", description: "Win back inactive users with special offers.", icon: "🎣" }
                                ].find(t => t.id === id);

                                if (template) {
                                    // Mock template instantiation for now as we don't have the full template list imported here yet
                                    // In real impl, we'd import { WORKFLOW_TEMPLATES }
                                    handleCreateBlank();
                                }
                            }}
                            templates={[
                                { id: "nurture", title: "Nurture Sequence", description: "Send a series of emails to warm up leads.", icon: "🌱", tags: ["Popular"] },
                                { id: "onboarding", title: "Onboarding Flow", description: "Welcome new users and guide them to activation.", icon: "👋" },
                                { id: "reengagement", title: "Re-engagement", description: "Win back inactive users with special offers.", icon: "🎣" }
                            ]}
                        />
                    ) : (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">No workflows match your search.</p>
                        </div>
                    )
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredWorkflows.map((workflow) => (
                            <WorkflowCard
                                key={workflow._id}
                                workflow={workflow}
                                onEdit={() => handleEdit(workflow._id)}
                                onActivate={() => handleActivate(workflow._id)}
                                onPause={() => handlePause(workflow._id)}
                                onClone={() => handleClone(workflow._id)}
                                onDelete={() => openDeleteConfirm(workflow._id)}
                            />
                        ))}
                    </div>
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
        </div>
    );
}
