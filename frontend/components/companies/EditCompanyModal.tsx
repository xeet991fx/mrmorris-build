import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { updateCompanySchema, UpdateCompanyInput } from "@/lib/validations/company";
import { useCompanyStore } from "@/store/useCompanyStore";
import { Company } from "@/lib/api/company";
import CompanyForm from "./CompanyForm";

interface EditCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  company: Company;
}

export default function EditCompanyModal({
  isOpen,
  onClose,
  workspaceId,
  company,
}: EditCompanyModalProps) {
  const { updateCompany, isLoading } = useCompanyStore();

  const form = useForm<UpdateCompanyInput>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      name: company.name,
      industry: company.industry || "",
      website: company.website || "",
      phone: company.phone || "",
      companySize: company.companySize,
      annualRevenue: company.annualRevenue,
      employeeCount: company.employeeCount,
      linkedinUrl: company.linkedinUrl || "",
      twitterUrl: company.twitterUrl || "",
      facebookUrl: company.facebookUrl || "",
      address: company.address || {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
      status: company.status || "lead",
      source: company.source || "",
      notes: company.notes || "",
      tags: company.tags || [],
    },
  });

  const { handleSubmit, reset } = form;

  // Update form when company changes
  useEffect(() => {
    reset({
      name: company.name,
      industry: company.industry || "",
      website: company.website || "",
      phone: company.phone || "",
      companySize: company.companySize,
      annualRevenue: company.annualRevenue,
      employeeCount: company.employeeCount,
      linkedinUrl: company.linkedinUrl || "",
      twitterUrl: company.twitterUrl || "",
      facebookUrl: company.facebookUrl || "",
      address: company.address || {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
      status: company.status || "lead",
      source: company.source || "",
      notes: company.notes || "",
      tags: company.tags || [],
    });
  }, [company, reset]);

  const onSubmit = async (data: UpdateCompanyInput) => {
    try {
      await updateCompany(workspaceId, company._id, data);
      toast.success("Company updated successfully!");
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update company";
      toast.error(message);
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-foreground"
                    >
                      Edit Company
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <CompanyForm form={form} />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-background bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Saving..." : "Save Changes"}
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
