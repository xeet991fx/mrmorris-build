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
import { ClipboardList, Eye, FileText, Users } from "lucide-react";
import { getForms, deleteForm, createForm, Form } from "@/lib/api/form";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

  // AI Form Generator state
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

  // AI Form Generation with Gemini 2.5 Pro
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

        // Create the form with AI-generated fields
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

  // Calculate stats
  const totalViews = forms.reduce((sum, f) => sum + (f.stats?.views || 0), 0);
  const totalSubmissions = forms.reduce((sum, f) => sum + (f.stats?.submissions || 0), 0);
  const avgConversionRate = forms.length > 0
    ? forms.reduce((sum, f) => sum + (f.stats?.conversionRate || 0), 0) / forms.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <PageHeader
        icon={ClipboardList}
        title="Forms"
        description="Create beautiful forms to capture leads and grow your business"
      >
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={loadForms}
            disabled={isLoading}
            title="Refresh"
          >
            <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </Button>
          {/* AI Generate Button - NEW */}
          <Button
            onClick={() => setShowAIGenerator(true)}
            className="gap-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white shadow-sm"
          >
            <SparklesIcon className="w-5 h-5" />
            Generate with AI
          </Button>
          <Link href={`/projects/${workspaceId}/forms/templates`}>
            <Button variant="outline" className="gap-2">
              <DocumentDuplicateIcon className="w-5 h-5" />
              Templates
            </Button>
          </Link>
          <Link href={`/projects/${workspaceId}/forms/new`}>
            <Button variant="outline" className="gap-2">
              <PlusIcon className="w-5 h-5" />
              Create Blank
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Stats */}
      {forms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard
            title="Total Forms"
            value={forms.length}
            description={`${forms.filter(f => f.status === 'published').length} published`}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Total Views"
            value={totalViews.toLocaleString()}
            description="Across all forms"
            icon={Eye}
            variant="info"
          />
          <StatCard
            title="Submissions"
            value={totalSubmissions.toLocaleString()}
            description="Total form fills"
            icon={Users}
            variant="success"
          />
          <StatCard
            title="Avg. Conversion"
            value={`${avgConversionRate.toFixed(1)}%`}
            description="Views to submissions"
            icon={ChartBarIcon}
            variant="warning"
          />
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
        {(["all", "published", "draft", "archived"] as const).map((status) => {
          const count = status === "all" ? forms.length : forms.filter((f) => f.status === status).length;
          const isActive = selectedStatus === status;

          return (
            <Button
              key={status}
              onClick={() => setSelectedStatus(status)}
              variant={isActive ? "default" : "outline"}
              size="sm"
              className={cn(
                "capitalize gap-2 transition-all",
                !isActive && "hover:border-primary"
              )}
            >
              {status}
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className="ml-1 px-1.5 py-0 min-w-[20px] justify-center"
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* Forms Grid */}
      {isLoading ? (
        <Card className="flex items-center justify-center py-16">
          <div className="text-center">
            <ArrowPathIcon className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground">Loading forms...</p>
          </div>
        </Card>
      ) : filteredForms.length === 0 ? (
        <Card className="border-2 border-dashed">
          <EmptyState
            icon={DocumentTextIcon}
            title={selectedStatus === "all" ? "No forms yet" : `No ${selectedStatus} forms`}
            description={
              selectedStatus === "all"
                ? "Get started by creating your first form from a template or build one from scratch"
                : `Create a new form to see it here`
            }
            action={{
              label: selectedStatus === "all" ? "Use a Template" : "Create Form",
              onClick: () => selectedStatus === "all" ? setShowTemplates(true) : router.push(`/projects/${workspaceId}/forms/new`)
            }}
          />
          {selectedStatus === "all" && (
            <div className="flex justify-center pb-8 gap-3">
              <Button
                variant="outline"
                onClick={() => setShowTemplates(true)}
                className="gap-2"
              >
                <SparklesIcon className="w-5 h-5" />
                Use a Template
              </Button>
              <Link href={`/projects/${workspaceId}/forms/new`}>
                <Button className="gap-2">
                  <PlusIcon className="w-5 h-5" />
                  Create Blank Form
                </Button>
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form, index) => (
            <motion.div
              key={form._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="premium-card group relative premium-hover overflow-hidden h-full flex flex-col">
                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <Badge
                    variant={form.status === "published" ? "success" : form.status === "draft" ? "warning" : "secondary"}
                    className="capitalize shadow-sm"
                  >
                    {form.status === "published" && <CheckCircleIcon className="w-3 h-3 inline mr-1" />}
                    {form.status}
                  </Badge>
                </div>

                <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="block p-6 flex-1">
                  {/* Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground line-clamp-1 mb-1 pr-20">
                      {form.name}
                    </h3>
                    {form.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{form.description}</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                      <EyeIcon className="w-4 h-4 text-info mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="text-lg font-bold text-foreground">{form.stats.views.toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                      <CheckCircleIcon className="w-4 h-4 text-success mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Submits</p>
                      <p className="text-lg font-bold text-foreground">
                        {form.stats.submissions.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center hover:bg-muted transition-colors">
                      <ChartBarIcon className="w-4 h-4 text-warning mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">Rate</p>
                      <p className="text-lg font-bold text-foreground">
                        {form.stats.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="font-normal">
                      {form.fields.length} field{form.fields.length !== 1 ? "s" : ""}
                    </Badge>
                    <Badge variant="outline" className="font-normal">
                      {form.formType === "multi_step" ? "Multi-step" : "Single-step"}
                    </Badge>
                  </div>
                </Link>

                {/* Actions */}
                <div className="border-t bg-muted/30 px-4 py-3 flex gap-2">
                  <Link href={`/projects/${workspaceId}/forms/${form._id}/edit`} className="flex-1">
                    <Button size="sm" className="w-full gap-1.5">
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </Button>
                  </Link>
                  <Link
                    href={`/projects/${workspaceId}/forms/${form._id}/submissions`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" variant="outline" title="Submissions">
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                    </Button>
                  </Link>
                  {form.status === "published" && (
                    <a
                      href={`${process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"}/forms/${form._id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="outline" title="View Public Form">
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => handleDelete(form._id, e)}
                    title="Delete"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !creatingFromTemplate && setShowTemplates(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <SparklesIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">Choose a Template</h2>
                      <p className="text-muted-foreground text-sm mt-0.5">
                        Start with a pre-built template and customize it to your needs
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowTemplates(false)}
                    disabled={creatingFromTemplate}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FORM_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className={cn(
                          "cursor-pointer group hover:border-primary/50 transition-all",
                          creatingFromTemplate && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => !creatingFromTemplate && createFromTemplate(template)}
                      >
                        <div className="p-6">
                          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", getTemplateColor(template.color))}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{template.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                          <Badge variant="outline" className="font-normal">
                            {template.fields.length} fields included
                          </Badge>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {creatingFromTemplate && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <ArrowPathIcon className="w-5 h-5 animate-spin text-primary" />
                        <p className="text-foreground font-medium">Creating form from template...</p>
                      </div>
                    </Card>
                  </div>
                )}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => !isGeneratingAI && setShowAIGenerator(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background rounded-2xl shadow-2xl max-w-2xl w-full border"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-border bg-gradient-to-br from-gray-100/40 to-gray-200/20 dark:from-gray-800/40 dark:to-gray-700/20">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gray-600 dark:bg-gray-600 shadow-lg shadow-gray-900/20">
                    <SparklesIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">Generate Form with AI</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      Powered by Gemini 2.5 Pro • Describe your goals and let AI create the perfect form
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Describe your form goal
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Example: Lead capture form for a B2B SaaS company selling to enterprise HR teams. Should qualify leads by company size, budget, and use case..."
                    className="w-full h-36 px-4 py-3 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 resize-none transition-all shadow-sm"
                    disabled={isGeneratingAI}
                  />
                </div>

                {/* Suggested prompts */}
                <div className="flex flex-wrap gap-2">
                  {[
                    "Lead capture for SaaS product",
                    "Demo request form for enterprise",
                    "Newsletter signup with interests",
                    "Customer feedback survey",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setAiPrompt(suggestion)}
                      className="px-3 py-1.5 text-sm rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={isGeneratingAI}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* AI Reasoning Display */}
                {aiReasoning && (
                  <div className="p-4 rounded-xl bg-gray-100/20 dark:bg-gray-800/20 border border-gray-300/30 dark:border-gray-700/30">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-400 mb-1 flex items-center gap-2">
                      <span>🧠</span> AI Reasoning
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{aiReasoning}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-muted/30 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAIGenerator(false)}
                  disabled={isGeneratingAI}
                >
                  Cancel
                </Button>
                <Button
                  onClick={generateWithAI}
                  disabled={isGeneratingAI || !aiPrompt.trim()}
                  className="gap-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-600 dark:hover:bg-gray-500 text-white shadow-sm min-w-[140px]"
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
                </Button>
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
