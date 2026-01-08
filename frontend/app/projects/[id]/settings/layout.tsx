"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserCircleIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChevronRightIcon,
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
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Settings Sidebar - Fixed */}
        <aside className="w-64 border-r border-border bg-card/50 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6"
            >
              <button
                onClick={() => router.push(`/projects/${workspaceId}`)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ChevronRightIcon className="w-4 h-4 rotate-180" />
                Back to Dashboard
              </button>
              <h2 className="text-xl font-bold text-foreground">Settings</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your account and workspace settings
              </p>
            </motion.div>

            {/* Navigation */}
            <nav className="space-y-1">
              {settingsNavItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.match(pathname);

                return (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm">{item.name}</span>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
