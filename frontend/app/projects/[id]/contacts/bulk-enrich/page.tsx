"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRightIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function BulkEnrichPage() {
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
        <button
          onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Contacts
        </button>
        <ChevronRightIcon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-foreground font-medium">Bulk Enrich</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Bulk Enrich Contacts
        </h1>
        <p className="text-sm text-muted-foreground">
          Enrich multiple contacts at once with Apollo.io data
        </p>
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="rounded-lg border border-border bg-card/50 p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Coming Soon</h3>
              <p className="text-sm text-muted-foreground mb-4">
                The bulk enrichment feature is currently under development. Once available,
                you&apos;ll be able to:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Select multiple contacts for enrichment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Filter contacts by missing data (email, phone, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Preview credit cost before enriching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Track enrichment progress in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>View detailed results and success rate</span>
                </li>
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/projects/${workspaceId}/settings/apollo`)}
                  className="text-sm text-primary hover:underline"
                >
                  Configure Apollo Settings →
                </button>
                <button
                  onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
                  className="text-sm text-primary hover:underline"
                >
                  View Contacts →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alternative: Use EnrichButton */}
        <div className="mt-6 rounded-lg border border-border bg-card/50 p-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Enrich Individual Contacts
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            In the meantime, you can enrich contacts one at a time using the &quot;Enrich with
            Apollo&quot; button on individual contact pages.
          </p>
          <button
            onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
            className="text-sm text-primary hover:underline"
          >
            Go to Contacts →
          </button>
        </div>
      </motion.div>
    </div>
  );
}
