"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  RocketLaunchIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  Cog6ToothIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { Menu } from "@headlessui/react";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import CreateWorkspaceModal from "@/components/projects/CreateWorkspaceModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function WorkspacesPage() {
  const router = useRouter();
  const { workspaces, deleteWorkspace } = useWorkspaceStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingWorkspaceId, setDeletingWorkspaceId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleOpenWorkspace = (workspaceId: string) => {
    router.push(`/projects/${workspaceId}`);
  };

  const handleDeleteWorkspace = (workspaceId: string, workspaceName: string) => {
    setWorkspaceToDelete({ id: workspaceId, name: workspaceName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;

    setDeletingWorkspaceId(workspaceToDelete.id);
    try {
      await deleteWorkspace(workspaceToDelete.id);
      toast.success("Workspace deleted successfully");
    } catch (error) {
      toast.error("Failed to delete workspace");
    } finally {
      setDeletingWorkspaceId(null);
      setWorkspaceToDelete(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-900 px-8 pt-14 pb-8">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-sm text-neutral-400">
            Manage your marketing automation workspaces
          </p>
        </motion.div>

        {workspaces.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <div className="text-center max-w-md">
              <div className="w-14 h-14 bg-neutral-700/50 rounded-xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <RocketLaunchIcon className="w-6 h-6 text-neutral-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Create Your First Workspace
              </h2>
              <p className="text-sm text-neutral-400 mb-6">
                Get started with autonomous marketing by creating your first
                workspace. We&apos;ll guide you through a simple setup process.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-neutral-900 font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow"
              >
                <PlusIcon className="w-4 h-4" />
                Create Workspace
              </button>
            </div>
          </motion.div>
        ) : (
          /* Workspaces Grid */
          <div>
            <div className="flex justify-end mb-5">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-neutral-900 font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow"
              >
                <PlusIcon className="w-4 h-4" />
                New Workspace
              </button>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {workspaces.map((workspace) => (
                <motion.div
                  key={workspace._id}
                  variants={itemVariants}
                  className="relative group"
                >
                  <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-xl p-4 hover:border-neutral-600/50 hover:bg-neutral-800/70 transition-all duration-100 cursor-pointer shadow-sm hover:shadow-md">
                    {/* Settings Menu */}
                    <div className="absolute top-2.5 right-2.5">
                      <Menu as="div" className="relative">
                        <Menu.Button className="p-1.5 rounded-md hover:bg-neutral-700/50 text-neutral-500 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <EllipsisVerticalIcon className="w-4 h-4" />
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 mt-1 w-36 origin-top-right bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-10">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenWorkspace(workspace._id);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                  active
                                    ? "bg-neutral-700 text-white"
                                    : "text-neutral-300"
                                )}
                              >
                                <Cog6ToothIcon className="w-3.5 h-3.5" />
                                Settings
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkspace(workspace._id, workspace.name);
                                }}
                                disabled={deletingWorkspaceId === workspace._id}
                                className={cn(
                                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                                  active
                                    ? "bg-red-500/20 text-red-400"
                                    : "text-red-400",
                                  deletingWorkspaceId === workspace._id &&
                                  "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <TrashIcon className="w-3.5 h-3.5" />
                                {deletingWorkspaceId === workspace._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Menu>
                    </div>

                    {/* Card Content */}
                    <div onClick={() => handleOpenWorkspace(workspace._id)}>
                      <h3 className="text-base font-semibold text-white mb-1 pr-7">
                        {workspace.name}
                      </h3>
                      <p className="text-xs text-neutral-500 mb-3">
                        Created {format(new Date(workspace.createdAt), "MMM d, yyyy")}
                      </p>

                      {/* Status Badge */}
                      <div className="mb-3">
                        {workspace.onboardingCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded text-xs font-medium text-green-400">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-xs font-medium text-amber-400">
                            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                            Pending
                          </span>
                        )}
                      </div>

                      {/* Open Button */}
                      <button className="w-full px-3 py-1.5 bg-neutral-700/50 hover:bg-neutral-700 border border-neutral-700/50 hover:border-neutral-600 text-neutral-300 hover:text-white rounded-md transition-all text-xs font-medium">
                        Open Workspace
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setWorkspaceToDelete(null);
        }}
        onConfirm={confirmDeleteWorkspace}
        title="Delete Workspace"
        message={`Are you sure you want to delete "${workspaceToDelete?.name}"? This action cannot be undone and all workspace data will be permanently lost.`}
        confirmText="Delete Workspace"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
