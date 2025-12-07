"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderIcon,
  PlusIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  UserGroupIcon,
  HomeIcon,
  BuildingOffice2Icon,
  Squares2X2Icon,
  EnvelopeIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

function WorkspacesLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  const { toggleSidebar: toggleAgentSidebar } = useAgentStore();

  // Sidebar is always visible - either expanded (full) or collapsed (icon-only)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpanded');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);

  // Save sidebar expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };


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
  };

  const handleCreateWorkspace = () => {
    router.push("/projects");
  };

  const isWorkspaceActive = (workspaceId: string) => {
    return pathname.includes(workspaceId);
  };

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

  const SidebarContent = ({ isExpanded }: { isExpanded: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Workspace Header - Clickable */}
      <div className={cn(
        "border-b border-border transition-all duration-150 relative flex-shrink-0",
        isExpanded ? "px-4 py-3" : "px-2 py-3"
      )}>
        {isExpanded ? (
          <button
            onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
            className="w-full flex items-center gap-3 hover:bg-muted/20 rounded-md p-1 -m-1 transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              <Image
                src="/Clianta-logo.jpg"
                alt="Company Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden text-left">
              <h1 className="text-sm font-semibold text-foreground truncate">
                {currentWorkspaceFromUrl?.name || user?.name || "Workspace"}
              </h1>
            </div>
            <ChevronDownIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        ) : (
          <button
            onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
            className="flex items-center justify-center w-full hover:bg-muted/20 rounded-md p-1 -m-1 transition-colors"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <Image
                src="/Clianta-logo.jpg"
                alt="Company Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">

        {/* CRM Pages - Show when inside a workspace */}
        {isInsideWorkspace && currentWorkspaceFromUrl && (
          <div className={cn(
            "py-3 border-t border-border",
            isExpanded ? "px-3" : "px-2"
          )}>
            <div className={cn(isExpanded ? "space-y-0.5" : "space-y-1")}>
              {/* Dashboard */}
              <button
                onClick={() => router.push(`/projects/${currentWorkspaceFromUrl._id}`)}
                className={cn(
                  "w-full flex items-center rounded-md transition-all",
                  isExpanded ? "gap-2 px-2 py-1.5 text-left" : "justify-center p-2",
                  pathname === `/projects/${currentWorkspaceFromUrl._id}`
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
                title={!isExpanded ? "Dashboard" : ""}
              >
                <HomeIcon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-normal">
                    Dashboard
                  </span>
                )}
              </button>

              {/* Contacts */}
              <button
                onClick={() => router.push(`/projects/${currentWorkspaceFromUrl._id}/contacts`)}
                className={cn(
                  "w-full flex items-center rounded-md transition-all",
                  isExpanded ? "gap-2 px-2 py-1.5 text-left" : "justify-center p-2",
                  pathname.includes('/contacts')
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
                title={!isExpanded ? "Contacts" : ""}
              >
                <UserGroupIcon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-normal">
                    Contacts
                  </span>
                )}
              </button>

              {/* Companies */}
              <button
                onClick={() => router.push(`/projects/${currentWorkspaceFromUrl._id}/companies`)}
                className={cn(
                  "w-full flex items-center rounded-md transition-all",
                  isExpanded ? "gap-2 px-2 py-1.5 text-left" : "justify-center p-2",
                  pathname.includes('/companies')
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
                title={!isExpanded ? "Companies" : ""}
              >
                <BuildingOffice2Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-normal">
                    Companies
                  </span>
                )}
              </button>

              {/* Pipelines */}
              <button
                onClick={() => router.push(`/projects/${currentWorkspaceFromUrl._id}/pipelines`)}
                className={cn(
                  "w-full flex items-center rounded-md transition-all",
                  isExpanded ? "gap-2 px-2 py-1.5 text-left" : "justify-center p-2",
                  pathname.includes('/pipelines')
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
                title={!isExpanded ? "Pipelines" : ""}
              >
                <Squares2X2Icon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-normal">
                    Pipelines
                  </span>
                )}
              </button>

              {/* Email Settings */}
              <button
                onClick={() => router.push(`/projects/${currentWorkspaceFromUrl._id}/settings/email`)}
                className={cn(
                  "w-full flex items-center rounded-md transition-all",
                  isExpanded ? "gap-2 px-2 py-1.5 text-left" : "justify-center p-2",
                  pathname.includes('/settings/email')
                    ? "bg-muted/70 text-foreground"
                    : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                )}
                title={!isExpanded ? "Email Settings" : ""}
              >
                <EnvelopeIcon className="w-5 h-5 flex-shrink-0" />
                {isExpanded && (
                  <span className="text-sm font-normal">
                    Email Integration
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto border-t border-border">
        {/* Log Out */}
        <button
          onClick={handleLogout}
          className={cn(
            "w-full flex items-center transition-all text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            isExpanded ? "gap-2 px-4 py-2 text-left" : "justify-center p-2"
          )}
          title={!isExpanded ? "Log out" : ""}
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
          {isExpanded && (
            <span>Log out</span>
          )}
        </button>

        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={cn(
            "w-full flex items-center transition-all border-t border-border text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground",
            isExpanded ? "gap-2 px-4 py-3 text-left" : "justify-center p-3"
          )}
          title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isExpanded ? (
            <ChevronLeftIcon className="w-5 h-5 flex-shrink-0" />
          ) : (
            <ChevronRightIcon className="w-5 h-5 flex-shrink-0" />
          )}
          {isExpanded && (
            <span>Collapse</span>
          )}
        </button>
      </div>

    </div>
  );

  const COLLAPSED_WIDTH = 60;
  const EXPANDED_WIDTH = 280;

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-background">
        {/* Workspace Switcher Popup */}
        <AnimatePresence>
          {isWorkspaceSwitcherOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/20 z-40"
                onClick={() => setIsWorkspaceSwitcherOpen(false)}
              />

              {/* Popup */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 bg-card border border-border rounded-lg shadow-2xl backdrop-blur-xl"
                style={{
                  left: isSidebarExpanded ? `${EXPANDED_WIDTH + 20}px` : `${COLLAPSED_WIDTH + 20}px`,
                  top: '16px',
                  width: '280px',
                }}
              >
                {/* User Email */}
                <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
                  {user?.email}
                </div>

                {/* Workspaces List */}
                <div className="px-3 py-3 max-h-[400px] overflow-y-auto">
                  <div className="space-y-0.5">
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace._id}
                        onClick={() => {
                          handleWorkspaceClick(workspace);
                          setIsWorkspaceSwitcherOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 rounded-md transition-all text-left px-2 py-1.5",
                          isWorkspaceActive(workspace._id)
                            ? "bg-muted/70 text-foreground"
                            : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                        )}
                      >
                        <div className="w-5 h-5 bg-[#9ACD32] rounded flex items-center justify-center text-neutral-900 text-xs font-semibold flex-shrink-0">
                          {workspace.name?.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-normal truncate flex-1">
                          {workspace.name}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Add New Workspace */}
                  <button
                    onClick={() => {
                      handleCreateWorkspace();
                      setIsWorkspaceSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 rounded-md transition-all text-left mt-2 px-2 py-1.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground border-t border-border pt-3"
                  >
                    <PlusIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-normal text-[#9ACD32]">
                      New workspace
                    </span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Floating Right Actions */}
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <button
            onClick={toggleAgentSidebar}
            className="p-2 rounded-lg bg-card border border-border shadow-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all"
            aria-label="Toggle AI Assistant"
            title="AI Assistant (MrMorris)"
          >
            <SparklesIcon className="w-5 h-5" />
          </button>
          <div className="bg-card border border-border shadow-lg rounded-lg p-1">
            <ThemeToggle />
          </div>
        </div>

        {/* Sidebar - Always visible */}
        <aside
          className={cn(
            "fixed top-0 left-0 bottom-0 bg-card/95 backdrop-blur-xl border-r border-border z-30 overflow-hidden shadow-xl transition-all duration-200 ease-out"
          )}
          style={{
            width: isSidebarExpanded ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px`
          }}
        >
          <div className="h-full w-full">
            <SidebarContent isExpanded={isSidebarExpanded} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="min-h-screen">
          <div
            className="min-h-screen transition-all duration-200 ease-out"
            style={{
              marginLeft: isSidebarExpanded ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
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
