"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  PlusIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  ChartBarIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ClipboardList, Eye, FileText, Users } from "lucide-react";
import { getForms, deleteForm, createForm, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import Link from "next/link";

// AI-Powered Form Templates
const FORM_TEMPLATES = [
  {
    id: "contact",
    name: "Contact Us Form",
    description: "Simple contact form for inquiries",
    icon: ChatBubbleLeftRightIcon,
    color: "from-blue-400 to-blue-600",
    fields: [
      { id: "name", type: "text" as const, label: "Full Name", required: true, mapToField: "firstName" as const },
      { id: "email", type: "email" as const, label: "Email Address", required: true, mapToField: "email" as const },
      { id: "phone", type: "phone" as const, label: "Phone Number", required: false, mapToField: "phone" as const },
      { id: "subject", type: "select" as const, label: "Subject", required: true, options: ["General Inquiry", "Support Request", "Sales", "Partnership"] },
      { id: "message", type: "textarea" as const, label: "Message", required: true, placeholder: "How can we help you?" },
    ],
  },
  {
    id: "lead-capture",
    name: "Lead Capture Form",
    description: "Capture qualified leads with business info",
    icon: UserGroupIcon,
    color: "from-emerald-400 to-emerald-600",
    fields: [
      { id: "firstName", type: "text" as const, label: "First Name", required: true, width: "half" as const, mapToField: "firstName" as const },
      { id: "lastName", type: "text" as const, label: "Last Name", required: true, width: "half" as const, mapToField: "lastName" as const },
      { id: "email", type: "email" as const, label: "Work Email", required: true, mapToField: "email" as const },
      { id: "company", type: "text" as const, label: "Company Name", required: true, mapToField: "company" as const },
      { id: "jobTitle", type: "text" as const, label: "Job Title", required: false, mapToField: "jobTitle" as const },
      { id: "phone", type: "phone" as const, label: "Phone Number", required: false, mapToField: "phone" as const },
      { id: "companySize", type: "select" as const, label: "Company Size", required: false, options: ["1-10", "11-50", "51-200", "201-500", "500+"] },
      { id: "interest", type: "textarea" as const, label: "What are you interested in?", required: false },
    ],
  },
  {
    id: "demo-request",
    name: "Demo Request Form",
    description: "Schedule product demos with prospects",
    icon: CalendarIcon,
    color: "from-purple-400 to-purple-600",
    fields: [
      { id: "firstName", type: "text" as const, label: "First Name", required: true, width: "half" as const, mapToField: "firstName" as const },
      { id: "lastName", type: "text" as const, label: "Last Name", required: true, width: "half" as const, mapToField: "lastName" as const },
      { id: "email", type: "email" as const, label: "Work Email", required: true, mapToField: "email" as const },
      { id: "company", type: "text" as const, label: "Company Name", required: true, mapToField: "company" as const },
      { id: "phone", type: "phone" as const, label: "Phone Number", required: true, mapToField: "phone" as const },
      { id: "preferredDate", type: "date" as const, label: "Preferred Demo Date", required: false },
      { id: "employeeCount", type: "select" as const, label: "Number of Employees", required: false, options: ["1-10", "11-50", "51-200", "201-1000", "1000+"] },
      { id: "requirements", type: "textarea" as const, label: "Tell us about your requirements", required: false },
    ],
  },
  {
    id: "survey",
    name: "Customer Survey",
    description: "Gather feedback from customers",
    icon: ClipboardDocumentListIcon,
    color: "from-amber-400 to-amber-600",
    fields: [
      { id: "email", type: "email" as const, label: "Email (Optional)", required: false, mapToField: "email" as const },
      { id: "satisfaction", type: "rating" as const, label: "How satisfied are you with our product?", required: true },
      { id: "recommendation", type: "radio" as const, label: "Would you recommend us to a friend?", required: true, options: ["Yes", "No", "Maybe"] },
      { id: "improvements", type: "textarea" as const, label: "What can we improve?", required: false },
      { id: "features", type: "multiselect" as const, label: "Which features do you use most?", required: false, options: ["Feature A", "Feature B", "Feature C", "Feature D"] },
    ],
  },
  {
    id: "newsletter",
    name: "Newsletter Signup",
    description: "Grow your email list",
    icon: EnvelopeIcon,
    color: "from-indigo-400 to-indigo-600",
    fields: [
      { id: "email", type: "email" as const, label: "Email Address", required: true, mapToField: "email" as const },
      { id: "firstName", type: "text" as const, label: "First Name", required: false, mapToField: "firstName" as const },
      { id: "interests", type: "checkbox" as const, label: "I'm interested in", required: false, options: ["Product Updates", "Industry News", "Special Offers", "Events"] },
      { id: "consent", type: "gdpr_consent" as const, label: "Marketing Consent", required: true, gdprSettings: { consentText: "I agree to receive marketing emails", required: true } },
    ],
  },
  {
    id: "job-application",
    name: "Job Application",
    description: "Accept job applications online",
    icon: BriefcaseIcon,
    color: "from-rose-400 to-rose-600",
    fields: [
      { id: "firstName", type: "text" as const, label: "First Name", required: true, width: "half" as const, mapToField: "firstName" as const },
      { id: "lastName", type: "text" as const, label: "Last Name", required: true, width: "half" as const, mapToField: "lastName" as const },
      { id: "email", type: "email" as const, label: "Email Address", required: true, mapToField: "email" as const },
      { id: "phone", type: "phone" as const, label: "Phone Number", required: true, mapToField: "phone" as const },
      { id: "position", type: "select" as const, label: "Position Applying For", required: true, options: ["Software Engineer", "Product Manager", "Designer", "Sales", "Marketing", "Other"] },
      { id: "resume", type: "file" as const, label: "Upload Resume (PDF)", required: true, fileSettings: { maxSize: 5, allowedTypes: ["application/pdf"], multiple: false } },
      { id: "coverLetter", type: "textarea" as const, label: "Cover Letter", required: false },
      { id: "linkedin", type: "url" as const, label: "LinkedIn Profile", required: false },
    ],
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800"
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", color)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
          <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Form Card Component
function FormCard({ form, workspaceId, onDelete }: {
  form: Form;
  workspaceId: string;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className="group rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:shadow-lg hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
    >
      <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="block p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {form.name}
            </h3>
            {form.description && (
              <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{form.description}</p>
            )}
          </div>
          <span className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0",
            form.status === "published" && "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
            form.status === "draft" && "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
            form.status === "archived" && "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
          )}>
            {form.status === "published" && <CheckCircleIcon className="w-3 h-3 inline mr-1" />}
            {form.status}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <EyeIcon className="w-4 h-4 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{form.stats.views.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Views</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <CheckCircleIcon className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{form.stats.submissions.toLocaleString()}</p>
            <p className="text-xs text-zinc-500">Submits</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
            <ChartBarIcon className="w-4 h-4 text-amber-500 mx-auto mb-1" />
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{form.stats.conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-zinc-500">Rate</p>
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 mt-4">
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {form.fields.length} fields
          </span>
          <span className="px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {form.formType === "multi_step" ? "Multi-step" : "Single-step"}
          </span>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 p-4 pt-0">
        <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="flex-1">
          <button className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors">
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
        </Link>
        <Link href={`/projects/${workspaceId}/forms/${form._id}/submissions`}>
          <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="Submissions">
            <ClipboardDocumentListIcon className="w-4 h-4" />
          </button>
        </Link>
        {form.status === "published" && (
          <Link
            href={`/forms/${form._id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors" title="View">
              <EyeIcon className="w-4 h-4" />
            </button>
          </Link>
        )}
        <button
          onClick={(e) => onDelete(form._id, e)}
          className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-500 hover:text-red-600 transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

export default function FormsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  const loadForms = async () => {
    setIsLoading(true);
    try {
      const response = await getForms(workspaceId, selectedStatus === "all" ? undefined : selectedStatus);
      if (response.success) {
        setForms(response.data);
      }
    } catch (error) {
      console.error("Error loading forms:", error);
      toast.error("Failed to load forms");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, [workspaceId, selectedStatus]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm("Are you sure you want to delete this form? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteForm(workspaceId, id);
      toast.success("Form deleted successfully");
      loadForms();
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    }
  };

  const createFromTemplate = async (template: typeof FORM_TEMPLATES[0]) => {
    setCreatingFromTemplate(true);
    try {
      const newForm = {
        name: template.name,
        description: template.description,
        status: "draft" as const,
        formType: "single_step" as const,
        fields: template.fields.map((field, index) => ({
          ...field,
          id: `field_${index}_${Date.now()}`,
        })),
        progressiveProfilingEnabled: false,
        settings: {
          submitButtonText: "Submit",
          successMessage: "Thank you for your submission!",
          autoCreateContact: true,
          theme: "light" as const,
          layout: "vertical" as const,
          labelPosition: "top" as const,
          fieldSpacing: "normal" as const,
          allowMultipleSubmissions: true,
          requireCaptcha: false,
          trackingEnabled: true,
          cookieTracking: true,
        },
        followUpActions: [],
        stats: { views: 0, submissions: 0, conversionRate: 0 },
      };

      const response = await createForm(workspaceId, newForm);
      if (response.success) {
        toast.success(`${template.name} created!`);
        router.push(`/projects/${workspaceId}/forms/${response.data._id}/edit`);
      }
    } catch (error) {
      console.error("Error creating form from template:", error);
      toast.error("Failed to create form");
    } finally {
      setCreatingFromTemplate(false);
    }
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please describe what kind of form you need");
      return;
    }

    setIsGeneratingAI(true);
    setAiReasoning(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/forms/generate-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ formGoal: aiPrompt })
      });

      const data = await response.json();

      if (data.success && data.data) {
        setAiReasoning(data.data.reasoning);

        const newForm = {
          name: data.data.name,
          description: data.data.description,
          status: "draft" as const,
          formType: "single_step" as const,
          fields: data.data.fields.map((field: any, index: number) => ({
            ...field,
            id: `field_${index}_${Date.now()}`,
          })),
          progressiveProfilingEnabled: false,
          settings: {
            submitButtonText: "Submit",
            successMessage: data.data.successMessage || "Thank you for your submission!",
            autoCreateContact: true,
            theme: "light" as const,
            layout: "vertical" as const,
            labelPosition: "top" as const,
            fieldSpacing: "normal" as const,
            allowMultipleSubmissions: true,
            requireCaptcha: false,
            trackingEnabled: true,
            cookieTracking: true,
          },
          followUpActions: [],
          stats: { views: 0, submissions: 0, conversionRate: 0 },
        };

        const createResponse = await createForm(workspaceId, newForm);
        if (createResponse.success) {
          toast.success(`🎉 AI generated "${data.data.name}"!`);
          setShowAIGenerator(false);
          setAiPrompt("");
          router.push(`/projects/${workspaceId}/forms/${createResponse.data._id}/edit`);
        }
      } else {
        toast.error(data.error || "AI generation failed");
      }
    } catch (error) {
      console.error("AI form generation error:", error);
      toast.error("Failed to generate form with AI");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const filteredForms = selectedStatus === "all" ? forms : forms.filter((f) => f.status === selectedStatus);
  const totalViews = forms.reduce((sum, f) => sum + (f.stats?.views || 0), 0);
  const totalSubmissions = forms.reduce((sum, f) => sum + (f.stats?.submissions || 0), 0);
  const avgConversionRate = forms.length > 0
    ? forms.reduce((sum, f) => sum + (f.stats?.conversionRate || 0), 0) / forms.length
    : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Forms</h1>
            <p className="text-sm text-zinc-500">Create beautiful forms to capture leads</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadForms}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowAIGenerator(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full transition-all"
          >
            <SparklesIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Generate with AI</span>
          </button>
          <Link href={`/projects/${workspaceId}/forms/templates`}>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors">
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          </Link>
          <Link href={`/projects/${workspaceId}/forms/new`}>
            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors">
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Stats */}
        {forms.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <StatCard icon={FileText} label="Total Forms" value={forms.length} color="bg-gradient-to-br from-blue-400 to-blue-600" />
            <StatCard icon={Eye} label="Total Views" value={totalViews.toLocaleString()} color="bg-gradient-to-br from-cyan-400 to-cyan-600" />
            <StatCard icon={Users} label="Submissions" value={totalSubmissions.toLocaleString()} color="bg-gradient-to-br from-emerald-400 to-emerald-600" />
            <StatCard icon={ChartBarIcon} label="Avg. Rate" value={`${avgConversionRate.toFixed(1)}%`} color="bg-gradient-to-br from-amber-400 to-amber-600" />
          </motion.div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-500 mr-2">Filter:</span>
          <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
            {(["all", "published", "draft", "archived"] as const).map((status) => {
              const count = status === "all" ? forms.length : forms.filter((f) => f.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "px-4 py-1.5 text-sm font-medium rounded-full transition-all capitalize flex items-center gap-2",
                    selectedStatus === status
                      ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  )}
                >
                  {status}
                  <span className={cn(
                    "px-1.5 py-0.5 text-xs rounded-full",
                    selectedStatus === status
                      ? "bg-zinc-100 dark:bg-zinc-600 text-zinc-600 dark:text-zinc-300"
                      : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Forms Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Loading forms...</p>
            </div>
          </div>
        ) : filteredForms.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <DocumentTextIcon className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {selectedStatus === "all" ? "No forms yet" : `No ${selectedStatus} forms`}
            </h3>
            <p className="text-sm text-zinc-500 max-w-md mb-6">
              {selectedStatus === "all"
                ? "Get started by creating your first form from a template or build one from scratch"
                : "Create a new form to see it here"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplates(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-colors"
              >
                <SparklesIcon className="w-4 h-4" />
                Use a Template
              </button>
              <Link href={`/projects/${workspaceId}/forms/new`}>
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors">
                  <PlusIcon className="w-4 h-4" />
                  Create Blank Form
                </button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredForms.map((form) => (
              <FormCard key={form._id} form={form} workspaceId={workspaceId} onDelete={handleDelete} />
            ))}
          </motion.div>
        )}
      </div>

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !creatingFromTemplate && setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-pink-600 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Choose a Template</h2>
                    <p className="text-sm text-zinc-500">Start with a pre-built template</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  disabled={creatingFromTemplate}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Templates Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FORM_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <motion.div
                        key={template.id}
                        whileHover={{ scale: 1.02 }}
                        className={cn(
                          "p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-emerald-500 dark:hover:border-emerald-500 transition-all",
                          creatingFromTemplate && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !creatingFromTemplate && createFromTemplate(template)}
                      >
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br", template.color)}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{template.name}</h3>
                        <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{template.description}</p>
                        <span className="px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {template.fields.length} fields
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Generator Modal */}
      <AnimatePresence>
        {showAIGenerator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isGeneratingAI && setShowAIGenerator(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Generate with AI</h2>
                    <p className="text-sm text-zinc-500">Powered by Gemini 2.5 Pro ✨</p>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Describe your form goal
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Example: Lead capture form for a B2B SaaS company selling to enterprise HR teams..."
                    className="w-full h-32 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    disabled={isGeneratingAI}
                  />
                </div>

                {/* Suggestions */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "Lead capture for SaaS",
                    "Demo request form",
                    "Newsletter signup",
                    "Customer feedback survey",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setAiPrompt(suggestion)}
                      className="px-3 py-1.5 text-sm rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      disabled={isGeneratingAI}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* AI Reasoning */}
                {aiReasoning && (
                  <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">🧠 AI Reasoning</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{aiReasoning}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowAIGenerator(false)}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateWithAI}
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full transition-all disabled:opacity-50"
                >
                  {isGeneratingAI ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-4 h-4" />
                      Generate Form
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
