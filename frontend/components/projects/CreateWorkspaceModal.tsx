"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { createWorkspaceSchema, type CreateWorkspaceInput } from "@/lib/validations/workspace";
import toast from "react-hot-toast";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const router = useRouter();
  const { createWorkspace, isLoading } = useWorkspaceStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateWorkspaceInput>({
    resolver: zodResolver(createWorkspaceSchema),
  });

  const onSubmit = async (data: CreateWorkspaceInput) => {
    try {
      const workspace = await createWorkspace(data.name);
      toast.success("Workspace created successfully!");
      reset();
      onClose();

      // Redirect to workspace page to start onboarding
      router.push(`/projects/${workspace._id}`);
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to create workspace";
      toast.error(message);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={handleClose}
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-neutral-950/95 backdrop-blur-xl border border-neutral-900/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-900/50">
                <Dialog.Title className="text-2xl font-bold text-white">
                  Create New Workspace
                </Dialog.Title>
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-neutral-900/50 text-neutral-400 hover:text-white transition-all"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-neutral-300 mb-2"
                  >
                    Workspace Name
                  </label>
                  <input
                    {...register("name")}
                    id="name"
                    type="text"
                    placeholder="e.g., My Marketing Campaign"
                    className="w-full px-4 py-3 bg-neutral-900/50 border border-neutral-800/50 rounded-lg text-white placeholder:text-neutral-500 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    autoFocus
                  />
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400"
                    >
                      {errors.name.message}
                    </motion.p>
                  )}
                  <p className="mt-2 text-xs text-neutral-500">
                    Give your workspace a descriptive name (3-100 characters)
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800/50 text-neutral-300 hover:text-white rounded-lg font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-primary to-primary hover:from-primary/90 hover:to-primary/90 text-white font-semibold rounded-lg shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
