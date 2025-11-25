"use client";

import { useEffect, useState, useRef } from "react";
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
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";

const MOBILE_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;

function WorkspacesLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);

  // Use lazy initialization to read from localStorage synchronously (fixes flicker bug)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('sidebarWidth');
      if (savedWidth) {
        const width = parseInt(savedWidth);
        if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
          return width;
        }
      }
    }
    return DEFAULT_SIDEBAR_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isWorkspacesCollapsed, setIsWorkspacesCollapsed] = useState(false);

  // Use ref to track current width for localStorage save (fixes stale closure bug)
  const sidebarWidthRef = useRef(sidebarWidth);

  // Update ref whenever sidebarWidth changes
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  // Track desktop/mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    // Set initial value
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch workspaces on mount with error handling
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        await fetchWorkspaces();
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
        // User will still see the UI, just with no workspaces
        // Toast notification already handled by the store
      }
    };

    loadWorkspaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleWorkspaceClick = (workspace: any) => {
    setCurrentWorkspace(workspace);
    router.push(`/projects/${workspace._id}`);
    setIsSidebarOpen(false);
  };

  const handleCreateWorkspace = () => {
    router.push("/projects");
    setIsSidebarOpen(false);
  };

  const isWorkspaceActive = (workspaceId: string) => {
    return pathname.includes(workspaceId);
  };

  // Handle sidebar resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  // Resize effect - using requestAnimationFrame for smooth updates
  useEffect(() => {
    let rafId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      // Cancel previous frame if still pending
      if (rafId) {
        cancelAnimationFrame(rafId);
      }

      // Schedule update on next frame for smooth 60fps updates
      rafId = requestAnimationFrame(() => {
        // Clamp width between min and max (fixes boundary bug)
        const newWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, e.clientX));
        setSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Use ref to get latest width (fixes stale closure bug)
        localStorage.setItem('sidebarWidth', sidebarWidthRef.current.toString());

        // Cancel any pending frame
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Clean up any pending animation frame
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isResizing]); // Only depend on isResizing, not sidebarWidth

  // Cleanup body styles on unmount (fixes stuck cursor bug)
  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const SidebarContent = ({ isExpanded, onClose }: { isExpanded: boolean; onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "border-b border-neutral-700/50 transition-all duration-150 relative group",
        isExpanded ? "px-5 py-4" : "px-3 py-4"
      )}>
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-3 w-full hover:opacity-80 transition-opacity"
          aria-label="Go to projects"
        >
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
        </button>
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

      {/* Workspaces Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className={cn(
          "flex items-center mb-3 transition-all duration-150",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isExpanded && (
              <button
                onClick={() => setIsWorkspacesCollapsed(!isWorkspacesCollapsed)}
                className="p-0.5 rounded hover:bg-neutral-700/50 text-neutral-500 hover:text-white transition-all"
                aria-label={isWorkspacesCollapsed ? "Expand workspaces" : "Collapse workspaces"}
              >
                <ChevronDownIcon
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isWorkspacesCollapsed && "-rotate-90"
                  )}
                />
              </button>
            )}
            <motion.h2
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
              }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-neutral-500 uppercase tracking-wide overflow-hidden whitespace-nowrap"
            >
              Workspaces
            </motion.h2>
          </div>
          <button
            onClick={handleCreateWorkspace}
            className="p-1 rounded hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all"
            aria-label="Create new workspace"
            title={!isExpanded ? "Create new workspace" : ""}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Workspaces List */}
        <AnimatePresence initial={false}>
          {!isWorkspacesCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5">
                {workspaces.length === 0 ? (
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
                <p className="text-xs text-neutral-500">No workspaces yet</p>
                <button
                  onClick={handleCreateWorkspace}
                  className="mt-3 text-xs text-white hover:text-neutral-300 transition-colors"
                >
                  Create your first workspace
                </button>
              </motion.div>
            </div>
          ) : (
            workspaces.map((workspace) => (
              <button
                key={workspace._id}
                onClick={() => handleWorkspaceClick(workspace)}
                className={cn(
                  "w-full flex items-center gap-2 rounded-md transition-all text-left group",
                  isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center",
                  isWorkspaceActive(workspace._id)
                    ? "bg-neutral-700/70 text-white"
                    : "text-neutral-400 hover:bg-neutral-700/30 hover:text-white"
                )}
                title={!isExpanded ? workspace.name : ""}
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
                    {workspace.name}
                  </p>
                </motion.div>
              </button>
            ))
          )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
            "fixed top-0 left-0 right-0 z-40 bg-neutral-900",
            !isResizing && "lg:transition-all lg:duration-200 lg:ease-out"
          )}
          style={{
            left: isSidebarOpen && isDesktop ? `${sidebarWidth}px` : '0',
          }}
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
              {pathname === '/projects' ? 'Workspaces' :
               pathname.startsWith('/projects/') ? workspaces.find(w => pathname.includes(w._id))?.name || 'Workspace' :
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
                initial={{ x: -MOBILE_SIDEBAR_WIDTH }}
                animate={{ x: 0 }}
                exit={{ x: -MOBILE_SIDEBAR_WIDTH }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="lg:hidden fixed top-0 left-0 bottom-0 bg-neutral-800/50 backdrop-blur-xl border-r border-neutral-700/50 z-50 shadow-2xl"
                style={{ width: `${MOBILE_SIDEBAR_WIDTH}px` }}
              >
                <SidebarContent isExpanded={true} onClose={() => setIsSidebarOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar (>= lg screens) - Pushes content */}
        <aside
          className={cn(
            "hidden lg:block fixed top-0 left-0 bottom-0 bg-neutral-800/50 backdrop-blur-xl border-r border-neutral-700/50 z-30 overflow-hidden shadow-xl",
            !isResizing && "transition-all duration-200 ease-out"
          )}
          style={{
            width: isSidebarOpen ? `${sidebarWidth}px` : 0
          }}
        >
          <div style={{ width: `${sidebarWidth}px` }}>
            <SidebarContent isExpanded={true} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* Resize Handle - Desktop only */}
          {isSidebarOpen && (
            <div className="absolute top-0 right-0 bottom-0 w-1 flex items-center justify-center">
              <div
                onMouseDown={handleMouseDown}
                className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-12 flex items-center justify-center cursor-col-resize group"
              >
                <div className="w-0.5 h-8 bg-neutral-600 group-hover:bg-neutral-500 transition-colors rounded-full" />
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="min-h-screen">
          <div
            className={cn(
              "min-h-screen",
              !isResizing && "lg:transition-all lg:duration-200 lg:ease-out"
            )}
            style={{
              marginLeft: isSidebarOpen && isDesktop ? `${sidebarWidth}px` : '0',
            }}
          >
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

export default function WorkspacesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <WorkspacesLayoutContent>{children}</WorkspacesLayoutContent>
    </ProtectedRoute>
  );
}
