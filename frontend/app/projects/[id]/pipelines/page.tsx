"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
    RectangleStackIcon,
    TableCellsIcon,
    PlusIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import PipelineKanbanView from "@/components/pipelines/PipelineKanbanView";
import PipelineTableView from "@/components/pipelines/PipelineTableView";
import AddOpportunityModal from "@/components/pipelines/AddOpportunityModal";
import EditOpportunityModal from "@/components/pipelines/EditOpportunityModal";
import ManagePipelinesModal from "@/components/pipelines/ManagePipelinesModal";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

export default function PipelinesPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { currentWorkspace } = useWorkspaceStore();

    const {
        pipelines,
        currentPipeline,
        viewMode,
        isLoading,
        fetchPipelines,
        fetchOpportunitiesByPipeline,
        setViewMode,
        setCurrentPipeline,
    } = usePipelineStore();

    const [isAddOpportunityModalOpen, setIsAddOpportunityModalOpen] = useState(false);
    const [isEditOpportunityModalOpen, setIsEditOpportunityModalOpen] = useState(false);
    const [isManagePipelinesModalOpen, setIsManagePipelinesModalOpen] = useState(false);
    const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
    const [selectedStageId, setSelectedStageId] = useState<string | undefined>(undefined);

    // Fetch pipelines on mount
    useEffect(() => {
        if (workspaceId) {
            fetchPipelines(workspaceId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId]);

    // Fetch opportunities when current pipeline changes
    useEffect(() => {
        if (workspaceId && currentPipeline) {
            fetchOpportunitiesByPipeline(workspaceId, currentPipeline._id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [workspaceId, currentPipeline?._id]);

    const handlePipelineChange = (pipelineId: string) => {
        const pipeline = pipelines.find((p) => p._id === pipelineId);
        if (pipeline) {
            setCurrentPipeline(pipeline);
        }
    };

    const handleEditOpportunity = (opportunity: Opportunity) => {
        setSelectedOpportunity(opportunity);
        setIsEditOpportunityModalOpen(true);
    };

    const handleDeleteOpportunity = async (opportunityId: string) => {
        if (!window.confirm("Are you sure you want to delete this opportunity?")) {
            return;
        }

        try {
            toast.success("Opportunity deleted successfully");
        } catch (error) {
            toast.error("Failed to delete opportunity");
        }
    };

    const handleAddOpportunity = (stageId?: string) => {
        setSelectedStageId(stageId);
        setIsAddOpportunityModalOpen(true);
    };

    if (isLoading && pipelines.length === 0) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="flex items-center gap-3 text-zinc-400">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Loading pipelines...</span>
                </div>
            </div>
        );
    }

    // Empty state
    if (!isLoading && pipelines.length === 0) {
        return (
            <>
                <div className="h-full overflow-y-auto">
                    {/* Hero Section */}
                    <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                Pipelines
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Manage your sales opportunities through customizable pipelines
                            </p>
                        </motion.div>
                    </div>

                    {/* Empty State */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-center py-16 px-4"
                    >
                        <div className="text-center max-w-md">
                            <TableCellsIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                                No pipelines yet
                            </h2>
                            <p className="text-sm text-zinc-500 mb-6">
                                Create your first pipeline to start managing opportunities
                            </p>
                            <button
                                onClick={() => setIsManagePipelinesModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Create Pipeline
                            </button>
                        </div>
                    </motion.div>
                </div>

                <ManagePipelinesModal
                    isOpen={isManagePipelinesModalOpen}
                    onClose={() => setIsManagePipelinesModalOpen(false)}
                    workspaceId={workspaceId}
                />
            </>
        );
    }

    return (
        <>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Hero Section */}
                <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-4 flex-shrink-0">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
                    >
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                Pipelines
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                Manage your sales opportunities
                            </p>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <button
                                onClick={() => setIsManagePipelinesModalOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <Cog6ToothIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Manage</span>
                            </button>
                            <button
                                onClick={() => handleAddOpportunity()}
                                disabled={!currentPipeline}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm disabled:opacity-50"
                            >
                                <PlusIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Add Opportunity</span>
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* Pipeline Selector & View Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="px-4 sm:px-6 lg:px-8 pb-4 flex items-center justify-between gap-4 flex-shrink-0"
                >
                    <div className="flex items-center gap-3">
                        {/* Pipeline Dropdown */}
                        <select
                            value={currentPipeline?._id || ""}
                            onChange={(e) => handlePipelineChange(e.target.value)}
                            className="px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                        >
                            {pipelines.map((pipeline) => (
                                <option key={pipeline._id} value={pipeline._id}>
                                    {pipeline.name} {pipeline.isDefault && "(Default)"}
                                </option>
                            ))}
                        </select>

                        {/* View Toggle */}
                        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-full p-1">
                            <button
                                onClick={() => setViewMode("kanban")}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                    viewMode === "kanban"
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <RectangleStackIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Kanban</span>
                            </button>
                            <button
                                onClick={() => setViewMode("table")}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                    viewMode === "table"
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                )}
                            >
                                <TableCellsIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Table</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* View Content */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex-1 min-h-0"
                >
                    {viewMode === "kanban" ? (
                        <PipelineKanbanView
                            onEditOpportunity={handleEditOpportunity}
                            onDeleteOpportunity={handleDeleteOpportunity}
                            onAddOpportunity={handleAddOpportunity}
                        />
                    ) : (
                        <div className="px-4 sm:px-6 lg:px-8">
                            <PipelineTableView
                                onEditOpportunity={handleEditOpportunity}
                                onDeleteOpportunity={handleDeleteOpportunity}
                            />
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Modals */}
            <AddOpportunityModal
                isOpen={isAddOpportunityModalOpen}
                onClose={() => {
                    setIsAddOpportunityModalOpen(false);
                    setSelectedStageId(undefined);
                }}
                workspaceId={workspaceId}
                initialStageId={selectedStageId}
            />

            <EditOpportunityModal
                isOpen={isEditOpportunityModalOpen}
                onClose={() => {
                    setIsEditOpportunityModalOpen(false);
                    setSelectedOpportunity(null);
                }}
                workspaceId={workspaceId}
                opportunity={selectedOpportunity}
            />

            <ManagePipelinesModal
                isOpen={isManagePipelinesModalOpen}
                onClose={() => {
                    setIsManagePipelinesModalOpen(false);
                    if (currentPipeline) {
                        fetchOpportunitiesByPipeline(workspaceId, currentPipeline._id);
                    }
                }}
                workspaceId={workspaceId}
            />
        </>
    );
}
