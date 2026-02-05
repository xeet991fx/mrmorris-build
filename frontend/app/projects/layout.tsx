"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  ArrowRightStartOnRectangleIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
  BellIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  ViewColumnsIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
  EyeIcon,
  RocketLaunchIcon,
  EnvelopeOpenIcon,
  DocumentDuplicateIcon,
  AtSymbolIcon,
  InboxStackIcon,
  PhoneArrowDownLeftIcon,
  CalendarDaysIcon,
  BoltIcon,
  CheckCircleIcon,
  TicketIcon,
  ChartBarSquareIcon,
  PresentationChartLineIcon,
  CurrencyDollarIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { cn } from "@/lib/utils";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AIChatPanel } from "@/components/chat/AIChatPanel";

// Navigation items with unique icons
const NAV_SECTIONS = {
  crm: {
    label: "CRM",
    items: [
      { label: "Dashboard", icon: HomeIcon, path: "dashboard" },
      { label: "Contacts", icon: UserGroupIcon, path: "contacts" },
      { label: "Companies", icon: BuildingOffice2Icon, path: "companies" },
      { label: "Pipelines", icon: ViewColumnsIcon, path: "pipelines" },
      // { label: "Proposals", icon: DocumentTextIcon, path: "proposals" },
    ],
  },
  marketing: {
    label: "Marketing",
    items: [
      { label: "Forms", icon: ClipboardDocumentListIcon, path: "forms" },
      { label: "Pages", icon: GlobeAltIcon, path: "pages" },
      { label: "Visitors", icon: EyeIcon, path: "visitors" },
      { label: "Campaigns", icon: RocketLaunchIcon, path: "campaigns" },
      { label: "Sequences", icon: EnvelopeOpenIcon, path: "sequences" },
      { label: "Templates", icon: DocumentDuplicateIcon, path: "email-templates" },
    ],
  },
  communication: {
    label: "Communication",
    items: [
      { label: "Email Account", icon: AtSymbolIcon, path: "email-accounts" },
      { label: "Inbox", icon: InboxStackIcon, path: "inbox" },
      { label: "Calls", icon: PhoneArrowDownLeftIcon, path: "calls" },
      { label: "Meetings", icon: CalendarDaysIcon, path: "meetings" },
    ],
  },
  automation: {
    label: "Automation",
    items: [
      // LEGACY AGENT BUILDER - ARCHIVED 2026-02-04 - Uncomment to restore
      // { label: "Agents", icon: CpuChipIcon, path: "agents" },
      { label: "Workflows", icon: BoltIcon, path: "workflows" },
      { label: "Tasks", icon: CheckCircleIcon, path: "tasks" },
      { label: "Tickets", icon: TicketIcon, path: "tickets" },
    ],
  },
  analytics: {
    label: "Analytics",
    items: [
      { label: "Reports", icon: ChartBarSquareIcon, path: "reports" },
      { label: "Analytics", icon: PresentationChartLineIcon, path: "analytics" },
      { label: "Forecasting", icon: CurrencyDollarIcon, path: "forecasting" },
    ],
  },
};

// Mobile bottom nav items
const MOBILE_NAV_ITEMS = [
  { label: "Home", icon: HomeIcon, path: "dashboard" },
  { label: "Contacts", icon: UserGroupIcon, path: "contacts" },
  { label: "Pipelines", icon: ViewColumnsIcon, path: "pipelines" },
  { label: "Tasks", icon: CheckCircleIcon, path: "tasks" },
  { label: "Menu", icon: Bars3BottomLeftIcon, path: null },
];

// Sample notifications - replace with real data
const SAMPLE_NOTIFICATIONS = [
  { id: 1, title: "New lead assigned", description: "John Doe from Acme Inc", time: "2m ago", unread: true },
  { id: 2, title: "Meeting reminder", description: "Team sync in 30 minutes", time: "28m ago", unread: true },
  { id: 3, title: "Task completed", description: "Follow-up with Smith Corp", time: "1h ago", unread: false },
];

function WorkspacesLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { workspaces, fetchWorkspaces, setCurrentWorkspace } = useWorkspaceStore();

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarExpanded');
      return saved ? JSON.parse(saved) : false; // Default to collapsed
    }
    return false;
  });

  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);

  const sidebarNavRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (sidebarNavRef.current) {
      sidebarNavRef.current.scrollTop = scrollPositionRef.current;
    }
  }, [pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(e.target as Node)) {
        setIsWorkspaceMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleWorkspaceClick = (workspace: any) => {
    setCurrentWorkspace(workspace);
    router.push(`/projects/${workspace._id}`);
    setIsWorkspaceMenuOpen(false);
  };

  const isPathActive = (path: string) => pathname.includes(`/${path}`);

  const isInsideWorkspace = pathname.startsWith('/projects/') && pathname !== '/projects';
  const currentWorkspaceFromUrl = isInsideWorkspace
    ? workspaces.find(w => pathname.includes(w._id))
    : null;

  const COLLAPSED_WIDTH = 64;
  const EXPANDED_WIDTH = 240;
  const unreadCount = notifications.filter(n => n.unread).length;

  // Navigation Item
  const NavItem = ({ item, workspaceId }: { item: any; workspaceId: string }) => {
    const isActive = isPathActive(item.path);
    const Icon = item.icon;
    const [isHovered, setIsHovered] = useState(false);
    const itemRef = useRef<HTMLDivElement>(null);
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

    const handleMouseEnter = () => {
      if (!isSidebarExpanded && itemRef.current) {
        const rect = itemRef.current.getBoundingClientRect();
        setTooltipPos({
          top: rect.top + rect.height / 2,
          left: COLLAPSED_WIDTH + 8
        });
        setIsHovered(true);
      }
    };

    return (
      <Link href={`/projects/${workspaceId}/${item.path}`} scroll={false} onClick={() => setIsMobileMenuOpen(false)}>
        <motion.div
          ref={itemRef}
          whileHover={{ x: 2 }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "relative flex items-center gap-2 py-1.5 rounded-lg transition-all duration-150 group cursor-pointer",
            isSidebarExpanded ? "px-2.5" : "px-0 justify-center",
            isActive
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          <Icon className="w-[15px] h-[15px] flex-shrink-0" strokeWidth={1.5} />
          {isSidebarExpanded && (
            <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden">
              {item.label}
            </span>
          )}
        </motion.div>

        {/* Tooltip for collapsed state - using fixed position to escape overflow */}
        {isHovered && !isSidebarExpanded && (
          <div
            className="fixed px-2.5 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded-md whitespace-nowrap z-[100] shadow-lg pointer-events-none"
            style={{
              left: tooltipPos.left,
              top: tooltipPos.top,
              transform: 'translateY(-50%)'
            }}
          >
            {item.label}
          </div>
        )}
      </Link>
    );
  };

  // Section Component
  const NavSection = ({ section, workspaceId }: { section: typeof NAV_SECTIONS.crm; workspaceId: string }) => (
    <div className="mb-3">
      <AnimatePresence>
        {isSidebarExpanded && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-2.5 mb-1 text-[9px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider"
          >
            {section.label}
          </motion.p>
        )}
      </AnimatePresence>
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-zinc-900 z-50 lg:hidden shadow-2xl flex flex-col"
              >
                {/* Mobile Workspace Header with Close Button */}
                <div className="relative flex-shrink-0">
                  <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                      className="flex-1 flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                        {currentWorkspaceFromUrl?.name?.charAt(0).toUpperCase() || "W"}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                          {currentWorkspaceFromUrl?.name || "Workspace"}
                        </p>
                        <p className="text-[9px] text-zinc-400 truncate">{user?.email}</p>
                      </div>
                      <motion.div
                        animate={{ rotate: isWorkspaceMenuOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                      </motion.div>
                    </button>
                    <button
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="p-3 text-zinc-400 hover:text-zinc-600 border-l border-zinc-100 dark:border-zinc-800"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Dropdown Content */}
                  <AnimatePresence>
                    {isWorkspaceMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b border-zinc-100 dark:border-zinc-800"
                      >
                        {/* Workspaces List */}
                        <div className="py-2 px-3 max-h-40 overflow-y-auto">
                          <p className="px-2 py-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Workspaces</p>
                          {workspaces.map((workspace) => (
                            <button
                              key={workspace._id}
                              onClick={() => { handleWorkspaceClick(workspace); setIsWorkspaceMenuOpen(false); setIsMobileMenuOpen(false); }}
                              className={cn(
                                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                                pathname.includes(workspace._id)
                                  ? "bg-emerald-50 dark:bg-emerald-900/20"
                                  : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold",
                                pathname.includes(workspace._id)
                                  ? "bg-emerald-500 text-white"
                                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                              )}>
                                {workspace.name?.charAt(0).toUpperCase()}
                              </div>
                              <span className={cn(
                                "text-[13px] font-medium truncate flex-1",
                                pathname.includes(workspace._id)
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-zinc-700 dark:text-zinc-200"
                              )}>
                                {workspace.name}
                              </span>
                              {pathname.includes(workspace._id) && (
                                <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </button>
                          ))}
                        </div>

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-3" />

                        {/* Quick Actions */}
                        <div className="py-2 px-3">
                          <button
                            onClick={() => { router.push("/projects"); setIsWorkspaceMenuOpen(false); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            New Workspace
                          </button>
                        </div>

                        <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-3" />

                        {/* Settings & Logout */}
                        <div className="py-2 px-3">
                          {currentWorkspaceFromUrl && (
                            <Link href={`/projects/${currentWorkspaceFromUrl._id}/settings`} onClick={() => { setIsWorkspaceMenuOpen(false); setIsMobileMenuOpen(false); }}>
                              <div className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
                                <Cog6ToothIcon className="w-3.5 h-3.5" />
                                Settings
                              </div>
                            </Link>
                          )}
                          <button
                            onClick={() => { handleLogout(); setIsWorkspaceMenuOpen(false); setIsMobileMenuOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                          >
                            <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" />
                            Log out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto p-3">
                  {isInsideWorkspace && currentWorkspaceFromUrl && (
                    <>
                      {Object.values(NAV_SECTIONS).map((section, i) => (
                        <NavSection key={i} section={section} workspaceId={currentWorkspaceFromUrl._id} />
                      ))}
                    </>
                  )}
                </div>

                {/* Footer with Notifications */}
                <div className="border-t border-zinc-100 dark:border-zinc-800 p-3 flex-shrink-0 relative">
                  <button
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg relative"
                  >
                    <div className="relative">
                      <BellIcon className="w-[15px] h-[15px]" strokeWidth={1.5} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    Notifications
                  </button>

                  {/* Mobile Notifications Panel */}
                  <AnimatePresence>
                    {isNotificationsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                          <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">Notifications</p>
                          <button onClick={() => setIsNotificationsOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-6 text-center text-sm text-zinc-400">No notifications</div>
                          ) : (
                            notifications.map((notif) => (
                              <div
                                key={notif.id}
                                className={cn(
                                  "px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0",
                                  notif.unread && "bg-emerald-50/50 dark:bg-emerald-900/10"
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {notif.unread && <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-medium text-zinc-900 dark:text-white">{notif.title}</p>
                                    <p className="text-[11px] text-zinc-500 truncate">{notif.description}</p>
                                    <p className="text-[9px] text-zinc-400 mt-0.5">{notif.time}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Desktop Sidebar */}
        <motion.aside
          animate={{ width: isSidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-0 left-0 bottom-0 z-30 hidden lg:flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800"
        >
          {/* Workspace Header with Dropdown */}
          <div ref={workspaceMenuRef} className="relative">
            <button
              onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
              className={cn(
                "w-full flex items-center gap-2 h-12 border-b border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                isSidebarExpanded ? "px-3" : "px-0 justify-center"
              )}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex-shrink-0">
                {currentWorkspaceFromUrl?.name?.charAt(0).toUpperCase() || "W"}
              </div>
              <AnimatePresence>
                {isSidebarExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex-1 text-left min-w-0 overflow-hidden"
                  >
                    <p className="text-[13px] font-semibold text-zinc-900 dark:text-white truncate">
                      {currentWorkspaceFromUrl?.name || "Workspace"}
                    </p>
                    <p className="text-[9px] text-zinc-400 truncate">{user?.email}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              {isSidebarExpanded && (
                <motion.div
                  animate={{ rotate: isWorkspaceMenuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="w-4 h-4 text-zinc-400" />
                </motion.div>
              )}
            </button>

            {/* Workspace Dropdown Menu */}
            <AnimatePresence>
              {isWorkspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute left-0 right-0 top-full bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-lg z-50 overflow-hidden"
                >
                  {/* Workspaces List */}
                  <div className="py-1.5 px-1.5 max-h-48 overflow-y-auto">
                    <p className="px-2 py-0.5 text-[9px] font-semibold text-zinc-400 uppercase tracking-wider">Workspaces</p>
                    {workspaces.map((workspace) => (
                      <button
                        key={workspace._id}
                        onClick={() => handleWorkspaceClick(workspace)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                          pathname.includes(workspace._id)
                            ? "bg-emerald-50 dark:bg-emerald-900/20"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold",
                          pathname.includes(workspace._id)
                            ? "bg-emerald-500 text-white"
                            : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                        )}>
                          {workspace.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className={cn(
                          "text-[13px] font-medium truncate flex-1",
                          pathname.includes(workspace._id)
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-700 dark:text-zinc-200"
                        )}>
                          {workspace.name}
                        </span>
                        {pathname.includes(workspace._id) && (
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-1.5" />

                  {/* Quick Actions */}
                  <div className="py-1.5 px-1.5">
                    <button
                      onClick={() => { router.push("/projects"); setIsWorkspaceMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                      New Workspace
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-1.5" />

                  {/* Settings & Logout */}
                  <div className="py-1.5 px-1.5">
                    {currentWorkspaceFromUrl && (
                      <Link href={`/projects/${currentWorkspaceFromUrl._id}/settings`} onClick={() => setIsWorkspaceMenuOpen(false)}>
                        <div className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md transition-colors">
                          <Cog6ToothIcon className="w-3.5 h-3.5" />
                          Settings
                        </div>
                      </Link>
                    )}
                    <button
                      onClick={() => { handleLogout(); setIsWorkspaceMenuOpen(false); }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                    >
                      <ArrowRightStartOnRectangleIcon className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div
            ref={sidebarNavRef}
            onScroll={(e) => { scrollPositionRef.current = e.currentTarget.scrollTop; }}
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden py-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
              isSidebarExpanded ? "px-2" : "px-1.5"
            )}
          >
            {isInsideWorkspace && currentWorkspaceFromUrl && (
              <>
                {Object.values(NAV_SECTIONS).map((section, i) => (
                  <NavSection key={i} section={section} workspaceId={currentWorkspaceFromUrl._id} />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "border-t border-zinc-100 dark:border-zinc-800 py-2",
            isSidebarExpanded ? "px-2" : "px-1.5"
          )}>
            {/* Notifications */}
            <div ref={notificationsRef} className="relative mb-2">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  "w-full flex items-center gap-2 py-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors relative",
                  isSidebarExpanded ? "px-2.5" : "px-0 justify-center"
                )}
              >
                <div className="relative">
                  <BellIcon className="w-[15px] h-[15px]" strokeWidth={1.5} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {isSidebarExpanded && (
                  <span className="text-[13px] font-medium whitespace-nowrap overflow-hidden">
                    Notifications
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden"
                    style={{ width: isSidebarExpanded ? EXPANDED_WIDTH : 200 }}
                  >
                    <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <p className="text-[13px] font-semibold text-zinc-900 dark:text-white">Notifications</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-zinc-400">No notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              "px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0",
                              notif.unread && "bg-emerald-50/50 dark:bg-emerald-900/10"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {notif.unread && <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-emerald-500 flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-zinc-900 dark:text-white">{notif.title}</p>
                                <p className="text-[11px] text-zinc-500 truncate">{notif.description}</p>
                                <p className="text-[9px] text-zinc-400 mt-0.5">{notif.time}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toggle Button */}
            <button
              onClick={toggleSidebar}
              className={cn(
                "w-full flex items-center gap-2 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors",
                isSidebarExpanded ? "px-2.5" : "px-0 justify-center"
              )}
            >
              <motion.div animate={{ rotate: isSidebarExpanded ? 0 : 180 }} transition={{ duration: 0.2 }}>
                <Bars3BottomLeftIcon className="w-[15px] h-[15px]" strokeWidth={1.5} />
              </motion.div>
              {isSidebarExpanded && (
                <span className="text-[13px] whitespace-nowrap overflow-hidden">
                  Collapse
                </span>
              )}
            </button>
          </div>
        </motion.aside>

        {/* Mobile Bottom Navigation */}
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
                      className="flex flex-col items-center justify-center flex-1 h-full text-zinc-400"
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
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
                      isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                    )}
                  >
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                    <span className={cn("text-[10px] mt-0.5", isActive && "font-semibold")}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}

        {/* Main Content */}
        <main className="h-screen">
          <motion.div
            animate={{
              marginLeft: typeof window !== 'undefined' && window.innerWidth >= 1024
                ? (isSidebarExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH)
                : 0
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full bg-white dark:bg-zinc-900 overflow-y-auto pb-14 lg:pb-0"
          >
            {children}
          </motion.div>
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
