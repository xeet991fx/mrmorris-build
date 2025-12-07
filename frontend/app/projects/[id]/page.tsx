"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ChevronRightIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  FireIcon,
} from "@heroicons/react/24/outline";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { getContacts } from "@/lib/api/contact";
import { getCompanies } from "@/lib/api/company";
import { getPipelines } from "@/lib/api/pipeline";
import { getOpportunities } from "@/lib/api/opportunity";
import { format } from "date-fns";
import { useAgentContextSync } from "@/lib/hooks/useAgentContextSync";

interface DashboardStats {
  contacts: {
    total: number;
    active: number;
    leads: number;
    customers: number;
  };
  companies: {
    total: number;
    active: number;
  };
  pipelines: {
    total: number;
    totalOpportunities: number;
    totalValue: number;
    hotDeals: number;
  };
}

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const { currentWorkspace, fetchWorkspace, isLoading } = useWorkspaceStore();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Sync agent context
  useAgentContextSync(currentWorkspace?.name, "dashboard");

  useEffect(() => {
    if (!workspaceId) return;

    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        await fetchWorkspace(workspaceId);
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch workspace:", error);
          setIsInitialLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [workspaceId, fetchWorkspace]);

  // Fetch dashboard stats
  useEffect(() => {
    if (!workspaceId || isInitialLoading) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        // Use allSettled to handle individual failures gracefully
        const [contactsRes, companiesRes, pipelinesRes, opportunitiesRes] = await Promise.allSettled([
          getContacts(workspaceId, { limit: 1000 }),
          getCompanies(workspaceId, { limit: 1000 }),
          getPipelines(workspaceId),
          getOpportunities(workspaceId, { limit: 1000 }),
        ]);

        // Extract data with fallbacks for failed requests
        const contacts = contactsRes.status === 'fulfilled' ? (contactsRes.value.data?.contacts || []) : [];
        const companies = companiesRes.status === 'fulfilled' ? (companiesRes.value.data?.companies || []) : [];
        const pipelines = pipelinesRes.status === 'fulfilled' ? (pipelinesRes.value.data?.pipelines || []) : [];
        const opportunities = opportunitiesRes.status === 'fulfilled' ? (opportunitiesRes.value.data?.opportunities || []) : [];

        // Calculate contact stats
        const contactStats = {
          total: contacts.length,
          active: contacts.filter((c: any) => c.status === "active").length,
          leads: contacts.filter((c: any) => c.status === "lead").length,
          customers: contacts.filter((c: any) => c.status === "customer").length,
        };

        // Calculate company stats
        const companyStats = {
          total: companies.length,
          active: companies.filter((c: any) => c.status === "active").length,
        };

        // Calculate pipeline stats
        const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.value || 0), 0);
        const hotDeals = opportunities.filter((opp: any) => {
          const lastActivity = opp.lastActivityAt ? new Date(opp.lastActivityAt) : null;
          const daysSinceActivity = lastActivity
            ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          return daysSinceActivity <= 3 || (opp.probability && opp.probability >= 70);
        }).length;

        setStats({
          contacts: contactStats,
          companies: companyStats,
          pipelines: {
            total: pipelines.length,
            totalOpportunities: opportunities.length,
            totalValue,
            hotDeals,
          },
        });
      } catch (error) {
        console.error("Failed to fetch dashboard stats:", error);
        // Set empty stats on error so page still renders
        setStats({
          contacts: { total: 0, active: 0, leads: 0, customers: 0 },
          companies: { total: 0, active: 0 },
          pipelines: { total: 0, totalOpportunities: 0, totalValue: 0, hotDeals: 0 },
        });
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [workspaceId, isInitialLoading]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  if (isInitialLoading || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-foreground border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  const summaryCards = [
    {
      title: "Contacts",
      icon: UserGroupIcon,
      mainStat: stats?.contacts.total || 0,
      mainLabel: "Total Contacts",
      subStats: [
        { label: "Active", value: stats?.contacts.active || 0, color: "text-green-400" },
        { label: "Leads", value: stats?.contacts.leads || 0, color: "text-blue-400" },
        { label: "Customers", value: stats?.contacts.customers || 0, color: "text-purple-400" },
      ],
      bgGradient: "from-blue-500/20 to-cyan-500/20",
      iconColor: "text-blue-400",
      onClick: () => router.push(`/projects/${workspaceId}/contacts`),
    },
    {
      title: "Companies",
      icon: BuildingOffice2Icon,
      mainStat: stats?.companies.total || 0,
      mainLabel: "Total Companies",
      subStats: [
        { label: "Active", value: stats?.companies.active || 0, color: "text-green-400" },
      ],
      bgGradient: "from-purple-500/20 to-pink-500/20",
      iconColor: "text-purple-400",
      onClick: () => router.push(`/projects/${workspaceId}/companies`),
    },
    {
      title: "Pipelines",
      icon: ChartBarIcon,
      mainStat: stats?.pipelines.total || 0,
      mainLabel: "Active Pipelines",
      subStats: [
        { label: "Opportunities", value: stats?.pipelines.totalOpportunities || 0, color: "text-yellow-400" },
        { label: "Hot Deals", value: stats?.pipelines.hotDeals || 0, color: "text-red-400", icon: FireIcon },
      ],
      bgGradient: "from-orange-500/20 to-yellow-500/20",
      iconColor: "text-orange-400",
      onClick: () => router.push(`/projects/${workspaceId}/pipelines`),
    },
    {
      title: "Pipeline Value",
      icon: CurrencyDollarIcon,
      mainStat: formatCurrency(stats?.pipelines.totalValue || 0),
      mainLabel: "Total Deal Value",
      subStats: [
        { label: "Deals", value: stats?.pipelines.totalOpportunities || 0, color: "text-green-400" },
      ],
      bgGradient: "from-green-500/20 to-emerald-500/20",
      iconColor: "text-green-400",
      onClick: () => router.push(`/projects/${workspaceId}/pipelines`),
      isValue: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background px-8 pt-14 pb-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-5 flex items-center gap-2 text-sm"
      >
        <button
          onClick={() => router.push("/projects")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Workspaces
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">{currentWorkspace.name}</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of your workspace • Created {format(new Date(currentWorkspace.createdAt), "MMMM d, yyyy")}
        </p>
      </motion.div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={card.onClick}
            className={`
              relative overflow-hidden rounded-xl border border-border 
              bg-gradient-to-br ${card.bgGradient} backdrop-blur-sm
              p-5 cursor-pointer group hover:border-neutral-600 transition-all
              hover:shadow-lg hover:scale-[1.02]
            `}
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-lg bg-neutral-800/50 flex items-center justify-center mb-4 ${card.iconColor}`}>
              <card.icon className="w-5 h-5" />
            </div>

            {/* Main Stat */}
            <div className="mb-3">
              <div className={`text-3xl font-bold text-foreground ${statsLoading ? 'animate-pulse' : ''}`}>
                {statsLoading ? "..." : card.isValue ? card.mainStat : card.mainStat.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">{card.mainLabel}</div>
            </div>

            {/* Sub Stats */}
            <div className="flex flex-wrap gap-3">
              {card.subStats.map((sub) => (
                <div key={sub.label} className="flex items-center gap-1">
                  {'icon' in sub && sub.icon && <sub.icon className={`w-3 h-3 ${sub.color}`} />}
                  <span className={`text-sm font-medium ${sub.color}`}>
                    {statsLoading ? "-" : sub.value}
                  </span>
                  <span className="text-xs text-muted-foreground">{sub.label}</span>
                </div>
              ))}
            </div>

            {/* Hover Arrow */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRightIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-neutral-600 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/30 transition-colors">
              <UserGroupIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Manage Contacts</div>
              <div className="text-xs text-muted-foreground">Add, edit, or import contacts</div>
            </div>
          </button>

          <button
            onClick={() => router.push(`/projects/${workspaceId}/companies`)}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-neutral-600 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/30 transition-colors">
              <BuildingOffice2Icon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Manage Companies</div>
              <div className="text-xs text-muted-foreground">Organize your business accounts</div>
            </div>
          </button>

          <button
            onClick={() => router.push(`/projects/${workspaceId}/pipelines`)}
            className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-card hover:border-neutral-600 transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/30 transition-colors">
              <ChartBarIcon className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium text-foreground">Manage Pipelines</div>
              <div className="text-xs text-muted-foreground">Track deals and opportunities</div>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
