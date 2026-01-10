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
      tags: contact.tags || [],
      linkedin: contact.linkedin || "",
      twitter: contact.twitter || "",
      website: contact.website || "",
      address: {
        street: contact.address?.street || "",
        city: contact.address?.city || "",
        state: contact.address?.state || "",
        country: contact.address?.country || "",
        zipCode: contact.address?.zipCode || "",
      },
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
      tags: contact.tags || [],
      linkedin: contact.linkedin || "",
      twitter: contact.twitter || "",
      website: contact.website || "",
      address: {
        street: contact.address?.street || "",
        city: contact.address?.city || "",
        state: contact.address?.state || "",
        country: contact.address?.country || "",
        zipCode: contact.address?.zipCode || "",
      },
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
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 p-6 shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      Edit Contact
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <ContactForm form={form} />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
