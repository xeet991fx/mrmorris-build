"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRightIcon, ChartBarIcon } from "@heroicons/react/24/outline";

export default function ApolloUsagePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  return (
    <div className="min-h-screen bg-background px-8 pt-14 pb-8">
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-5 flex items-center gap-2 text-sm"
      >
        <button
          onClick={() => router.push(`/projects/${workspaceId}`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">Apollo Usage</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Apollo Credits Usage
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your Apollo.io credit consumption and usage patterns
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Credits Remaining</span>
            <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">-</div>
          <p className="text-xs text-muted-foreground mt-1">Configure Apollo to see usage</p>
        </div>

        <div className="rounded-lg border border-border bg-card/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Used This Month</span>
            <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">-</div>
          <p className="text-xs text-muted-foreground mt-1">No data available yet</p>
        </div>

        <div className="rounded-lg border border-border bg-card/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-muted-foreground">Reset Date</span>
            <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">-</div>
          <p className="text-xs text-muted-foreground mt-1">Next billing cycle</p>
        </div>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4">
            The Apollo usage dashboard is currently under development. Once you start using
            Apollo enrichment features, you'll see detailed analytics here including:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Monthly credit usage breakdown</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Usage by action type (enrichment, search, verification)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Top users consuming credits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Recent activity log</span>
            </li>
          </ul>
          <button
            onClick={() => router.push(`/projects/${workspaceId}/settings/apollo`)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Go to Apollo Settings →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
