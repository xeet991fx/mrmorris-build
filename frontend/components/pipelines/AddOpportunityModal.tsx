// @ts-nocheck
import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  createOpportunitySchema,
  CreateOpportunityInput,
} from "@/lib/validations/opportunity";
import { usePipelineStore } from "@/store/usePipelineStore";
import OpportunityForm from "./OpportunityForm";

interface AddOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  initialStageId?: string;
}

export default function AddOpportunityModal({
  isOpen,
  onClose,
  workspaceId,
  initialStageId,
}: AddOpportunityModalProps) {
  const { createOpportunity, currentPipeline, isLoading } = usePipelineStore();

  const form = useForm<CreateOpportunityInput>({
    resolver: zodResolver(createOpportunitySchema),
    defaultValues: {
      pipelineId: currentPipeline?._id || "",
      stageId: initialStageId || currentPipeline?.stages[0]?._id || "",
      title: "",
      value: 0,
      currency: "USD",
      probability: undefined,
      expectedCloseDate: "",
      contactId: "",
      companyId: "",
      description: "",
      source: "",
      status: "open",
      lostReason: "",
      assignedTo: "",
      associatedContacts: [],
      tags: [],
      priority: undefined,
    },
  });

  const { handleSubmit, reset, setValue } = form;

  // Update form when currentPipeline or initialStageId changes
  useEffect(() => {
    if (currentPipeline) {
      setValue("pipelineId", currentPipeline._id);
      if (initialStageId) {
        setValue("stageId", initialStageId);
      } else if (currentPipeline.stages.length > 0) {
        setValue("stageId", currentPipeline.stages[0]._id);
      }
    }
  }, [currentPipeline, initialStageId, setValue]);

  const onSubmit = async (data: CreateOpportunityInput) => {
    try {
      console.log("Form data before transform:", data);

      // Transform null to undefined for API compatibility
      const apiData = {
        ...data,
        probability: data.probability ?? undefined,
      };

      console.log("Transformed API data:", apiData);

      await createOpportunity(workspaceId, apiData as any);
      toast.success("Opportunity created successfully!");
      reset();
      onClose();
    } catch (error: any) {
      console.error("Create opportunity error details:", error.response?.data);

      // Handle validation errors
      if (error.response?.data?.details && Array.isArray(error.response.data.details)) {
        const validationErrors = error.response.data.details
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        toast.error(`Validation failed: ${validationErrors}`);
      } else {
        const message = error.response?.data?.error || "Failed to create opportunity";
        toast.error(message);
      }
    }
  };

  const handleClose = () => {
    reset();
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-card border border-border text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Add Opportunity
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                      <OpportunityForm form={form as any} workspaceId={workspaceId} />
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 rounded-md transition-colors"
                      >
                        {isLoading ? "Creating..." : "Create Opportunity"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
