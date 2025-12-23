// @ts-nocheck
import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  updateOpportunitySchema,
  UpdateOpportunityInput,
} from "@/lib/validations/opportunity";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Opportunity } from "@/lib/api/opportunity";
import OpportunityForm from "./OpportunityForm";
import { DealInsightsPanel } from "./DealInsightsPanel";

interface EditOpportunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  opportunity: Opportunity | null;
}

export default function EditOpportunityModal({
  isOpen,
  onClose,
  workspaceId,
  opportunity,
}: EditOpportunityModalProps) {
  const { updateOpportunity, isLoading } = usePipelineStore();

  const form = useForm<UpdateOpportunityInput>({
    resolver: zodResolver(updateOpportunitySchema),
  });

  const { handleSubmit, reset } = form;

  // Populate form when opportunity changes
  useEffect(() => {
    if (opportunity) {
      // Format date for input type="date"
      const formatDate = (dateString?: string) => {
        if (!dateString) return "";
        return new Date(dateString).toISOString().split("T")[0];
      };

      // Get assignedTo ID (handle populated object)
      const getAssignedToId = (assignedTo: any): string => {
        if (!assignedTo) return "";
        if (typeof assignedTo === "string") return assignedTo;
        return assignedTo._id || "";
      };

      // Get company ID (handle populated object)
      const getCompanyId = (companyId: any): string => {
        if (!companyId) return "";
        if (typeof companyId === "string") return companyId;
        return companyId._id || "";
      };

      // Get associatedContacts IDs (handle populated objects)
      const getAssociatedContactIds = (contacts: any): string[] => {
        if (!contacts || !Array.isArray(contacts)) return [];
        return contacts.map((c: any) => (typeof c === "string" ? c : c._id)).filter(Boolean);
      };

      reset({
        pipelineId: opportunity.pipelineId,
        stageId: opportunity.stageId,
        title: opportunity.title,
        value: opportunity.value,
        currency: opportunity.currency,
        probability: opportunity.probability,
        expectedCloseDate: formatDate(opportunity.expectedCloseDate),
        contactId: opportunity.contactId || "",
        companyId: getCompanyId(opportunity.companyId),
        description: opportunity.description || "",
        source: opportunity.source || "",
        status: opportunity.status,
        lostReason: opportunity.lostReason || "",
        assignedTo: getAssignedToId(opportunity.assignedTo),
        associatedContacts: getAssociatedContactIds(opportunity.associatedContacts),
        tags: opportunity.tags || [],
        priority: opportunity.priority,
      });
    }
  }, [opportunity, reset]);

  const onSubmit = async (data: UpdateOpportunityInput) => {
    if (!opportunity) return;

    try {
      // Transform null to undefined for API compatibility
      const apiData = {
        ...data,
        probability: data.probability ?? undefined,
      };
      await updateOpportunity(workspaceId, opportunity._id, apiData as any);
      toast.success("Opportunity updated successfully!");
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update opportunity";
      toast.error(message);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!opportunity) return null;

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
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-lg bg-card border border-border text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <Dialog.Title className="text-lg font-semibold text-foreground">
                      Edit Opportunity: {opportunity.title}
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content - Two columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-3">
                    {/* Form Column */}
                    <div className="lg:col-span-2 border-r border-border">
                      <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                          <OpportunityForm form={form as any} isEdit workspaceId={workspaceId} />
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
                            className="px-4 py-2 text-sm font-medium bg-[#9ACD32] hover:bg-[#8BC225] disabled:opacity-50 disabled:cursor-not-allowed text-neutral-900 rounded-md transition-colors"
                          >
                            {isLoading ? "Saving..." : "Save Changes"}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* AI Insights Column */}
                    <div className="lg:col-span-1 p-4 max-h-[80vh] overflow-y-auto">
                      <DealInsightsPanel
                        workspaceId={workspaceId}
                        dealId={opportunity._id}
                        dealName={opportunity.title}
                      />
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

