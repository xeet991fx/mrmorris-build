"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronRightIcon, EnvelopeIcon, SparklesIcon } from "@heroicons/react/24/outline";
import IntegrationCard from "@/components/settings/IntegrationCard";
import EmailIntegrationSection from "@/components/settings/EmailIntegrationSection";
import ApolloIntegrationSection from "@/components/settings/ApolloIntegrationSection";

export default function IntegrationsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [expandedSections, setExpandedSections] = useState({
    email: true,
    apollo: false,
  });

  const toggleSection = (section: "email" | "apollo") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

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
        <span className="text-foreground font-medium">Integrations</span>
      </motion.div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect and manage your third-party integrations
        </p>
      </motion.div>

      {/* Integration Cards */}
      <div className="space-y-4 max-w-5xl">
        {/* Email Integration Card */}
        <IntegrationCard
          title="Email Integration"
          description="Connect your Gmail to automatically sync emails and track conversations with contacts"
          icon={
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <EnvelopeIcon className="w-7 h-7 text-white" />
            </div>
          }
          status="not-connected"
          isExpanded={expandedSections.email}
          onToggle={() => toggleSection("email")}
          delay={0.1}
        >
          <EmailIntegrationSection workspaceId={workspaceId} />
        </IntegrationCard>

        {/* Apollo.io Integration Card */}
        <IntegrationCard
          title="Apollo.io"
          description="Enrich contacts with business emails, verify email addresses, and access 250M+ contacts"
          icon={
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
          }
          status="not-connected"
          isExpanded={expandedSections.apollo}
          onToggle={() => toggleSection("apollo")}
          delay={0.2}
        >
          <ApolloIntegrationSection workspaceId={workspaceId} />
        </IntegrationCard>
      </div>
    </div>
  );
}
