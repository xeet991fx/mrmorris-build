"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  RocketLaunchIcon,
  InboxIcon,
  AtSymbolIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  PresentationChartBarIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  EyeIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { AIChatPanel } from "@/components/chat/AIChatPanel";

// Navigation items configuration
const NAV_SECTIONS = {
  crm: {
    label: "CRM",
    items: [
      { label: "Dashboard", icon: HomeIcon, path: "dashboard" },
      { label: "Contacts", icon: UserGroupIcon, path: "contacts" },
      { label: "Companies", icon: BuildingOffice2Icon, path: "companies" },
      { label: "Pipelines", icon: Squares2X2Icon, path: "pipelines" },
      { label: "Proposals", icon: DocumentTextIcon, path: "proposals" },
    ],
  },
  marketing: {
    label: "Marketing",
    items: [
      { label: "Forms", icon: ClipboardDocumentListIcon, path: "forms" },
      { label: "Pages", icon: GlobeAltIcon, path: "pages" },
      { label: "Visitors", icon: EyeIcon, path: "visitors" },
      { label: "Campaigns", icon: RocketLaunchIcon, path: "campaigns" },
      { label: "Sequences", icon: EnvelopeIcon, path: "sequences" },
      { label: "Templates", icon: EnvelopeIcon, path: "email-templates" },
    ],
  },
  communication: {
    label: "Communication",
    items: [
      { label: "Email Account", icon: AtSymbolIcon, path: "email-accounts" },
      { label: "Inbox", icon: InboxIcon, path: "inbox" },
      { label: "Calls", icon: PhoneIcon, path: "calls" },
      { label: "Meetings", icon: CalendarDaysIcon, path: "meetings" },
    ],
  },
  automation: {
    label: "Automation",
    items: [
      { label: "Workflows", icon: RocketLaunchIcon, path: "workflows" },
      { label: "Tasks", icon: ClipboardDocumentListIcon, path: "tasks" },
      { label: "Tickets", icon: ClipboardDocumentListIcon, path: "tickets" },
    ],
  },
  analytics: {
    label: "Analytics",
    items: [
      { label: "Reports", icon: ChartBarIcon, path: "reports" },
      { label: "Analytics", icon: PresentationChartBarIcon, path: "analytics" },
      { label: "Forecasting", icon: CurrencyDollarIcon, path: "forecasting" },
    ],
  },
};

// Quick access items for mobile bottom nav
const MOBILE_NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, path: "dashboard" },
  { label: "Contacts", icon: UserGroupIcon, path: "contacts" },
  { label: "Pipelines", icon: Squares2X2Icon, path: "pipelines" },
  { label: "Tasks", icon: ClipboardDocumentListIcon, path: "tasks" },
  { label: "More", icon: Bars3Icon, path: null },
];

function WorkspacesLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpanded');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [isWorkspaceSwitcherOpen, setIsWorkspaceSwitcherOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('sidebarExpanded', JSON.stringify(isSidebarExpanded));
  }, [isSidebarExpanded]);

  const toggleSidebar = () => setIsSidebarExpanded(!isSidebarExpanded);

  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        await fetchWorkspaces();
      } catch (error) {
        console.error("Failed to fetch workspaces:", error);
      }
    };
    loadWorkspaces();
  }, []);

  // Restore sidebar scroll position after pathname changes
  useEffect(() => {
    if (sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleWorkspaceClick = (workspace: any) => {
    setCurrentWorkspace(workspace);
    router.push(`/projects/${workspace._id}`);
  };

  const isPathActive = (path: string) => pathname.includes(`/${path}`);

  const isInsideWorkspace = pathname.startsWith('/projects/') && pathname !== '/projects';
  const currentWorkspaceFromUrl = isInsideWorkspace
    ? workspaces.find(w => pathname.includes(w._id))
    : null;

  const COLLAPSED_WIDTH = 56;
  const EXPANDED_WIDTH = 240;

  // Navigation Item Component
  const NavItem = ({ item, workspaceId }: { item: any; workspaceId: string }) => {
    const isActive = isPathActive(item.path);
    const Icon = item.icon;

    return (
      <Link href={`/projects/${workspaceId}/${item.path}`} scroll={false} onClick={() => setIsMobileMenuOpen(false)}>
        <div
          className={cn(
            "flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all duration-150 group cursor-pointer",
            isSidebarExpanded ? "" : "justify-center",
            isActive
              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          )}
        >
          <Icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-emerald-500")} />
          {isSidebarExpanded && (
            <span className={cn("text-[13px] font-medium", isActive && "text-emerald-600 dark:text-emerald-400")}>
              {item.label}
            </span>
          )}
        </div>
      </Link>
    );
  };

  // Section Component
  const NavSection = ({ section, workspaceId }: { section: typeof NAV_SECTIONS.crm; workspaceId: string }) => (
    <div className="mb-4">
      {isSidebarExpanded && (
        <p className="px-2.5 mb-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
          {section.label}
        </p>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => (
          <NavItem key={item.path} item={item} workspaceId={workspaceId} />
        ))}
      </div>
    </div>
  );

  return (
    <>
      <CommandPalette />
      <AIChatPanel />
      <Toaster position="top-right" />

      <div className="min-h-screen bg-white dark:bg-zinc-900">
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 z-50 lg:hidden shadow-xl"
              >
                {/* Mobile Menu Header */}
                <div className="flex items-center justify-between px-4 h-14 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Image src="/Clianta-logo-removebg-preview.png" alt="Logo" width={28} height={28} className="object-contain" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                      {currentWorkspaceFromUrl?.name || "Workspace"}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 -m-2 text-zinc-400 hover:text-zinc-600"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Menu Content */}
                <div className="flex-1 overflow-y-auto py-3 px-2">
                  {isInsideWorkspace && currentWorkspaceFromUrl && (
                    <>
                      <NavSection section={NAV_SECTIONS.crm} workspaceId={currentWorkspaceFromUrl._id} />
                      <NavSection section={NAV_SECTIONS.marketing} workspaceId={currentWorkspaceFromUrl._id} />
                      <NavSection section={NAV_SECTIONS.communication} workspaceId={currentWorkspaceFromUrl._id} />
                      <NavSection section={NAV_SECTIONS.automation} workspaceId={currentWorkspaceFromUrl._id} />
                      <NavSection section={NAV_SECTIONS.analytics} workspaceId={currentWorkspaceFromUrl._id} />
                    </>
                  )}
                </div>

                {/* Mobile Menu Footer */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 p-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Workspace Switcher Dropdown */}
        <AnimatePresence>
          {isWorkspaceSwitcherOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={() => setIsWorkspaceSwitcherOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="fixed z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl"
                style={{
                  left: isSidebarExpanded ? `${EXPANDED_WIDTH + 8}px` : `${COLLAPSED_WIDTH + 8}px`,
                  top: '8px',
                  width: '220px',
                }}
              >
                <div className="px-3 py-2 text-xs text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
                  {user?.email}
                </div>
                <div className="py-1.5 max-h-[280px] overflow-y-auto">
                  {workspaces.map((workspace) => (
                    <button
                      key={workspace._id}
                      onClick={() => {
                        handleWorkspaceClick(workspace);
                        setIsWorkspaceSwitcherOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                        pathname.includes(workspace._id)
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                      <div className="w-5 h-5 rounded bg-emerald-500 flex items-center justify-center text-white text-[10px] font-semibold">
                        {workspace.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium truncate">{workspace.name}</span>
                    </button>
                  ))}
                </div>
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-1.5">
                  <button
                    onClick={() => {
                      router.push("/projects");
                      setIsWorkspaceSwitcherOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    New workspace
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar - Hidden on mobile */}
        <aside
          className={cn(
            "fixed top-0 left-0 bottom-0 z-30 transition-all duration-200 ease-out hidden lg:block",
            "bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800"
          )}
          style={{ width: isSidebarExpanded ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px` }}
        >
          <div className="h-full flex flex-col">
            {/* Workspace Header */}
            <div className={cn(
              "h-12 flex items-center border-b border-zinc-200 dark:border-zinc-800",
              isSidebarExpanded ? "px-3" : "px-1.5 justify-center"
            )}>
              <button
                onClick={() => setIsWorkspaceSwitcherOpen(!isWorkspaceSwitcherOpen)}
                className={cn(
                  "flex items-center gap-2 p-1.5 -m-1 rounded-lg transition-colors",
                  isSidebarExpanded ? "hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full" : ""
                )}
              >
                <div className="w-7 h-7 flex items-center justify-center flex-shrink-0">
                  <Image src="/Clianta-logo-removebg-preview.png" alt="Logo" width={28} height={28} className="object-contain" />
                </div>
                {isSidebarExpanded && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {currentWorkspaceFromUrl?.name || "Workspace"}
                      </p>
                    </div>
                    <ChevronDownIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                  </>
                )}
              </button>
            </div>

            {/* Navigation */}
            <div
              ref={sidebarNavRef}
              onScroll={(e) => { scrollPositionRef.current = e.currentTarget.scrollTop; }}
              className={cn(
                "flex-1 overflow-y-auto py-3",
                isSidebarExpanded ? "px-2" : "px-1.5"
              )}
            >
              {isInsideWorkspace && currentWorkspaceFromUrl && (
                <>
                  <NavSection section={NAV_SECTIONS.crm} workspaceId={currentWorkspaceFromUrl._id} />
                  <NavSection section={NAV_SECTIONS.marketing} workspaceId={currentWorkspaceFromUrl._id} />
                  <NavSection section={NAV_SECTIONS.communication} workspaceId={currentWorkspaceFromUrl._id} />
                  <NavSection section={NAV_SECTIONS.automation} workspaceId={currentWorkspaceFromUrl._id} />
                  <NavSection section={NAV_SECTIONS.analytics} workspaceId={currentWorkspaceFromUrl._id} />

                  {/* Settings */}
                  <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <Link href={`/projects/${currentWorkspaceFromUrl._id}/settings`} scroll={false}>
                      <div
                        className={cn(
                          "flex items-center gap-2.5 py-2 px-2.5 rounded-lg transition-all duration-150",
                          isSidebarExpanded ? "" : "justify-center",
                          isPathActive("settings")
                            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        )}
                      >
                        <Cog6ToothIcon className="w-4 h-4" />
                        {isSidebarExpanded && <span className="text-[13px] font-medium">Settings</span>}
                      </div>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className={cn(
              "border-t border-zinc-200 dark:border-zinc-800",
              isSidebarExpanded ? "p-2" : "p-1.5"
            )}>
              {/* Notifications */}
              <div className={cn(
                "flex items-center gap-2 py-2 px-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer",
                !isSidebarExpanded && "justify-center"
              )}>
                <NotificationBell />
                {isSidebarExpanded && <span className="text-[13px] font-medium">Notifications</span>}
              </div>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={cn(
                  "w-full flex items-center gap-2 py-2 px-2.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  !isSidebarExpanded && "justify-center"
                )}
              >
                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                {isSidebarExpanded && <span className="text-[13px] font-medium">Log out</span>}
              </button>

              {/* Collapse Toggle */}
              <button
                onClick={toggleSidebar}
                className={cn(
                  "w-full flex items-center gap-2 py-2 px-2.5 mt-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                  !isSidebarExpanded && "justify-center"
                )}
              >
                {isSidebarExpanded ? (
                  <>
                    <ChevronLeftIcon className="w-4 h-4" />
                    <span className="text-[13px]">Collapse</span>
                  </>
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Bottom Navigation - Only visible on small screens */}
        {isInsideWorkspace && currentWorkspaceFromUrl && (
          <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 safe-area-pb">
            <div className="flex items-center justify-around h-14">
              {MOBILE_NAV_ITEMS.map((item) => {
                const isActive = item.path ? isPathActive(item.path) : false;
                const Icon = item.icon;

                if (item.path === null) {
                  return (
                    <button
                      key={item.label}
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="flex flex-col items-center justify-center flex-1 h-full text-zinc-500"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-[10px] mt-0.5">{item.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={item.path}
                    href={`/projects/${currentWorkspaceFromUrl._id}/${item.path}`}
                    scroll={false}
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 h-full",
                      isActive ? "text-emerald-600 dark:text-emerald-400" : "text-zinc-500"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", isActive && "text-emerald-500")} />
                    <span className={cn("text-[10px] mt-0.5", isActive && "font-medium")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="h-screen">
          <div
            className={cn(
              "h-full bg-white dark:bg-zinc-900 transition-all duration-200 ease-out overflow-y-auto",
              "pb-14 lg:pb-0", // Padding for mobile bottom nav
              isSidebarExpanded ? "lg:ml-[240px]" : "lg:ml-[56px]"
            )}
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
