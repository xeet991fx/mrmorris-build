"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { EnvelopeIcon, CalendarDaysIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import IntegrationCard from "@/components/settings/IntegrationCard";
import EmailIntegrationSection from "@/components/settings/EmailIntegrationSection";
import ApolloIntegrationSection from "@/components/settings/ApolloIntegrationSection";
import CalendarIntegrationSection from "@/components/settings/CalendarIntegrationSection";

// Apollo.io Logo Component
const ApolloLogo = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6">
    <path
      d="M100 20L180 60V140L100 180L20 140V60L100 20Z"
      fill="white"
      fillOpacity="0.95"
    />
    <path
      d="M100 45L85 80H75L100 30L125 80H115L100 45Z"
      fill="#6B46C1"
    />
    <path
      d="M70 85H130L135 100H65L70 85Z"
      fill="#6B46C1"
    />
    <path
      d="M60 105H140V120H60V105Z"
      fill="#6B46C1"
    />
    <path
      d="M75 125H90V155H75V125Z"
      fill="#6B46C1"
    />
    <path
      d="M110 125H125V155H110V125Z"
      fill="#6B46C1"
    />
  </svg>
);

export default function IntegrationsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [expandedSections, setExpandedSections] = useState({
    email: true,
    apollo: false,
    calendar: false,
  });

  const toggleSection = (section: "email" | "apollo" | "calendar") => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 30 }
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="px-8 pt-8 pb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
            <Cog6ToothIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Integrations</h1>
            <p className="text-sm text-muted-foreground">
              Connect and manage your third-party services
            </p>
          </div>
        </div>
      </motion.div>

      {/* Integration Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-8 pb-8 space-y-4 max-w-4xl"
      >
        {/* Email Integration Card */}
        <motion.div variants={itemVariants}>
          <IntegrationCard
            title="Email Integration"
            description="Connect your Gmail to sync emails and track conversations"
            icon={
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <EnvelopeIcon className="w-6 h-6 text-white" />
              </div>
            }
            status="not-connected"
            isExpanded={expandedSections.email}
            onToggle={() => toggleSection("email")}
          >
            <EmailIntegrationSection workspaceId={workspaceId} />
          </IntegrationCard>
        </motion.div>

        {/* Calendar Integration Card */}
        <motion.div variants={itemVariants}>
          <IntegrationCard
            title="Google Calendar"
            description="Sync your calendar to track meetings and schedule events"
            icon={
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
            }
            status="not-connected"
            isExpanded={expandedSections.calendar}
            onToggle={() => toggleSection("calendar")}
          >
            <CalendarIntegrationSection workspaceId={workspaceId} />
          </IntegrationCard>
        </motion.div>

        {/* Apollo.io Integration Card */}
        <motion.div variants={itemVariants}>
          <IntegrationCard
            title="Apollo.io"
            description="Enrich contacts with business data and 250M+ verified emails"
            icon={
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <ApolloLogo />
              </div>
            }
            status="not-connected"
            isExpanded={expandedSections.apollo}
            onToggle={() => toggleSection("apollo")}
          >
            <ApolloIntegrationSection workspaceId={workspaceId} />
          </IntegrationCard>
        </motion.div>
      </motion.div>
    </div>
  );
}
