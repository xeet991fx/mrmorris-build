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
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import CreateProjectModal from "@/components/projects/CreateProjectModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ProjectsPage() {
  const router = useRouter();
  const { projects, deleteProject } = useProjectStore();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleOpenProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const handleDeleteProject = (projectId: string, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeletingProjectId(projectToDelete.id);
    try {
      await deleteProject(projectToDelete.id);
      toast.success("Project deleted successfully");
    } catch (error) {
      toast.error("Failed to delete project");
    } finally {
      setDeletingProjectId(null);
      setProjectToDelete(null);
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
      <div className="min-h-screen p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Projects</h1>
          <p className="text-slate-400">
            Manage your marketing automation projects
          </p>
        </motion.div>

        {projects.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <div className="text-center max-w-md">
              <div className="w-24 h-24 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <RocketLaunchIcon className="w-12 h-12 text-violet-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">
                Create Your First Project
              </h2>
              <p className="text-slate-400 mb-8">
                Get started with autonomous marketing by creating your first
                project. We will guide you through a simple setup process.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/25 transition-all transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                Create Project
              </button>
            </div>
          </motion.div>
        ) : (
          /* Projects Grid */
          <div>
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/25 transition-all transform hover:scale-105"
              >
                <PlusIcon className="w-5 h-5" />
                New Project
              </button>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {projects.map((project) => (
                <motion.div
                  key={project._id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative group"
                >
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 hover:border-violet-500/50 transition-all cursor-pointer shadow-lg hover:shadow-violet-500/10">
                    {/* Settings Menu */}
                    <div className="absolute top-4 right-4">
                      <Menu as="div" className="relative">
                        <Menu.Button className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100">
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </Menu.Button>
                        <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10">
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenProject(project._id);
                                }}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors",
                                  active
                                    ? "bg-slate-700 text-white"
                                    : "text-slate-300"
                                )}
                              >
                                <Cog6ToothIcon className="w-4 h-4" />
                                Settings
                              </button>
                            )}
                          </Menu.Item>
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project._id, project.name);
                                }}
                                disabled={deletingProjectId === project._id}
                                className={cn(
                                  "w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors",
                                  active
                                    ? "bg-red-500/20 text-red-400"
                                    : "text-red-400",
                                  deletingProjectId === project._id &&
                                    "opacity-50 cursor-not-allowed"
                                )}
                              >
                                <TrashIcon className="w-4 h-4" />
                                {deletingProjectId === project._id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            )}
                          </Menu.Item>
                        </Menu.Items>
                      </Menu>
                    </div>

                    {/* Card Content */}
                    <div onClick={() => handleOpenProject(project._id)}>
                      <h3 className="text-xl font-bold text-white mb-2 pr-8">
                        {project.name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Created {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </p>

                      {/* Status Badge */}
                      <div className="mb-6">
                        {project.onboardingCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-xs font-medium text-green-400">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            Setup Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-medium text-amber-400">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            Setup Pending
                          </span>
                        )}
                      </div>

                      {/* Open Button */}
                      <button className="w-full px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-violet-500/50 text-slate-300 hover:text-white rounded-lg transition-all font-medium">
                        Open Project
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message={`Are you sure you want to delete "${projectToDelete?.name}"? This action cannot be undone and all project data will be permanently lost.`}
        confirmText="Delete Project"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );
}
