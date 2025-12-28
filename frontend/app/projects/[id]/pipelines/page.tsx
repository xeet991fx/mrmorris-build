"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faColumns, faTableCells, faPlus, faGear } from "@fortawesome/free-solid-svg-icons";
import toast from "react-hot-toast";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import PipelineKanbanView from "@/components/pipelines/PipelineKanbanView";
import PipelineTableView from "@/components/pipelines/PipelineTableView";
import AddOpportunityModal from "@/components/pipelines/AddOpportunityModal";
import EditOpportunityModal from "@/components/pipelines/EditOpportunityModal";
import ManagePipelinesModal from "@/components/pipelines/ManagePipelinesModal";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";

export default function PipelinesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  // Get workspace name for context
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

  // Debug modal state
  useEffect(() => {
    console.log("isManagePipelinesModalOpen state changed:", isManagePipelinesModalOpen);
  }, [isManagePipelinesModalOpen]);

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
      // TODO: Implement delete from store
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
      <div className="min-h-screen bg-card/95 px-8 pt-14 pb-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading pipelines...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render empty state content
  const renderEmptyState = () => (
    <div className="min-h-screen bg-card/95 px-8 pt-14 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1 font-heading">Pipelines</h1>
        <p className="text-sm text-muted-foreground">
          Manage your sales opportunities through customizable pipelines
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center justify-center min-h-[400px]"
      >
        <div className="text-center max-w-md">
          <FontAwesomeIcon icon={faTableCells} className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2 font-heading">No pipelines yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Create your first pipeline to start managing opportunities
          </p>
          <button
            onClick={() => {
              console.log("Create Pipeline button clicked");
              setIsManagePipelinesModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white rounded-lg font-medium transition-colors"
          >
            <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
            Create Pipeline
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <>
      {/* Show empty state if no pipelines */}
      {!isLoading && pipelines.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="min-h-screen bg-card/95 px-8 pt-14 pb-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h1 className="text-2xl font-bold text-foreground mb-1 font-heading">Pipelines</h1>
            <p className="text-sm text-muted-foreground">
              Manage your sales opportunities through customizable pipelines
            </p>
          </motion.div>

          {/* Pipeline Selector & Actions Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex items-center justify-between gap-4"
          >
            {/* Pipeline Selector & View Toggle */}
            <div className="flex items-center gap-3">
              {/* Pipeline Dropdown */}
              <select
                value={currentPipeline?._id || ""}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className="px-4 py-2 bg-card border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {pipelines.map((pipeline) => (
                  <option key={pipeline._id} value={pipeline._id}>
                    {pipeline.name} {pipeline.isDefault && "(Default)"}
                  </option>
                ))}
              </select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "kanban"
                    ? "bg-white dark:bg-neutral-800 text-black dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FontAwesomeIcon icon={faTableCells} className="w-4 h-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === "table"
                    ? "bg-white dark:bg-neutral-800 text-black dark:text-white"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <FontAwesomeIcon icon={faColumns} className="w-4 h-4" />
                  Table
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsManagePipelinesModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border hover:bg-muted text-foreground rounded-lg text-sm font-medium transition-colors"
              >
                <FontAwesomeIcon icon={faGear} className="w-4 h-4" />
                Manage Pipelines
              </button>
              <button
                onClick={() => handleAddOpportunity()}
                disabled={!currentPipeline}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <FontAwesomeIcon icon={faPlus} className="w-5 h-5" />
                Add Opportunity
              </button>
            </div>
          </motion.div>

          {/* View Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {viewMode === "kanban" ? (
              // Kanban View
              <PipelineKanbanView
                onEditOpportunity={handleEditOpportunity}
                onDeleteOpportunity={handleDeleteOpportunity}
                onAddOpportunity={handleAddOpportunity}
              />
            ) : (
              // Table View
              <PipelineTableView
                onEditOpportunity={handleEditOpportunity}
                onDeleteOpportunity={handleDeleteOpportunity}
              />
            )}
          </motion.div>
        </div>
      )}

      {/* Modals - Always rendered */}
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

      {console.log("Rendering ManagePipelinesModal with isOpen:", isManagePipelinesModalOpen)}
      <ManagePipelinesModal
        isOpen={isManagePipelinesModalOpen}
        onClose={() => {
          console.log("Modal onClose called");
          setIsManagePipelinesModalOpen(false);
        }}
        workspaceId={workspaceId}
      />
    </>
  );
}
