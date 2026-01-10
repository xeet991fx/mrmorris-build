"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  CodeBracketIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id as string;

  const settingsNavItems = [
    {
      name: "Account",
      href: `/projects/${workspaceId}/settings`,
      icon: UserCircleIcon,
      match: (path: string) => path === `/projects/${workspaceId}/settings`,
    },
    {
      name: "Team",
      href: `/projects/${workspaceId}/settings/team`,
      icon: UserGroupIcon,
      match: (path: string) => path.includes('/settings/team'),
    },
    {
      name: "Tracking",
      href: `/projects/${workspaceId}/settings/tracking`,
      icon: CodeBracketIcon,
      match: (path: string) => path.includes('/settings/tracking'),
    },
    {
      name: "Integrations",
      href: `/projects/${workspaceId}/settings/integrations`,
      icon: Cog6ToothIcon,
      match: (path: string) => path.includes('/settings/integrations'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="flex">
        {/* Settings Sidebar - Clean, borderless design */}
        <aside className="w-72 min-h-screen bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-sm">
          <div className="p-6">
            {/* Header with smooth entrance */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="mb-8"
            >
              <button
                onClick={() => router.push(`/projects/${workspaceId}`)}
                className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-all duration-300 mb-6"
              >
                <motion.div
                  whileHover={{ x: -3 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </motion.div>
                <span className="group-hover:translate-x-0.5 transition-transform duration-300">Back to Dashboard</span>
              </button>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Settings
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Manage your account and workspace
              </p>
            </motion.div>

            {/* Navigation - Clean, minimal styling */}
            <nav className="space-y-1.5">
              {settingsNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.match(pathname);

                return (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.05 + 0.1,
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-left relative overflow-hidden group",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {/* Active indicator - subtle glow line */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-full"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}

                    {/* Hover background */}
                    <div className={cn(
                      "absolute inset-0 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-r from-primary/10 to-transparent"
                        : "bg-transparent group-hover:bg-muted/40"
                    )} />

                    <Icon className={cn(
                      "w-5 h-5 flex-shrink-0 relative z-10 transition-transform duration-300",
                      isActive && "text-primary"
                    )} />
                    <span className={cn(
                      "text-sm relative z-10 transition-all duration-300",
                      isActive && "font-medium"
                    )}>
                      {item.name}
                    </span>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
