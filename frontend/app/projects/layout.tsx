"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bars3Icon,
  XMarkIcon,
  FolderIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserGroupIcon,
  HomeIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useAgentStore } from "@/store/useAgentStore";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import AgentSidebar from "@/components/agent/AgentSidebar";
import { useAgentContextSync } from "@/lib/hooks/useAgentContextSync";

const MOBILE_SIDEBAR_WIDTH = 280;
const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 280;

function WorkspacesLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  const { toggleSidebar: toggleAgentSidebar } = useAgentStore();
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

  // Check if we're inside a specific workspace
  const isInsideWorkspace = pathname.startsWith('/projects/') && pathname !== '/projects';
  const currentWorkspaceFromUrl = isInsideWorkspace
    ? workspaces.find(w => pathname.includes(w._id))
    : null;

  // Sync agent context with current workspace and page
  useAgentContextSync(
    currentWorkspaceFromUrl?.name,
    pathname.includes('/contacts') ? 'contacts' : pathname.includes('/companies') ? 'companies' : 'dashboard'
  );

  const SidebarContent = ({ isExpanded, onClose }: { isExpanded: boolean; onClose?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "border-b border-border transition-all duration-150 relative group flex-shrink-0",
        isExpanded ? "px-5 py-4" : "px-3 py-4"
      )}>
        <button
          onClick={() => router.push('/projects')}
          className={cn(
            "flex items-center gap-2 min-w-0 transition-colors w-full text-left",
            isInsideWorkspace && "hover:opacity-80 cursor-pointer"
          )}
          disabled={!isInsideWorkspace}
        >
          <div className="w-9 h-9 flex items-center justify-center flex-shrink-0">
            <Image
              src="/mrmorrislogo2-removebg-preview.png"
              alt="MrMorris Logo"
              width={36}
              height={36}
              className="object-contain"
            />
          </div>
          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
            }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2 overflow-hidden whitespace-nowrap min-w-0"
          >
            <h1 className="text-base font-semibold text-foreground">
              MrMorris
            </h1>
            {isInsideWorkspace && currentWorkspaceFromUrl && (
              <>
                <span className="text-muted-foreground text-base">/</span>
                <span className="text-base font-medium text-foreground truncate">
                  {currentWorkspaceFromUrl.name}
                </span>
              </>
            )}
          </motion.div>
        </button>
        {/* Close Button - Appears on hover */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all opacity-0 group-hover:opacity-100"
            aria-label="Close sidebar"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Workspaces Section - Hidden when inside a workspace */}
      {!isInsideWorkspace && (
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className={cn(
          "flex items-center mb-3 transition-all duration-150",
          isExpanded ? "justify-between" : "justify-center"
        )}>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isExpanded && (
              <button
                onClick={() => setIsWorkspacesCollapsed(!isWorkspacesCollapsed)}
                className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
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
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide overflow-hidden whitespace-nowrap"
            >
              Workspaces
            </motion.h2>
          </div>
          <button
            onClick={handleCreateWorkspace}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
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
                      "text-muted-foreground mx-auto mb-3",
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
                      <p className="text-xs text-muted-foreground">No workspaces yet</p>
                      <button
                        onClick={handleCreateWorkspace}
                        className="mt-3 text-xs text-foreground hover:text-foreground/80 transition-colors"
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
                          ? "bg-muted/70 text-foreground"
                          : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
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
      )}

      {/* CRM Navigation - Shown when inside a workspace */}
      {isInsideWorkspace && (
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className={cn(
            "flex items-center mb-3 transition-all duration-150",
            isExpanded ? "justify-start" : "justify-center"
          )}>
            <motion.h2
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
              }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wide overflow-hidden whitespace-nowrap"
            >
              CRM
            </motion.h2>
          </div>

          <div className="space-y-0.5">
            {/* Dashboard */}
            <button
              onClick={() => router.push(`/projects/${currentWorkspaceFromUrl?._id}`)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md transition-all text-left",
                isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center",
                pathname === `/projects/${currentWorkspaceFromUrl?._id}`
                  ? "bg-muted/70 text-foreground"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
              title={!isExpanded ? "Dashboard" : ""}
            >
              <HomeIcon className="w-4 h-4 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm font-normal overflow-hidden whitespace-nowrap"
              >
                Dashboard
              </motion.span>
            </button>

            {/* Contacts */}
            <button
              onClick={() => router.push(`/projects/${currentWorkspaceFromUrl?._id}/contacts`)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md transition-all text-left",
                isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center",
                pathname.includes('/contacts')
                  ? "bg-muted/70 text-foreground"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
              title={!isExpanded ? "Contacts" : ""}
            >
              <UserGroupIcon className="w-4 h-4 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm font-normal overflow-hidden whitespace-nowrap"
              >
                Contacts
              </motion.span>
            </button>

            {/* Companies */}
            <button
              onClick={() => router.push(`/projects/${currentWorkspaceFromUrl?._id}/companies`)}
              className={cn(
                "w-full flex items-center gap-2 rounded-md transition-all text-left",
                isExpanded ? "px-2 py-1.5" : "p-1.5 justify-center",
                pathname.includes('/companies')
                  ? "bg-muted/70 text-foreground"
                  : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              )}
              title={!isExpanded ? "Companies" : ""}
            >
              <BuildingOffice2Icon className="w-4 h-4 flex-shrink-0" />
              <motion.span
                initial={false}
                animate={{
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                }}
                transition={{ duration: 0.15 }}
                className="text-sm font-normal overflow-hidden whitespace-nowrap"
              >
                Companies
              </motion.span>
            </button>
          </div>
        </div>
      )}

      {/* User Section - Pinned to bottom */}
      <div className="mt-auto p-3 border-t border-border flex-shrink-0">
        <div className={cn(
          "flex items-center gap-2 mb-2 rounded-md hover:bg-muted/30 transition-colors cursor-pointer",
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
            <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </motion.div>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center gap-2 rounded-md hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-all",
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
      <div className="min-h-screen bg-background">
        {/* Header with Toggle Button and Page Name - Thin Bar */}
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-40 bg-background",
            !isResizing && "lg:transition-all lg:duration-200 lg:ease-out"
          )}
          style={{
            left: isSidebarOpen && isDesktop ? `${sidebarWidth}px` : '0',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center">
              <div className={cn(
                "flex items-center gap-3 transition-all duration-150",
                isSidebarOpen ? "opacity-0 w-0" : "opacity-100"
              )}>
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-100"
                  aria-label="Open sidebar"
                >
                  <Bars3Icon className="w-5 h-5" />
                </button>
              </div>
              <h1 className={cn(
                "text-base font-medium text-foreground transition-all duration-150",
                isSidebarOpen ? "ml-0" : "ml-3"
              )}>
                {pathname === '/projects' ? 'Workspaces' :
                  pathname.startsWith('/projects/') ? workspaces.find(w => pathname.includes(w._id))?.name || 'Workspace' :
                    'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAgentSidebar}
                className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-100"
                aria-label="Toggle AI Assistant"
                title="AI Assistant (MrMorris)"
              >
                <SparklesIcon className="w-5 h-5" />
              </button>
              <ThemeToggle />
            </div>
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
                className="lg:hidden fixed top-0 left-0 bottom-0 bg-card/95 backdrop-blur-xl border-r border-border z-50 shadow-2xl"
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
            "hidden lg:block fixed top-0 left-0 bottom-0 bg-card/95 backdrop-blur-xl border-r border-border z-30 overflow-hidden shadow-xl",
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
                <div className="w-0.5 h-8 bg-accent group-hover:bg-accent/80 transition-colors rounded-full" />
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

        {/* AI Agent Sidebar */}
        <AgentSidebar />
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
