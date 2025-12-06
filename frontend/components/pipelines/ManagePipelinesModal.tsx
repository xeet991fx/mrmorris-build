// @ts-nocheck
import React, { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  createPipelineSchema,
  updatePipelineSchema,
  CreatePipelineInput,
  UpdatePipelineInput,
} from "@/lib/validations/pipeline";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Pipeline } from "@/lib/api/pipeline";
import PipelineForm from "./PipelineForm";
import StageManager from "./StageManager";

interface ManagePipelinesModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

type View = "list" | "create" | "edit" | "manageStages";

export default function ManagePipelinesModal({
  isOpen,
  onClose,
  workspaceId,
}: ManagePipelinesModalProps) {
  const {
    pipelines,
    createPipeline,
    updatePipeline,
    deletePipeline,
    addStage,
    updateStage,
    deleteStage,
    reorderStages,
    isLoading,
  } = usePipelineStore();

  const [currentView, setCurrentView] = useState<View>("list");
  const [selectedPipeline, setSelectedPipeline] = useState<Pipeline | null>(null);

  // Auto-switch to create view when opening with no pipelines
  useEffect(() => {
    if (isOpen && pipelines.length === 0 && currentView === "list") {
      console.log("No pipelines, switching to create view");
      setCurrentView("create");
    }
  }, [isOpen, pipelines.length, currentView]);

  // Log when modal opens/closes
  useEffect(() => {
    console.log("ManagePipelinesModal isOpen:", isOpen, "currentView:", currentView, "pipelines:", pipelines.length);
  }, [isOpen, currentView, pipelines.length]);

  // Create form
  const createForm = useForm<CreatePipelineInput>({
    resolver: zodResolver(createPipelineSchema),
    defaultValues: {
      name: "",
      description: "",
      stages: [
        { name: "New", color: "#3B82F6", order: 0 },
        { name: "Qualified", color: "#8B5CF6", order: 1 },
        { name: "Proposal", color: "#F59E0B", order: 2 },
        { name: "Closed", color: "#10B981", order: 3 },
      ],
      isDefault: false,
    },
  });

  // Edit form
  const editForm = useForm<UpdatePipelineInput>({
    resolver: zodResolver(updatePipelineSchema),
  });

  const handleCreatePipeline = async (data: CreatePipelineInput) => {
    try {
      console.log("Creating pipeline with data:", data);
      await createPipeline(workspaceId, data);
      toast.success("Pipeline created successfully!");
      createForm.reset();
      setCurrentView("list");
    } catch (error: any) {
      console.error("Create pipeline error:", error);
      toast.error(error.response?.data?.error || "Failed to create pipeline");
    }
  };

  const handleEditPipeline = async (data: UpdatePipelineInput) => {
    if (!selectedPipeline) return;

    try {
      await updatePipeline(workspaceId, selectedPipeline._id, data);
      toast.success("Pipeline updated successfully!");
      setCurrentView("list");
      setSelectedPipeline(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update pipeline");
    }
  };

  const handleDeletePipeline = async (pipelineId: string) => {
    if (!confirm("Are you sure you want to delete this pipeline?")) return;

    try {
      await deletePipeline(workspaceId, pipelineId);
      toast.success("Pipeline deleted successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete pipeline");
    }
  };

  const handleSetDefault = async (pipeline: Pipeline) => {
    try {
      await updatePipeline(workspaceId, pipeline._id, { isDefault: true });
      toast.success("Default pipeline updated!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update default pipeline");
    }
  };

  const openEdit = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    editForm.reset({
      name: pipeline.name,
      description: pipeline.description || "",
      isDefault: pipeline.isDefault,
    });
    setCurrentView("edit");
  };

  const openManageStages = (pipeline: Pipeline) => {
    setSelectedPipeline(pipeline);
    setCurrentView("manageStages");
  };

  const handleStagesUpdate = async (updatedStages: any[]) => {
    if (!selectedPipeline) return;

    try {
      // Extract stage IDs in new order
      const stageOrder = updatedStages
        .filter((s) => s._id) // Only existing stages
        .map((s) => s._id);

      await reorderStages(workspaceId, selectedPipeline._id, stageOrder);
      toast.success("Stages reordered successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reorder stages");
    }
  };

  const handleClose = () => {
    console.log("Closing modal, resetting to list view");
    setCurrentView("list");
    setSelectedPipeline(null);
    createForm.reset();
    editForm.reset();
    onClose();
  };

  console.log("ManagePipelinesModal render - isOpen:", isOpen, "pipelines.length:", pipelines.length);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-lg bg-card border border-border text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      {currentView === "list" && "Manage Pipelines"}
                      {currentView === "create" && "Create Pipeline"}
                      {currentView === "edit" && "Edit Pipeline"}
                      {currentView === "manageStages" && "Manage Stages"}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    <AnimatePresence mode="wait">
                      {/* List View */}
                      {currentView === "list" && (
                        <motion.div
                          key="list"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="space-y-3"
                        >
                          {pipelines.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-sm text-neutral-400 mb-4">
                                No pipelines yet
                              </p>
                              <button
                                onClick={() => setCurrentView("create")}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] hover:bg-[#8BC225] text-neutral-900 rounded-lg text-sm font-medium transition-colors"
                              >
                                <PlusIcon className="w-4 h-4" />
                                Create Your First Pipeline
                              </button>
                            </div>
                          ) : (
                            pipelines.map((pipeline) => (
                              <div
                                key={pipeline._id}
                                className="flex items-start justify-between gap-4 p-4 bg-neutral-800 border border-neutral-700 rounded-lg"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-sm font-semibold text-white">
                                      {pipeline.name}
                                    </h3>
                                    {pipeline.isDefault && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#9ACD32]/20 text-[#9ACD32] text-xs rounded-full">
                                        <CheckCircleIcon className="w-3 h-3" />
                                        Default
                                      </span>
                                    )}
                                  </div>
                                  {pipeline.description && (
                                    <p className="text-xs text-neutral-400 mb-2">
                                      {pipeline.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-2">
                                    {pipeline.stages.map((stage) => (
                                      <div
                                        key={stage._id}
                                        className="flex items-center gap-1 text-xs text-neutral-400"
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: stage.color }}
                                        />
                                        {stage.name}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {!pipeline.isDefault && (
                                    <button
                                      onClick={() => handleSetDefault(pipeline)}
                                      className="p-2 text-neutral-400 hover:text-[#9ACD32] transition-colors"
                                      title="Set as default"
                                    >
                                      <CheckCircleIcon className="w-4 h-4" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => openManageStages(pipeline)}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                    title="Manage stages"
                                  >
                                    <Cog6ToothIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => openEdit(pipeline)}
                                    className="p-2 text-neutral-400 hover:text-white transition-colors"
                                    title="Edit pipeline"
                                  >
                                    <PencilIcon className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePipeline(pipeline._id)}
                                    className="p-2 text-neutral-400 hover:text-red-400 transition-colors"
                                    title="Delete pipeline"
                                  >
                                    <TrashIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </motion.div>
                      )}

                      {/* Create View */}
                      {currentView === "create" && (
                        <motion.div
                          key="create"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <PipelineForm form={createForm as any} />
                        </motion.div>
                      )}

                      {/* Edit View */}
                      {currentView === "edit" && (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <PipelineForm form={editForm as any} isEdit />
                        </motion.div>
                      )}

                      {/* Manage Stages View */}
                      {currentView === "manageStages" && selectedPipeline && (
                        <motion.div
                          key="manageStages"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                        >
                          <p className="text-sm text-neutral-400 mb-4">
                            Managing stages for <strong>{selectedPipeline.name}</strong>
                          </p>
                          <StageManager
                            stages={selectedPipeline.stages}
                            onChange={handleStagesUpdate}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
                    <div>
                      {currentView !== "list" && (
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentView("list");
                            setSelectedPipeline(null);
                          }}
                          className="text-sm text-neutral-400 hover:text-white transition-colors"
                        >
                          ← Back to list
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {currentView === "list" && (
                        <button
                          type="button"
                          onClick={() => setCurrentView("create")}
                          className="px-4 py-2 text-sm font-medium bg-[#9ACD32] hover:bg-[#8BC225] text-neutral-900 rounded-md transition-colors"
                        >
                          <PlusIcon className="w-4 h-4 inline mr-2" />
                          Create Pipeline
                        </button>
                      )}

                      {currentView === "create" && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={createForm.handleSubmit(handleCreatePipeline)}
                          className="px-4 py-2 text-sm font-medium bg-[#9ACD32] hover:bg-[#8BC225] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 rounded-md transition-colors"
                        >
                          {isLoading ? "Creating..." : "Create Pipeline"}
                        </button>
                      )}

                      {currentView === "edit" && (
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={editForm.handleSubmit(handleEditPipeline)}
                          className="px-4 py-2 text-sm font-medium bg-[#9ACD32] hover:bg-[#8BC225] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 rounded-md transition-colors"
                        >
                          {isLoading ? "Saving..." : "Save Changes"}
                        </button>
                      )}

                      {currentView === "manageStages" && (
                        <button
                          type="button"
                          onClick={() => setCurrentView("list")}
                          className="px-4 py-2 text-sm font-medium bg-[#9ACD32] hover:bg-[#8BC225] text-neutral-900 rounded-md transition-colors"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
