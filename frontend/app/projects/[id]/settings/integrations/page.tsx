"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { EnvelopeIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import IntegrationCard from "@/components/settings/IntegrationCard";
import EmailIntegrationSection from "@/components/settings/EmailIntegrationSection";
import ApolloIntegrationSection from "@/components/settings/ApolloIntegrationSection";
import CalendarIntegrationSection from "@/components/settings/CalendarIntegrationSection";

// Apollo.io Logo Component
const ApolloLogo = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-7 h-7">
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

  return (
    <div className="min-h-screen bg-background px-8 pt-14 pb-8">
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

        {/* Calendar Integration Card */}
        <IntegrationCard
          title="Google Calendar"
          description="Sync your calendar to track meetings, schedule events, and prepare for calls"
          icon={
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CalendarDaysIcon className="w-7 h-7 text-white" />
            </div>
          }
          status="not-connected"
          isExpanded={expandedSections.calendar}
          onToggle={() => toggleSection("calendar")}
          delay={0.15}
        >
          <CalendarIntegrationSection workspaceId={workspaceId} />
        </IntegrationCard>

        {/* Apollo.io Integration Card */}
        <IntegrationCard
          title="Apollo.io"
          description="Enrich contacts with business emails, verify email addresses, and access 250M+ contacts"
          icon={
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <ApolloLogo />
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
