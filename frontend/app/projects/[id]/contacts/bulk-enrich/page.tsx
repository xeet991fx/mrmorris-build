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
    <div className="min-h-screen bg-card/95">
      {/* Header */}
      <div className="h-12 px-6 border-b border-border flex items-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3"
        >
          <SparklesIcon className="w-5 h-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Bulk Enrich Contacts</h1>
          <p className="text-xs text-muted-foreground">
            Enrich multiple contacts with Apollo.io
          </p>
        </motion.div>
      </div>

      <div className="px-8 pt-8 pb-8">

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
                  <span className="text-[#9ACD32]">•</span>
                  <span>Select multiple contacts for enrichment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9ACD32]">•</span>
                  <span>Filter contacts by missing data (email, phone, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9ACD32]">•</span>
                  <span>Preview credit cost before enriching</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9ACD32]">•</span>
                  <span>Track enrichment progress in real-time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#9ACD32]">•</span>
                  <span>View detailed results and success rate</span>
                </li>
              </ul>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/projects/${workspaceId}/settings/integrations`)}
                  className="text-sm text-[#9ACD32] hover:underline"
                >
                  Configure Integrations →
                </button>
                <button
                  onClick={() => router.push(`/projects/${workspaceId}/contacts`)}
                  className="text-sm text-[#9ACD32] hover:underline"
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
            className="text-sm text-[#9ACD32] hover:underline"
          >
            Go to Contacts →
          </button>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
