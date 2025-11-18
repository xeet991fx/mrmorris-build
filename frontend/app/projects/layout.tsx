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
  ChevronLeftIcon,
  ChevronRightIcon,
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
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);

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

  const SidebarContent = ({ isExpanded, onClose }: { isExpanded: boolean; onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "border-b border-neutral-700/50 transition-all duration-150 relative group",
        isExpanded ? "px-5 py-4" : "px-3 py-4"
      )}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#9ACD32] rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-neutral-900 font-bold text-sm">M</span>
          </div>
          <motion.h1
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.15 }}
            className="text-base font-semibold text-white overflow-hidden whitespace-nowrap"
          >
            MrMorris
          </motion.h1>
        </div>
        {/* Close Button - Appears on hover */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className={cn(
          "flex items-center mb-3 transition-all duration-150",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <motion.h2
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.15 }}
            className="text-xs font-semibold text-neutral-500 uppercase tracking-wide overflow-hidden whitespace-nowrap"
          >
            Projects
          </motion.h2>
          <button
            onClick={handleCreateProject}
            className="p-1 rounded hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all"
            aria-label="Create new project"
            title={!isExpanded ? "Create new project" : ""}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Projects List */}
        <div className="space-y-0.5">
          {projects.length === 0 ? (
            <div className={cn(
              "text-center transition-all",
              isExpanded ? "py-8" : "py-4"
            )}>
              <FolderIcon className={cn(
                "text-neutral-500 mx-auto mb-3",
                isExpanded ? "w-5 h-5" : "w-4 h-4"
              )} />
              <motion.div
                initial={false}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  height: isExpanded ? "auto" : 0,
                }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <p className="text-xs text-neutral-500">No projects yet</p>
                <button
                  onClick={handleCreateProject}
                  className="mt-3 text-xs text-white hover:text-neutral-300 transition-colors"
                >
                  Create your first project
                </button>
              </motion.div>
            </div>
          ) : (
            projects.map((project) => (
              <button
                key={project._id}
                onClick={() => handleProjectClick(project)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md transition-all text-left group",
                  isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center",
                  isProjectActive(project._id)
                    ? "bg-neutral-700/70 text-white"
                    : "text-neutral-400 hover:bg-neutral-700/30 hover:text-white"
                )}
                title={!isExpanded ? project.name : ""}
              >
                <FolderIcon className="w-4 h-4 flex-shrink-0" />
                <motion.div
                  initial={false}
                  animate={{
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                  }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 min-w-0 overflow-hidden"
                >
                  <p className="text-sm font-normal truncate">
                    {project.name}
                  </p>
                </motion.div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-neutral-700/50">
        <div className={cn(
          "flex items-center gap-2 mb-2 rounded-md hover:bg-neutral-700/30 transition-colors cursor-pointer",
          isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center"
        )}>
          <div className="w-6 h-6 bg-[#9ACD32] rounded-full flex items-center justify-center text-neutral-900 text-xs font-semibold flex-shrink-0 shadow-sm">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
          </motion.div>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2 rounded-md hover:bg-neutral-700/30 text-neutral-400 hover:text-white transition-all",
            isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center"
          )}
          title={!isExpanded ? "Logout" : ""}
        >
          <ArrowRightOnRectangleIcon className="w-4 h-4 flex-shrink-0" />
          <motion.span
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.15 }}
            className="text-sm font-normal overflow-hidden whitespace-nowrap"
          >
            Logout
          </motion.span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-neutral-900">
        {/* Header with Toggle Button and Page Name - Thin Bar */}
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-40 bg-neutral-900 transition-all duration-150",
            isSidebarOpen ? "lg:left-[280px]" : "lg:left-0"
          )}
        >
          <div className="flex items-center px-4 py-2.5">
            <div className={cn(
              "flex items-center gap-3 transition-all duration-150",
              isSidebarOpen ? "opacity-0 w-0" : "opacity-100"
            )}>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all duration-100"
                aria-label="Open sidebar"
              >
                <Bars3Icon className="w-5 h-5" />
              </button>
            </div>
            <h1 className={cn(
              "text-base font-medium text-white transition-all duration-150",
              isSidebarOpen ? "ml-0" : "ml-3"
            )}>
              {pathname === '/projects' ? 'Projects' :
               pathname.startsWith('/projects/') ? projects.find(p => pathname.includes(p._id))?.name || 'Project' :
               'Dashboard'}
            </h1>
          </div>
        </div>

        {/* Mobile Sidebar Overlay (< lg screens) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                onClick={() => setIsSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] bg-neutral-800/50 backdrop-blur-xl border-r border-neutral-700/50 z-50 shadow-2xl"
              >
                <SidebarContent isExpanded={true} onClose={() => setIsSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar (>= lg screens) - Pushes content */}
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarOpen ? 280 : 0,
          }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          className="hidden lg:block fixed top-0 left-0 bottom-0 bg-neutral-800/50 backdrop-blur-xl border-r border-neutral-700/50 z-30 overflow-hidden shadow-xl"
        >
          <div className="w-[280px]">
            <SidebarContent isExpanded={true} onClose={() => setIsSidebarOpen(false)} />
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className="min-h-screen">
          <div
            className={cn(
              "min-h-screen transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]",
              isSidebarOpen ? "lg:ml-[280px]" : "lg:ml-0"
            )}
          >
            {children}
          </div>
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
