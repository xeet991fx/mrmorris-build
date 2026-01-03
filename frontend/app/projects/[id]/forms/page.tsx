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
  CodeBracketIcon,
  CheckCircleIcon,
  SparklesIcon,
  DocumentDuplicateIcon,
  CursorArrowRaysIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  PhoneIcon,
  BriefcaseIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  ShoppingCartIcon,
  HeartIcon,
  AcademicCapIcon,
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
    color: "blue",
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
    color: "green",
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
    color: "purple",
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
    color: "yellow",
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
    color: "indigo",
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
    color: "red",
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

export default function FormsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<"all" | "draft" | "published" | "archived">("all");
  const [showTemplates, setShowTemplates] = useState(false);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState(false);

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
        stats: {
          views: 0,
          submissions: 0,
          conversionRate: 0,
        },
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getTemplateColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      yellow: "bg-yellow-500",
      indigo: "bg-indigo-500",
      red: "bg-red-500",
    };
    return colors[color] || "bg-blue-500";
  };

  const filteredForms = selectedStatus === "all" ? forms : forms.filter((f) => f.status === selectedStatus);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Forms</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create beautiful forms to capture leads and grow your business
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadForms}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Refresh"
          >
            <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
          >
            <SparklesIcon className="w-5 h-5" />
            Create from Template
          </button>
          <Link
            href={`/projects/${workspaceId}/forms/new`}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <PlusIcon className="w-5 h-5" />
            Create Blank Form
          </Link>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "published", "draft", "archived"] as const).map((status) => {
          const count = status === "all" ? forms.length : forms.filter((f) => f.status === status).length;
          return (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all capitalize",
                selectedStatus === status
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Forms Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading forms...</p>
          </div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {selectedStatus === "all" ? "No forms yet" : `No ${selectedStatus} forms`}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {selectedStatus === "all"
              ? "Get started by creating your first form from a template or build one from scratch"
              : `Create a new form to see it here`}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowTemplates(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
            >
              <SparklesIcon className="w-5 h-5" />
              Use a Template
            </button>
            <Link
              href={`/projects/${workspaceId}/forms/new`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
              <PlusIcon className="w-5 h-5" />
              Create Blank Form
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl transition-all overflow-hidden"
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border capitalize shadow-sm",
                    getStatusColor(form.status)
                  )}
                >
                  {form.status === "published" && <CheckCircleIcon className="w-3 h-3 inline mr-1" />}
                  {form.status}
                </span>
              </div>

              <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="block p-6">
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1 mb-1 pr-20">
                    {form.name}
                  </h3>
                  {form.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{form.description}</p>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/30 rounded-lg p-3 text-center">
                    <EyeIcon className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Views</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{form.stats.views.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/30 rounded-lg p-3 text-center">
                    <CheckCircleIcon className="w-4 h-4 text-green-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Submits</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {form.stats.submissions.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/30 rounded-lg p-3 text-center">
                    <ChartBarIcon className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">Rate</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {form.stats.conversionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                  <span>{form.fields.length} field{form.fields.length !== 1 ? "s" : ""}</span>
                  <span>{form.formType === "multi_step" ? "Multi-step" : "Single-step"}</span>
                </div>
              </Link>

              {/* Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 px-6 py-3 flex gap-2">
                <Link
                  href={`/projects/${workspaceId}/forms/${form._id}/edit`}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </Link>
                <Link
                  href={`/projects/${workspaceId}/forms/${form._id}/submissions`}
                  className="flex items-center justify-center px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                  title="Submissions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                </Link>
                {form.status === "published" && (
                  <a
                    href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/forms/${form._id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    title="View Public Form"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EyeIcon className="w-4 h-4" />
                  </a>
                )}
                <button
                  onClick={(e) => handleDelete(form._id, e)}
                  className="flex items-center justify-center px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Template Modal */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !creatingFromTemplate && setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <SparklesIcon className="w-7 h-7 text-purple-600" />
                      Choose a Template
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Start with a pre-built template and customize it to your needs
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTemplates(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    disabled={creatingFromTemplate}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FORM_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => createFromTemplate(template)}
                        disabled={creatingFromTemplate}
                        className="group text-left p-6 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-900"
                      >
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", getTemplateColor(template.color))}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">{template.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          {template.fields.length} fields included
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Missing icon import
import { EnvelopeIcon } from "@heroicons/react/24/outline";
