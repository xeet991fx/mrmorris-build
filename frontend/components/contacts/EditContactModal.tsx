import { Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { updateContactSchema, UpdateContactInput } from "@/lib/validations/contact";
import { useContactStore } from "@/store/useContactStore";
import { Contact } from "@/lib/api/contact";
import ContactForm from "./ContactForm";

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  contact: Contact;
}

export default function EditContactModal({
  isOpen,
  onClose,
  workspaceId,
  contact,
}: EditContactModalProps) {
  const { updateContact, isLoading } = useContactStore();

  const form = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: {
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
      source: contact.source || "",
      status: contact.status || "lead",
      notes: contact.notes || "",
    },
  });

  const { handleSubmit, reset } = form;

  // Update form when contact changes
  useEffect(() => {
    reset({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      jobTitle: contact.jobTitle || "",
      source: contact.source || "",
      status: contact.status || "lead",
      notes: contact.notes || "",
    });
  }, [contact, reset]);

  const onSubmit = async (data: UpdateContactInput) => {
    try {
      await updateContact(workspaceId, contact._id, data);
      toast.success("Contact updated successfully!");
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to update contact";
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-neutral-800 border border-neutral-700/50 p-6 text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-white"
                    >
                      Edit Contact
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <ContactForm form={form} />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-neutral-700/50">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-neutral-900 bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
