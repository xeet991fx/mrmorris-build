"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
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

// Status indicator colors
const STATUS_COLORS: Record<string, string> = {
  published: "bg-emerald-500",
  draft: "bg-zinc-400",
  archived: "bg-zinc-300",
};

// Form row component - matching campaign row style
function FormRow({ form, workspaceId, onDelete }: {
  form: Form;
  workspaceId: string;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-4 py-4 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors -mx-4 px-4 cursor-pointer"
    >
      <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="flex items-center gap-4 flex-1 min-w-0">
        {/* Status indicator */}
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", STATUS_COLORS[form.status] || STATUS_COLORS.draft)} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
              {form.name}
            </p>
            <span className="text-xs text-zinc-400 capitalize">{form.status}</span>
          </div>
          <div className="flex items-center gap-4 mt-1">
            {form.description && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-md">
                {form.description}
              </p>
            )}
            <p className="text-xs text-zinc-400">
              {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} · {form.formType === "multi_step" ? "Multi-step" : "Single-step"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="hidden sm:flex items-center gap-6 text-xs text-zinc-500">
          <div className="text-center">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{form.stats.views.toLocaleString()}</p>
            <p>views</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">{form.stats.submissions.toLocaleString()}</p>
            <p>submits</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-emerald-500">{form.stats.conversionRate.toFixed(1)}%</p>
            <p>rate</p>
          </div>
        </div>
      </Link>

      {/* Actions - hover revealed */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`}>
          <button className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Edit">
            <PencilIcon className="w-4 h-4" />
          </button>
        </Link>
        <Link href={`/projects/${workspaceId}/forms/${form._id}/submissions`}>
          <button className="p-1.5 text-zinc-400 hover:text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors" title="Submissions">
            <ClipboardDocumentListIcon className="w-4 h-4" />
          </button>
        </Link>
        {form.status === "published" && (
          <Link href={`/forms/${form._id}`} target="_blank" rel="noopener noreferrer">
            <button className="p-1.5 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors" title="View Live">
              <EyeIcon className="w-4 h-4" />
            </button>
          </Link>
        )}
        <button
          onClick={(e) => onDelete(form._id, e)}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      <ChevronRightIcon className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 transition-colors" />
    </motion.div>
  );
}

export default function FormsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | object | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getForms(workspaceId);
      if (response.success) {
        setForms(response.data);
      }
    } catch (error) {
      console.error("Error loading forms:", error);
      toast.error("Failed to load forms");
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteForm(workspaceId, deleteConfirmId);
      toast.success("Form deleted successfully");
      loadForms();
    } catch (error) {
      console.error("Error deleting form:", error);
      toast.error("Failed to delete form");
    } finally {
      setDeleteConfirmId(null);
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
          toast.success(`AI generated "${data.data.name}"!`);
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

  // Filter forms
  const filteredForms = forms.filter((f) => {
    const matchesSearch =
      searchQuery === "" ||
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const publishedCount = forms.filter(f => f.status === "published").length;
  const draftCount = forms.filter(f => f.status === "draft").length;
  const archivedCount = forms.filter(f => f.status === "archived").length;

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-4 sm:pb-6">
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Section */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
              Forms
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Create and manage forms to capture leads
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowAIGenerator(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
            >
              <SparklesIcon className="w-4 h-4" />
              <span className="hidden sm:inline">AI Generate</span>
            </button>
            <Link href={`/projects/${workspaceId}/forms/templates`}>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all">
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Templates</span>
              </button>
            </Link>
            <Link href={`/projects/${workspaceId}/forms/new`}>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm">
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">New Form</span>
              </button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 flex items-center gap-6"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{forms.length}</span>
            <span className="text-sm text-zinc-500">total</span>
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-2xl font-bold text-emerald-500">{publishedCount}</span>
            <span className="text-sm text-zinc-500">published</span>
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="text-2xl font-bold text-zinc-500">{draftCount}</span>
            <span className="text-sm text-zinc-500">draft</span>
          </div>
          <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-zinc-300" />
            <span className="text-2xl font-bold text-zinc-400">{archivedCount}</span>
            <span className="text-sm text-zinc-500">archived</span>
          </div>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

      {/* Search & Filter */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2">
            {(["all", "published", "draft", "archived"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                  statusFilter === status
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Forms List */}
      <div className="px-8 pb-8">
        {filteredForms.length === 0 ? (
          forms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <DocumentTextIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No forms yet</h3>
              <p className="text-sm text-zinc-500 mb-6">Get started by creating your first form</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowTemplates(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <SparklesIcon className="w-4 h-4" />
                  Use a Template
                </button>
                <Link href={`/projects/${workspaceId}/forms/new`}>
                  <button className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
                    <PlusIcon className="w-4 h-4" />
                    Create Form
                  </button>
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              No forms match your search.
            </div>
          )
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {filteredForms.map((form) => (
              <FormRow key={form._id} form={form} workspaceId={workspaceId} onDelete={handleDelete} />
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !creatingFromTemplate && setShowTemplates(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Choose a Template</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Start with a pre-built template</p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  disabled={creatingFromTemplate}
                  className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
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
                          "p-5 rounded-xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-600 transition-all",
                          creatingFromTemplate && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !creatingFromTemplate && createFromTemplate(template)}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-gradient-to-br", template.color)}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">{template.name}</h3>
                        <p className="text-sm text-zinc-500 mb-3 line-clamp-2">{template.description}</p>
                        <span className="text-xs text-zinc-400">
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isGeneratingAI && setShowAIGenerator(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Generate with AI</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Powered by Gemini 2.5 Pro</p>
                </div>
                <button
                  onClick={() => setShowAIGenerator(false)}
                  disabled={isGeneratingAI}
                  className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
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
                    className="w-full h-32 px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-none"
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
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">AI Reasoning</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {typeof aiReasoning === 'string'
                        ? aiReasoning
                        : typeof aiReasoning === 'object'
                          ? JSON.stringify(aiReasoning, null, 2)
                          : String(aiReasoning)
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                <button
                  onClick={() => setShowAIGenerator(false)}
                  disabled={isGeneratingAI}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={generateWithAI}
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 rounded-lg transition-all disabled:opacity-50"
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-6 max-w-sm mx-4"
            >
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Delete Form</h3>
              <p className="text-sm text-zinc-500 mb-6">Are you sure you want to delete this form? This action cannot be undone.</p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
