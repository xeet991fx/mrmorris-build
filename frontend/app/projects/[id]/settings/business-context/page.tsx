"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  SparklesIcon,
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  MegaphoneIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  getBusinessProfile,
  updateBusinessProfile,
  getBusinessProfileAIContext,
  BusinessProfile,
  BusinessProfileUpdateData,
} from "@/lib/api/businessProfile";

// Options for dropdowns
const INDUSTRY_OPTIONS = [
  { value: "saas", label: "SaaS / Software" },
  { value: "real_estate", label: "Real Estate" },
  { value: "recruiting", label: "Recruiting / Staffing" },
  { value: "consulting", label: "Consulting" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "financial", label: "Financial Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "education", label: "Education" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "other", label: "Other" },
];

const COMPANY_SIZE_OPTIONS = [
  { value: "1-10", label: "1-10 employees" },
  { value: "11-50", label: "11-50 employees" },
  { value: "51-200", label: "51-200 employees" },
  { value: "201-500", label: "201-500 employees" },
  { value: "501-1000", label: "501-1000 employees" },
  { value: "1000+", label: "1000+ employees" },
];

const SALES_MODEL_OPTIONS = [
  { value: "b2b", label: "B2B" },
  { value: "b2c", label: "B2C" },
  { value: "b2b2c", label: "B2B2C" },
  { value: "marketplace", label: "Marketplace" },
];

const SALES_CYCLE_OPTIONS = [
  { value: "short", label: "Short (< 1 week)" },
  { value: "medium", label: "Medium (1-4 weeks)" },
  { value: "long", label: "Long (1-3 months)" },
  { value: "very_long", label: "Very Long (3+ months)" },
];

const DEAL_SIZE_OPTIONS = [
  { value: "<1k", label: "Less than $1K" },
  { value: "1k-10k", label: "$1K - $10K" },
  { value: "10k-50k", label: "$10K - $50K" },
  { value: "50k-100k", label: "$50K - $100K" },
  { value: "100k+", label: "$100K+" },
];

const LEAD_VOLUME_OPTIONS = [
  { value: "<10", label: "Less than 10" },
  { value: "10-50", label: "10-50" },
  { value: "50-100", label: "50-100" },
  { value: "100-500", label: "100-500" },
  { value: "500+", label: "500+" },
];

const PRIMARY_GOAL_OPTIONS = [
  { value: "generate_leads", label: "Generate more leads" },
  { value: "close_deals", label: "Close more deals" },
  { value: "nurture_relationships", label: "Nurture relationships" },
  { value: "automate_processes", label: "Automate processes" },
  { value: "improve_conversion", label: "Improve conversion" },
  { value: "scale_operations", label: "Scale operations" },
];

const TEAM_SIZE_OPTIONS = [
  { value: "solo", label: "Solo (just me)" },
  { value: "small", label: "Small (2-5)" },
  { value: "medium", label: "Medium (6-20)" },
  { value: "large", label: "Large (20+)" },
];

const CHANNEL_OPTIONS = [
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "social", label: "Social Media" },
  { key: "ads", label: "Paid Ads" },
  { key: "content", label: "Content Marketing" },
  { key: "events", label: "Events" },
];

export default function BusinessContextPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [aiContext, setAIContext] = useState<string>("");

  const [profile, setProfile] = useState<BusinessProfileUpdateData>({
    industry: "",
    industrySpecific: "",
    companySize: "",
    companyName: "",
    website: "",
    salesCycle: "",
    averageDealSize: "",
    monthlyLeadVolume: "",
    primaryGoal: "",
    salesModel: "",
    teamSize: "",
    targetAudience: {
      jobTitles: [],
      industries: [],
      companySize: [],
      geography: [],
    },
    painPoints: [],
    keyMetrics: [],
    channels: {
      email: false,
      phone: false,
      social: false,
      ads: false,
      content: false,
      events: false,
    },
    leadSources: [],
  });

  // Temporary input states for array fields
  const [tempJobTitle, setTempJobTitle] = useState("");
  const [tempIndustry, setTempIndustry] = useState("");
  const [tempGeography, setTempGeography] = useState("");
  const [tempPainPoint, setTempPainPoint] = useState("");
  const [tempMetric, setTempMetric] = useState("");
  const [tempLeadSource, setTempLeadSource] = useState("");

  useEffect(() => {
    loadProfile();
  }, [workspaceId]);

  const loadProfile = async () => {
    setIsLoading(true);
    const result = await getBusinessProfile(workspaceId);
    if (result.success && result.data) {
      setProfile({
        industry: result.data.industry || "",
        industrySpecific: result.data.industrySpecific || "",
        companySize: result.data.companySize || "",
        companyName: result.data.companyName || "",
        website: result.data.website || "",
        salesCycle: result.data.salesCycle || "",
        averageDealSize: result.data.averageDealSize || "",
        monthlyLeadVolume: result.data.monthlyLeadVolume || "",
        primaryGoal: result.data.primaryGoal || "",
        salesModel: result.data.salesModel || "",
        teamSize: result.data.teamSize || "",
        targetAudience: result.data.targetAudience || {
          jobTitles: [],
          industries: [],
          companySize: [],
          geography: [],
        },
        painPoints: result.data.painPoints || [],
        keyMetrics: result.data.keyMetrics || [],
        channels: result.data.channels || {
          email: false,
          phone: false,
          social: false,
          ads: false,
          content: false,
          events: false,
        },
        leadSources: result.data.leadSources || [],
      });
    } else if (!result.data) {
      // No profile exists, start in edit mode
      setIsEditing(true);
    }
    setIsLoading(false);
  };

  const loadAIContext = async () => {
    const result = await getBusinessProfileAIContext(workspaceId);
    if (result.success && result.data) {
      setAIContext(result.data.context);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!profile.industry || !profile.salesCycle || !profile.teamSize || !profile.primaryGoal) {
      toast.error("Please fill in all required fields: Industry, Sales Cycle, Team Size, and Primary Goal");
      return;
    }

    setIsSaving(true);
    const result = await updateBusinessProfile(workspaceId, profile);
    if (result.success) {
      toast.success("Business profile saved successfully");
      setIsEditing(false);
      loadAIContext();
    } else {
      toast.error(result.error || "Failed to save profile");
    }
    setIsSaving(false);
  };

  const addToArray = (
    field: "jobTitles" | "industries" | "geography",
    value: string,
    setValue: (v: string) => void
  ) => {
    if (!value.trim()) return;
    setProfile((prev) => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: [...(prev.targetAudience?.[field] || []), value.trim()],
      },
    }));
    setValue("");
  };

  const removeFromArray = (field: "jobTitles" | "industries" | "geography", index: number) => {
    setProfile((prev) => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        [field]: prev.targetAudience?.[field]?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const addToRootArray = (
    field: "painPoints" | "keyMetrics" | "leadSources",
    value: string,
    setValue: (v: string) => void
  ) => {
    if (!value.trim()) return;
    setProfile((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), value.trim()],
    }));
    setValue("");
  };

  const removeFromRootArray = (field: "painPoints" | "keyMetrics" | "leadSources", index: number) => {
    setProfile((prev) => ({
      ...prev,
      [field]: prev[field]?.filter((_, i) => i !== index) || [],
    }));
  };

  const toggleChannel = (channel: keyof typeof profile.channels) => {
    setProfile((prev) => ({
      ...prev,
      channels: {
        ...prev.channels,
        [channel]: !prev.channels?.[channel],
      },
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="px-8 pt-8 pb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Business Context</h1>
              <p className="text-sm text-muted-foreground">
                Tell AI about your business for personalized responses
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    loadAIContext();
                    setShowAIPreview(!showAIPreview);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-all duration-300"
                >
                  <EyeIcon className="w-4 h-4" />
                  AI Preview
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all duration-300"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setIsEditing(false);
                    loadProfile();
                  }}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 text-foreground rounded-xl text-sm font-medium hover:bg-muted transition-all duration-300"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-all duration-300 disabled:opacity-50"
                >
                  {isSaving ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <CheckIcon className="w-4 h-4" />
                  )}
                  Save Changes
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* AI Preview Modal */}
      <AnimatePresence>
        {showAIPreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-8 mb-6"
          >
            <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <SparklesIcon className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">How AI Sees Your Business</h3>
              </div>
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono bg-background/50 rounded-xl p-4">
                {aiContext || "No business profile configured. AI features will use generic responses."}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="px-8 pb-8"
      >
        <div className="max-w-4xl space-y-6">
          {/* Core Business Info */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <BuildingOfficeIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Core Business Info</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={profile.companyName || ""}
                    onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                    placeholder="Your company name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Website
                  </label>
                  <input
                    type="url"
                    value={profile.website || ""}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Industry *
                  </label>
                  <select
                    value={profile.industry || ""}
                    onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select industry</option>
                    {INDUSTRY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {profile.industry === "other" && (
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Specify Industry
                    </label>
                    <input
                      type="text"
                      value={profile.industrySpecific || ""}
                      onChange={(e) => setProfile({ ...profile, industrySpecific: e.target.value })}
                      disabled={!isEditing}
                      className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="Your industry"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Company Size
                  </label>
                  <select
                    value={profile.companySize || ""}
                    onChange={(e) => setProfile({ ...profile, companySize: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select size</option>
                    {COMPANY_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sales Model
                  </label>
                  <select
                    value={profile.salesModel || ""}
                    onChange={(e) => setProfile({ ...profile, salesModel: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select model</option>
                    {SALES_MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sales & Marketing */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <ChartBarIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Sales & Marketing</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sales Cycle *
                  </label>
                  <select
                    value={profile.salesCycle || ""}
                    onChange={(e) => setProfile({ ...profile, salesCycle: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select cycle</option>
                    {SALES_CYCLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Average Deal Size
                  </label>
                  <select
                    value={profile.averageDealSize || ""}
                    onChange={(e) => setProfile({ ...profile, averageDealSize: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select size</option>
                    {DEAL_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Monthly Lead Volume
                  </label>
                  <select
                    value={profile.monthlyLeadVolume || ""}
                    onChange={(e) => setProfile({ ...profile, monthlyLeadVolume: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select volume</option>
                    {LEAD_VOLUME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Primary Goal *
                  </label>
                  <select
                    value={profile.primaryGoal || ""}
                    onChange={(e) => setProfile({ ...profile, primaryGoal: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select goal</option>
                    {PRIMARY_GOAL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Team Size *
                  </label>
                  <select
                    value={profile.teamSize || ""}
                    onChange={(e) => setProfile({ ...profile, teamSize: e.target.value })}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground disabled:opacity-60"
                  >
                    <option value="">Select size</option>
                    {TEAM_SIZE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Target Audience */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <UserGroupIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Target Audience</h2>
              </div>

              <div className="space-y-5">
                {/* Job Titles */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Target Job Titles
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempJobTitle}
                      onChange={(e) => setTempJobTitle(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addToArray("jobTitles", tempJobTitle, setTempJobTitle)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., CEO, CTO, VP Sales"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToArray("jobTitles", tempJobTitle, setTempJobTitle)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.targetAudience?.jobTitles?.map((title, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-sm rounded-lg"
                      >
                        {title}
                        {isEditing && (
                          <button onClick={() => removeFromArray("jobTitles", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target Industries */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Target Industries
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempIndustry}
                      onChange={(e) => setTempIndustry(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addToArray("industries", tempIndustry, setTempIndustry)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., Technology, Healthcare"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToArray("industries", tempIndustry, setTempIndustry)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.targetAudience?.industries?.map((ind, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/10 text-blue-600 text-sm rounded-lg"
                      >
                        {ind}
                        {isEditing && (
                          <button onClick={() => removeFromArray("industries", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Geography */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Target Geography
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempGeography}
                      onChange={(e) => setTempGeography(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addToArray("geography", tempGeography, setTempGeography)}
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., North America, Europe"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToArray("geography", tempGeography, setTempGeography)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.targetAudience?.geography?.map((geo, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/10 text-green-600 text-sm rounded-lg"
                      >
                        {geo}
                        {isEditing && (
                          <button onClick={() => removeFromArray("geography", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Channels & Lead Sources */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <MegaphoneIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Channels & Lead Sources</h2>
              </div>

              <div className="space-y-5">
                {/* Preferred Channels */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Preferred Channels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNEL_OPTIONS.map((channel) => (
                      <button
                        key={channel.key}
                        onClick={() => isEditing && toggleChannel(channel.key as keyof typeof profile.channels)}
                        disabled={!isEditing}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                          profile.channels?.[channel.key as keyof typeof profile.channels]
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        } ${!isEditing && "cursor-default"}`}
                      >
                        {channel.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lead Sources */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Lead Sources
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempLeadSource}
                      onChange={(e) => setTempLeadSource(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && addToRootArray("leadSources", tempLeadSource, setTempLeadSource)
                      }
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., LinkedIn, Referrals, Website"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToRootArray("leadSources", tempLeadSource, setTempLeadSource)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.leadSources?.map((source, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500/10 text-amber-600 text-sm rounded-lg"
                      >
                        {source}
                        {isEditing && (
                          <button onClick={() => removeFromRootArray("leadSources", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pain Points & Metrics */}
          <motion.div
            variants={itemVariants}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm p-6 shadow-sm hover:shadow-md transition-shadow duration-500"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <ExclamationTriangleIcon className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-lg font-semibold text-foreground">Pain Points & Metrics</h2>
              </div>

              <div className="space-y-5">
                {/* Pain Points */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Customer Pain Points
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempPainPoint}
                      onChange={(e) => setTempPainPoint(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && addToRootArray("painPoints", tempPainPoint, setTempPainPoint)
                      }
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., Long sales cycles, Poor lead quality"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToRootArray("painPoints", tempPainPoint, setTempPainPoint)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.painPoints?.map((point, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-600 text-sm rounded-lg"
                      >
                        {point}
                        {isEditing && (
                          <button onClick={() => removeFromRootArray("painPoints", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Key Metrics You Track
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tempMetric}
                      onChange={(e) => setTempMetric(e.target.value)}
                      onKeyPress={(e) =>
                        e.key === "Enter" && addToRootArray("keyMetrics", tempMetric, setTempMetric)
                      }
                      disabled={!isEditing}
                      className="flex-1 px-4 py-3 bg-background/60 backdrop-blur-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300 text-foreground placeholder:text-muted-foreground disabled:opacity-60"
                      placeholder="e.g., MRR, CAC, LTV, Conversion Rate"
                    />
                    {isEditing && (
                      <button
                        onClick={() => addToRootArray("keyMetrics", tempMetric, setTempMetric)}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {profile.keyMetrics?.map((metric, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-500/10 text-purple-600 text-sm rounded-lg"
                      >
                        {metric}
                        {isEditing && (
                          <button onClick={() => removeFromRootArray("keyMetrics", i)}>
                            <XMarkIcon className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
