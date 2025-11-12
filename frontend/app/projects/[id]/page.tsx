"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ClipboardDocumentCheckIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  MegaphoneIcon,
  SparklesIcon,
  TagIcon,
  FireIcon,
  Cog6ToothIcon,
  PencilIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { useProjectStore } from "@/store/useProjectStore";
import OnboardingWizard from "@/components/projects/OnboardingWizard";
import { format } from "date-fns";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { currentProject, fetchProject, isLoading } = useProjectStore();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Memoize project to prevent unnecessary rerenders
  const stableProject = useMemo(() => currentProject, [currentProject?._id]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const loadProject = async () => {
      try {
        await fetchProject(projectId);
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch project:", error);
          setIsInitialLoading(false);
          // Error toast already shown by store
        }
      }
    };

    loadProject();

    return () => {
      cancelled = true; // Cancel pending operations
    };
  }, [projectId]); // Remove fetchProject from deps

  if (isInitialLoading || !currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  const onboardingData = currentProject.onboardingData;
  const isOnboardingComplete = currentProject.onboardingCompleted;

  // Calculate completion percentage
  const calculateProgress = () => {
    if (!onboardingData || typeof onboardingData !== 'object') return 0;

    const sections = [
      onboardingData.business,
      onboardingData.goals,
      onboardingData.channels,
      onboardingData.brand,
      onboardingData.offer,
      onboardingData.competition,
      onboardingData.advanced,
    ];

    // Helper to check if section has meaningful data
    const hasData = (section: any) => {
      if (!section || typeof section !== 'object') return false;
      const keys = Object.keys(section);
      return keys.length > 0 && keys.some(key => {
        const value = section[key];
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object' && value !== null) {
          return Object.keys(value).length > 0;
        }
        return value !== undefined && value !== null && value !== '';
      });
    };

    const completed = sections.filter(hasData).length;
    return Math.round((completed / 7) * 100);
  };

  const progress = calculateProgress();

  return (
    <>
      <div className="min-h-screen p-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex items-center gap-2 text-sm"
        >
          <button
            onClick={() => router.push("/projects")}
            className="text-slate-400 hover:text-white transition-colors"
          >
            Projects
          </button>
          <ChevronRightIcon className="w-4 h-4 text-slate-600" />
          <span className="text-white font-medium">{currentProject.name}</span>
        </motion.div>

        {!isOnboardingComplete ? (
          /* Onboarding Incomplete State */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center min-h-[500px]"
          >
            <div className="max-w-2xl w-full">
              <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ClipboardDocumentCheckIcon className="w-10 h-10 text-violet-400" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-3">
                  Complete Your Project Setup
                </h2>
                <p className="text-slate-400 mb-8 text-lg">
                  Help us understand your business better by completing a quick
                  onboarding process. This will enable autonomous marketing
                  features.
                </p>

                {progress > 0 && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-400">Progress</span>
                      <span className="text-sm font-medium text-violet-400">
                        {progress}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-violet-500 to-purple-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setIsWizardOpen(true)}
                    className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-violet-500/25 transition-all transform hover:scale-105"
                  >
                    {progress > 0 ? "Continue Setup" : "Start Setup"}
                  </button>
                  <button
                    onClick={() => router.push("/projects")}
                    className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg font-medium transition-all"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Onboarding Complete State */
          <div>
            {/* Project Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 flex items-start justify-between"
            >
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  {currentProject.name}
                </h1>
                <p className="text-slate-400">
                  Created {format(new Date(currentProject.createdAt), "MMMM d, yyyy")}
                </p>
              </div>
              <button
                onClick={() => setIsWizardOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 hover:text-white rounded-lg font-medium transition-all"
              >
                <PencilIcon className="w-4 h-4" />
                Edit Setup
              </button>
            </motion.div>

            {/* Overview Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {/* Business Overview Card */}
              {onboardingData?.business && (
                <OverviewCard
                  icon={BuildingOfficeIcon}
                  title="Business Overview"
                  color="violet"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow label="Business Name" value={onboardingData.business.name} />
                  <DataRow label="Stage" value={onboardingData.business.stage} />
                  <DataRow label="Region" value={onboardingData.business.region} />
                  <DataRow
                    label="Description"
                    value={onboardingData.business.description}
                    multiline
                  />
                </OverviewCard>
              )}

              {/* Goals & Metrics Card */}
              {onboardingData?.goals && (
                <OverviewCard
                  icon={ChartBarIcon}
                  title="Goals & Metrics"
                  color="blue"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow label="Primary Goal" value={onboardingData.goals.primary} />
                  <DataRow
                    label="Budget"
                    value={
                      onboardingData.goals.budget
                        ? `$${onboardingData.goals.budget.toLocaleString()}`
                        : undefined
                    }
                  />
                  <DataRow label="Timeline" value={onboardingData.goals.timeline} />
                </OverviewCard>
              )}

              {/* Channels Card */}
              {onboardingData?.channels && (
                <OverviewCard
                  icon={MegaphoneIcon}
                  title="Marketing Channels"
                  color="cyan"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow
                    label="Preferred Channels"
                    value={onboardingData.channels.preferred?.join(", ")}
                  />
                  <DataRow
                    label="Tools Used"
                    value={onboardingData.channels.tools?.join(", ")}
                  />
                  <DataRow
                    label="Past Experience"
                    value={onboardingData.channels.past_experience}
                  />
                </OverviewCard>
              )}

              {/* Brand Card */}
              {onboardingData?.brand && (
                <OverviewCard
                  icon={SparklesIcon}
                  title="Brand & Messaging"
                  color="pink"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow label="Brand Tone" value={onboardingData.brand.tone} />
                  <DataRow
                    label="Brand Perception"
                    value={onboardingData.brand.perception}
                    multiline
                  />
                  <DataRow
                    label="Unique Value"
                    value={onboardingData.brand.unique_value}
                    multiline
                  />
                </OverviewCard>
              )}

              {/* Offer Card */}
              {onboardingData?.offer && (
                <OverviewCard
                  icon={TagIcon}
                  title="Offer & CTA"
                  color="amber"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow label="Offer Type" value={onboardingData.offer.offer_type} />
                  <DataRow label="Call to Action" value={onboardingData.offer.cta} />
                  <DataRow
                    label="Tracking Setup"
                    value={onboardingData.offer.tracking_setup ? "Yes" : "No"}
                  />
                </OverviewCard>
              )}

              {/* Competition Card */}
              {onboardingData?.competition && (
                <OverviewCard
                  icon={FireIcon}
                  title="Competition & Inspiration"
                  color="red"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow
                    label="Competitors"
                    value={onboardingData.competition.competitors?.join(", ")}
                  />
                  <DataRow
                    label="Inspiration Brands"
                    value={onboardingData.competition.inspiration?.join(", ")}
                  />
                </OverviewCard>
              )}

              {/* Advanced Card */}
              {onboardingData?.advanced && (
                <OverviewCard
                  icon={Cog6ToothIcon}
                  title="Advanced Settings"
                  color="slate"
                  onEdit={() => setIsWizardOpen(true)}
                >
                  <DataRow
                    label="Business Type"
                    value={onboardingData.advanced.business_type}
                  />
                  <DataRow
                    label="Automation Level"
                    value={onboardingData.advanced.automation_level}
                  />
                  {onboardingData.advanced.uploads &&
                    onboardingData.advanced.uploads.length > 0 && (
                      <DataRow
                        label="Documents"
                        value={`${onboardingData.advanced.uploads.length} file(s)`}
                      />
                    )}
                </OverviewCard>
              )}
            </motion.div>
          </div>
        )}
      </div>

      {/* Onboarding Wizard - Always render to prevent unmount/remount */}
      <OnboardingWizard
        isOpen={isWizardOpen && !!stableProject}
        onClose={() => setIsWizardOpen(false)}
        project={stableProject || currentProject}
      />
    </>
  );
}

// Helper Components
interface OverviewCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  color: "violet" | "blue" | "cyan" | "pink" | "amber" | "red" | "slate";
  children: React.ReactNode;
  onEdit: () => void;
}

function OverviewCard({ icon: Icon, title, color, children, onEdit }: OverviewCardProps) {
  const colorClasses = {
    violet: "from-violet-500 to-purple-500",
    blue: "from-blue-500 to-cyan-500",
    cyan: "from-cyan-500 to-teal-500",
    pink: "from-pink-500 to-rose-500",
    amber: "from-amber-500 to-orange-500",
    red: "from-red-500 to-rose-500",
    slate: "from-slate-500 to-slate-600",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-xl p-6 hover:border-violet-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-800/50 text-slate-400 hover:text-white transition-all"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );
}

interface DataRowProps {
  label: string;
  value?: string;
  multiline?: boolean;
}

function DataRow({ label, value, multiline = false }: DataRowProps) {
  if (!value) return null;

  return (
    <div className={multiline ? "space-y-1" : "flex items-start justify-between gap-4"}>
      <span className="text-sm text-slate-500 flex-shrink-0">{label}</span>
      <span className={`text-sm text-slate-300 ${multiline ? "" : "text-right"}`}>
        {value}
      </span>
    </div>
  );
}
