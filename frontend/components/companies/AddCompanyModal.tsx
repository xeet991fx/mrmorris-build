import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { createCompanySchema, CreateCompanyInput } from "@/lib/validations/company";
import { useCompanyStore } from "@/store/useCompanyStore";
import { useContactStore } from "@/store/useContactStore";
import { updateContact, getContacts, Contact } from "@/lib/api/contact";
import CompanyForm from "./CompanyForm";

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
}

export default function AddCompanyModal({
  isOpen,
  onClose,
  workspaceId,
}: AddCompanyModalProps) {
  const { createCompany, isLoading } = useCompanyStore();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);

  const form = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      phone: "",
      domain: "",
      companySize: undefined,
      annualRevenue: undefined,
      employeeCount: undefined,
      linkedinUrl: "",
      twitterUrl: "",
      facebookUrl: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
      status: "lead",
      source: "",
      notes: "",
      tags: [],
      associatedContacts: [],
    },
  });

  const { handleSubmit, reset } = form;

  // Fetch contacts when modal opens
  useEffect(() => {
    const fetchContacts = async () => {
      if (!isOpen || !workspaceId) return;

      setIsLoadingContacts(true);
      try {
        const response = await getContacts(workspaceId, { limit: 1000 });
        if (response.success && response.data) {
          // Only show contacts without a company or with no companyId
          const availableContacts = response.data.contacts.filter(
            (c) => !c.companyId
          );
          setContacts(availableContacts);
        }
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setIsLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [isOpen, workspaceId]);

  const onSubmit = async (data: CreateCompanyInput) => {
    try {
      // Extract associated contacts before creating
      const associatedContactIds = data.associatedContacts || [];

      // Remove associatedContacts from data as backend doesn't handle it
      const { associatedContacts, ...companyData } = data;

      // Create company
      const company = await createCompany(workspaceId, companyData);

      // Link contacts to the company if any were selected
      if (associatedContactIds.length > 0 && company?._id) {
        await Promise.all(
          associatedContactIds.map(async (contactId) => {
            try {
              await updateContact(workspaceId, contactId, {
                companyId: company._id,
                company: company.name,
              });
            } catch (error) {
              console.error(`Failed to link contact ${contactId}:`, error);
            }
          })
        );
      }

      toast.success("Company created successfully!");
      reset();
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to create company";
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
                      Add New Company
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
                    <CompanyForm
                      form={form}
                      contacts={contacts}
                      isLoadingContacts={isLoadingContacts}
                    />

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
                        {isLoading ? "Creating..." : "Create Company"}
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
