"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bars3Icon,
  XMarkIcon,
  FolderIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectStore } from "@/store/useProjectStore";
import { cn } from "@/lib/utils";

function ProjectsLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { projects, fetchProjects, setCurrentProject } = useProjectStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Fetch projects on mount with error handling
  useEffect(() => {
    const loadProjects = async () => {
      try {
        await fetchProjects();
      } catch (error) {
        console.error("Failed to fetch projects:", error);
        // User will still see the UI, just with no projects
        // Toast notification already handled by the store
      }
    };

    loadProjects();
  }, [fetchProjects]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleProjectClick = (project: any) => {
    setCurrentProject(project);
    router.push(`/projects/${project._id}`);
    setIsSidebarOpen(false);
  };

  const handleCreateProject = () => {
    router.push("/projects");
    setIsSidebarOpen(false);
  };

  const isProjectActive = (projectId: string) => {
    return pathname.includes(projectId);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            MrMorris
          </h1>
        </div>
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            Projects
          </h2>
          <button
            onClick={handleCreateProject}
            className="p-1.5 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-violet-400 transition-all"
            aria-label="Create new project"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Projects List */}
        <div className="space-y-2">
          {projects.length === 0 ? (
            <div className="text-center py-8">
              <FolderIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No projects yet</p>
              <button
                onClick={handleCreateProject}
                className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
              >
                Create your first project
              </button>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project._id}
                onClick={() => handleProjectClick(project)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group",
                  isProjectActive(project._id)
                    ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 border border-violet-500/50"
                    : "hover:bg-slate-800/30 border border-transparent"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    isProjectActive(project._id)
                      ? "bg-gradient-to-br from-violet-500 to-purple-500"
                      : "bg-slate-800/50 group-hover:bg-slate-700/50"
                  )}
                >
                  <FolderIcon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "font-medium truncate",
                      isProjectActive(project._id)
                        ? "text-white"
                        : "text-slate-300 group-hover:text-white"
                    )}
                  >
                    {project.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {project.onboardingCompleted ? "Setup Complete" : "Setup Pending"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800/50">
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-slate-800/30">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/50">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                MrMorris
              </h1>
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800/50 z-50"
              >
                <SidebarContent />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block fixed top-0 left-0 bottom-0 w-[280px] bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50">
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="lg:ml-[280px] pt-[72px] lg:pt-0">
          <div className="min-h-screen">{children}</div>
        </main>
      </div>
    </>
  );
}

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <ProjectsLayoutContent>{children}</ProjectsLayoutContent>
    </ProtectedRoute>
  );
}
