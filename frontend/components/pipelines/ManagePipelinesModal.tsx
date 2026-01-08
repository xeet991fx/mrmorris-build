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
  ArrowLeftIcon,
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
import StageEditor from "./StageEditor";
import { cn } from "@/lib/utils";

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
      setCurrentView("create");
    }
  }, [isOpen, pipelines.length, currentView]);

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
      await createPipeline(workspaceId, data);
      toast.success("Pipeline created successfully!");
      createForm.reset();
      setCurrentView("list");
    } catch (error: any) {
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
      const stageOrder = updatedStages
        .filter((s) => s._id)
        .map((s) => s._id);

      await reorderStages(workspaceId, selectedPipeline._id, stageOrder);
      toast.success("Stages reordered successfully!");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to reorder stages");
    }
  };

  const handleClose = () => {
    setCurrentView("list");
    setSelectedPipeline(null);
    createForm.reset();
    editForm.reset();
    onClose();
  };

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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <Dialog.Title className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {currentView === "list" && "Manage Pipelines"}
                    {currentView === "create" && "Create Pipeline"}
                    {currentView === "edit" && "Edit Pipeline"}
                    {currentView === "manageStages" && `Manage Stages — ${selectedPipeline?.name}`}
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {/* List View */}
                    {currentView === "list" && (
                      <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                      >
                        {pipelines.length === 0 ? (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                              <Cog6ToothIcon className="w-8 h-8 text-zinc-400" />
                            </div>
                            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                              No pipelines yet
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                              Create your first pipeline to start tracking deals
                            </p>
                            <button
                              onClick={() => setCurrentView("create")}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Create Pipeline
                            </button>
                          </div>
                        ) : (
                          pipelines.map((pipeline) => (
                            <div
                              key={pipeline._id}
                              className={cn(
                                "flex items-start justify-between gap-4 p-4 rounded-xl border transition-colors",
                                "bg-zinc-50 dark:bg-zinc-800/50",
                                "border-zinc-200 dark:border-zinc-700",
                                "hover:border-zinc-300 dark:hover:border-zinc-600"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {pipeline.name}
                                  </h3>
                                  {pipeline.isDefault && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                                      <CheckCircleIcon className="w-3 h-3" />
                                      Default
                                    </span>
                                  )}
                                </div>
                                {pipeline.description && (
                                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2.5 line-clamp-1">
                                    {pipeline.description}
                                  </p>
                                )}
                                {/* Stages Flow */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {pipeline.stages.map((stage, index) => (
                                    <div key={stage._id} className="flex items-center">
                                      <div
                                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
                                        style={{
                                          backgroundColor: `${stage.color}15`,
                                          color: stage.color,
                                        }}
                                      >
                                        <div
                                          className="w-2 h-2 rounded-full"
                                          style={{ backgroundColor: stage.color }}
                                        />
                                        {stage.name}
                                      </div>
                                      {index < pipeline.stages.length - 1 && (
                                        <span className="mx-1 text-zinc-300 dark:text-zinc-600">→</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1">
                                {!pipeline.isDefault && (
                                  <button
                                    onClick={() => handleSetDefault(pipeline)}
                                    className="p-2 rounded-lg text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                    title="Set as default"
                                  >
                                    <CheckCircleIcon className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => openManageStages(pipeline)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                  title="Manage stages"
                                >
                                  <Cog6ToothIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => openEdit(pipeline)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                  title="Edit pipeline"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePipeline(pipeline._id)}
                                  className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <PipelineForm form={createForm as any} />
                      </motion.div>
                    )}

                    {/* Edit View */}
                    {currentView === "edit" && (
                      <motion.div
                        key="edit"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <PipelineForm form={editForm as any} isEdit />
                      </motion.div>
                    )}

                    {/* Manage Stages View */}
                    {currentView === "manageStages" && selectedPipeline && (
                      <motion.div
                        key="manageStages"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <StageEditor
                          pipelineId={selectedPipeline._id}
                          workspaceId={workspaceId}
                          stages={selectedPipeline.stages}
                          onStagesUpdated={() => {
                            // Update selectedPipeline with fresh data from store
                            const updated = pipelines.find(p => p._id === selectedPipeline._id);
                            if (updated) setSelectedPipeline(updated);
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                  <div>
                    {currentView !== "list" && (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView("list");
                          setSelectedPipeline(null);
                        }}
                        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        <ArrowLeftIcon className="w-4 h-4" />
                        Back
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {currentView === "list" && (
                      <button
                        type="button"
                        onClick={() => setCurrentView("create")}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Create Pipeline
                      </button>
                    )}

                    {currentView === "create" && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={createForm.handleSubmit(handleCreatePipeline)}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? "Creating..." : "Create Pipeline"}
                      </button>
                    )}

                    {currentView === "edit" && (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={editForm.handleSubmit(handleEditPipeline)}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoading ? "Saving..." : "Save Changes"}
                      </button>
                    )}

                    {currentView === "manageStages" && (
                      <button
                        type="button"
                        onClick={() => setCurrentView("list")}
                        className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
