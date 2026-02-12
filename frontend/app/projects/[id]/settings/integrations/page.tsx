"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import EmailIntegrationSection from "@/components/settings/EmailIntegrationSection";
import ApolloIntegrationSection from "@/components/settings/ApolloIntegrationSection";
import CalendarIntegrationSection from "@/components/settings/CalendarIntegrationSection";
import LinkedInIntegrationSection from "@/components/settings/LinkedInIntegrationSection";
import {
  getEmailIntegrations,
  EmailIntegration,
} from "@/lib/api/emailIntegration";
import { getCalendarIntegrations, CalendarIntegration } from "@/lib/api/calendarIntegration";
import { getLinkedInStatus, LinkedInStatus } from "@/lib/api/linkedinIntegration";
import { getApolloSettings } from "@/lib/api/apolloSettings";

// Integration Icons
const GmailIcon = () => (
  <svg viewBox="0 0 48 48" className="w-10 h-10">
    <rect width="48" height="48" rx="6" fill="white" />
    <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
    <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
    <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
    <path fill="#c62828" d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z" />
    <path fill="#fbc02d" d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0 C43.076,8,45,9.924,45,12.298z" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 48 48" className="w-10 h-10">
    <rect width="22" height="22" x="13" y="13" fill="#fff" />
    <polygon fill="#1e88e5" points="25.68,20.92 26.688,22.36 28.272,21.208 28.272,29.56 30,29.56 30,18.616 28.56,18.616" />
    <path fill="#1e88e5" d="M22.943,23.745c0.625-0.574,1.013-1.37,1.013-2.249c0-1.747-1.533-3.168-3.417-3.168 c-1.602,0-2.972,1.009-3.33,2.453l1.657,0.421c0.165-0.664,0.868-1.146,1.673-1.146c0.942,0,1.709,0.646,1.709,1.44 c0,0.794-0.767,1.44-1.709,1.44h-0.997v1.728h0.997c1.081,0,1.993,0.751,1.993,1.64c0,0.904-0.866,1.64-1.931,1.64 c-0.962,0-1.784-0.61-1.914-1.418L17,26.802c0.262,1.636,1.81,2.87,3.6,2.87c2.007,0,3.64-1.511,3.64-3.368 C24.24,25.281,23.736,24.363,22.943,23.745z" />
    <polygon fill="#fbc02d" points="34,42 14,42 13,38 14,34 34,34 35,38" />
    <polygon fill="#4caf50" points="38,35 42,34 42,14 38,13 34,14 34,34" />
    <path fill="#1e88e5" d="M34,14l1-4l-1-4H9C7.343,6,6,7.343,6,9v25l4,1l4-1V14H34z" />
    <polygon fill="#e53935" points="34,34 34,42 42,34" />
    <path fill="#1565c0" d="M39,6h-5v8h8V9C42,7.343,40.657,6,39,6z" />
    <path fill="#1565c0" d="M9,42h5v-8H6v5C6,40.657,7.343,42,9,42z" />
  </svg>
);

const ApolloIcon = () => (
  <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="4" fill="#000000" />
    <path d="M12 4L14.5 9.5L20 12L14.5 14.5L12 20L9.5 14.5L4 12L9.5 9.5L12 4Z" fill="#EBF212" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 382 382" className="w-10 h-10" fill="#0077B7">
    <path d="M347.445,0H34.555C15.471,0,0,15.471,0,34.555v312.889C0,366.529,15.471,382,34.555,382h312.889C366.529,382,382,366.529,382,347.444V34.555C382,15.471,366.529,0,347.445,0z M118.207,329.844c0,5.554-4.502,10.056-10.056,10.056H65.345c-5.554,0-10.056-4.502-10.056-10.056V150.403c0-5.554,4.502-10.056,10.056-10.056h42.806c5.554,0,10.056,4.502,10.056,10.056V329.844z M86.748,123.432c-22.459,0-40.666-18.207-40.666-40.666S64.289,42.1,86.748,42.1s40.666,18.207,40.666,40.666S109.208,123.432,86.748,123.432z M341.91,330.654c0,5.106-4.14,9.246-9.246,9.246H286.73c-5.106,0-9.246-4.14-9.246-9.246v-84.168c0-12.556,3.683-55.021-32.813-55.021c-28.309,0-34.051,29.066-35.204,42.11v97.079c0,5.106-4.139,9.246-9.246,9.246h-44.426c-5.106,0-9.246-4.14-9.246-9.246V149.593c0-5.106,4.14-9.246,9.246-9.246h44.426c5.106,0,9.246,4.14,9.246,9.246v15.655c10.497-15.753,26.097-27.912,59.312-27.912c73.552,0,73.131,68.716,73.131,106.472L341.91,330.654L341.91,330.654z" />
  </svg>
);

export default function IntegrationsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Status states
  const [emailIntegrations, setEmailIntegrations] = useState<EmailIntegration[]>([]);
  const [calendarIntegrations, setCalendarIntegrations] = useState<CalendarIntegration[]>([]);
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatus | null>(null);
  const [apolloConnected, setApolloConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllStatuses();
  }, [workspaceId]);

  const loadAllStatuses = async () => {
    setLoading(true);

    // Load Gmail status
    const emailResult = await getEmailIntegrations(workspaceId);
    if (emailResult.success) {
      setEmailIntegrations(emailResult.data.integrations);
    }

    // Load Calendar status
    const calendarResult = await getCalendarIntegrations(workspaceId);
    if (calendarResult.success) {
      setCalendarIntegrations(calendarResult.data.integrations);
    }

    // Load LinkedIn status
    const linkedInResult = await getLinkedInStatus(workspaceId);
    if (linkedInResult.success && linkedInResult.data) {
      setLinkedInStatus(linkedInResult.data);
    }

    // Load Apollo status
    const apolloResult = await getApolloSettings(workspaceId);
    if (apolloResult.success && apolloResult.data?.apiKey) {
      setApolloConnected(true);
    }

    setLoading(false);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const isGmailConnected = emailIntegrations.length > 0 && emailIntegrations[0].status === 'Connected';
  const isCalendarConnected = calendarIntegrations.length > 0 && calendarIntegrations[0].isActive;
  const isLinkedInConnected = linkedInStatus?.connected || false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-foreground mb-1">Connectors</h1>
              <p className="text-sm text-muted-foreground">
                Allow Clianta to reference other apps and services for more context.
              </p>
            </div>
            <Button variant="outline" className="gap-2">
              Browse connectors
            </Button>
          </div>
        </div>
      </div>

      {/* Integrations List */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="space-y-0 border border-border rounded-lg bg-card overflow-hidden">
          {/* Gmail */}
          <div className="border-b border-border">
            <button
              onClick={() => toggleSection('gmail')}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <GmailIcon />
                <div className="text-left">
                  <h3 className="text-base font-medium text-foreground">Gmail</h3>
                  {isGmailConnected && <p className="text-sm text-muted-foreground">Interactive</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isGmailConnected ? (
                  <span className="text-sm text-blue-500 font-medium">Connected</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not connected</span>
                )}
                <motion.div
                  animate={{ rotate: expandedSection === 'gmail' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {expandedSection === 'gmail' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-border bg-muted/20">
                    <EmailIntegrationSection workspaceId={workspaceId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Google Calendar */}
          <div className="border-b border-border">
            <button
              onClick={() => toggleSection('calendar')}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <CalendarIcon />
                <div className="text-left">
                  <h3 className="text-base font-medium text-foreground">Google Calendar</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isCalendarConnected ? (
                  <span className="text-sm text-blue-500 font-medium">Connected</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not connected</span>
                )}
                <motion.div
                  animate={{ rotate: expandedSection === 'calendar' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {expandedSection === 'calendar' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-border bg-muted/20">
                    <CalendarIntegrationSection workspaceId={workspaceId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Apollo.io */}
          <div className="border-b border-border">
            <button
              onClick={() => toggleSection('apollo')}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <ApolloIcon />
                <div className="text-left">
                  <h3 className="text-base font-medium text-foreground">Apollo.io</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {apolloConnected ? (
                  <span className="text-sm text-blue-500 font-medium">Connected</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not connected</span>
                )}
                <motion.div
                  animate={{ rotate: expandedSection === 'apollo' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {expandedSection === 'apollo' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-border bg-muted/20">
                    <ApolloIntegrationSection workspaceId={workspaceId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* LinkedIn */}
          <div>
            <button
              onClick={() => toggleSection('linkedin')}
              className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <LinkedInIcon />
                <div className="text-left">
                  <h3 className="text-base font-medium text-foreground">LinkedIn</h3>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {isLinkedInConnected ? (
                  <span className="text-sm text-blue-500 font-medium">Connected</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Not connected</span>
                )}
                <motion.div
                  animate={{ rotate: expandedSection === 'linkedin' ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </div>
            </button>
            <AnimatePresence>
              {expandedSection === 'linkedin' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 border-t border-border bg-muted/20">
                    <LinkedInIntegrationSection workspaceId={workspaceId} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Add Custom Connector */}
        <div className="mt-6">
          <Button variant="outline" className="gap-2">
            <PlusIcon className="w-4 h-4" />
            Add custom connector
          </Button>
        </div>
      </div>
    </div>
  );
}
