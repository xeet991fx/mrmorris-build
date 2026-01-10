"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { ClipboardList } from "lucide-react";
import { getForm, getFormSubmissions, type Form, type FormSubmission } from "@/lib/api/form";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

// Stat Card Component
function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
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

export default function FormSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const formId = params.formId as string;

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0, hasMore: false });

  useEffect(() => {
    loadData();
  }, [workspaceId, formId, selectedStatus]);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchQuery]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [formResponse, submissionsResponse] = await Promise.all([
        getForm(workspaceId, formId),
        getFormSubmissions(workspaceId, formId, {
          status: selectedStatus === "all" ? undefined : selectedStatus,
          limit: 50,
          offset: 0,
        }),
      ]);

      if (formResponse.success) setForm(formResponse.data);
      if (submissionsResponse.success) {
        setSubmissions(submissionsResponse.data);
        setPagination(submissionsResponse.pagination);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSubmissions = () => {
    if (!searchQuery.trim()) {
      setFilteredSubmissions(submissions);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = submissions.filter((submission) => {
      const dataString = JSON.stringify(submission.data).toLowerCase();
      if (dataString.includes(query)) return true;

      if (submission.contactId) {
        const contact = submission.contactId;
        if (
          contact.firstName?.toLowerCase().includes(query) ||
          contact.lastName?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query)
        ) return true;
      }

      return false;
    });

    setFilteredSubmissions(filtered);
  };

  const exportToCSV = () => {
    if (!form || filteredSubmissions.length === 0) return;

    const fieldIds = form.fields.map((f) => f.id);
    const fieldLabels = form.fields.map((f) => f.label);
    const headers = ["Submission ID", "Date", "Status", "Contact Name", "Contact Email", ...fieldLabels];

    const rows = filteredSubmissions.map((submission) => {
      const contact = submission.contactId;
      return [
        submission._id,
        new Date(submission.createdAt).toLocaleString(),
        submission.status,
        contact ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim() : "",
        contact?.email || "",
        ...fieldIds.map((fieldId) => {
          const value = submission.data[fieldId];
          return Array.isArray(value) ? value.join(", ") : value || "";
        }),
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${form.name.replace(/\s+/g, "_")}_submissions_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFieldValue = (submission: FormSubmission, fieldId: string) => {
    const value = submission.data[fieldId];
    if (value === undefined || value === null || value === "") return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400";
      case "contacted": return "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400";
      case "qualified": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400";
      case "spam": return "bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400";
      default: return "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new": return <ClockIcon className="w-3.5 h-3.5" />;
      case "contacted": return <EnvelopeIcon className="w-3.5 h-3.5" />;
      case "qualified": return <CheckCircleIcon className="w-3.5 h-3.5" />;
      case "spam": return <XCircleIcon className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const statusOptions = [
    { value: "all", label: "All" },
    { value: "new", label: "New" },
    { value: "contacted", label: "Contacted" },
    { value: "qualified", label: "Qualified" },
    { value: "spam", label: "Spam" },
    { value: "archived", label: "Archived" },
  ];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-zinc-200 dark:border-zinc-700 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-500">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-zinc-500">Form not found</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${workspaceId}/forms`)}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{form.name}</h1>
            <p className="text-sm text-zinc-500">{pagination.total} submissions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          >
            <ArrowPathIcon className={cn("w-5 h-5", isLoading && "animate-spin")} />
          </button>
          <button
            onClick={exportToCSV}
            disabled={filteredSubmissions.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-300 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <StatCard icon={ClockIcon} label="New" value={submissions.filter((s) => s.status === "new").length} color="bg-gradient-to-br from-blue-400 to-blue-600" />
          <StatCard icon={EnvelopeIcon} label="Contacted" value={submissions.filter((s) => s.status === "contacted").length} color="bg-gradient-to-br from-amber-400 to-amber-600" />
          <StatCard icon={CheckCircleIcon} label="Qualified" value={submissions.filter((s) => s.status === "qualified").length} color="bg-gradient-to-br from-emerald-400 to-emerald-600" />
          <StatCard icon={ShieldCheckIcon} label="Contacts Created" value={submissions.filter((s) => s.contactCreated).length} color="bg-gradient-to-br from-purple-400 to-purple-600" />
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Status Filter */}
          <div className="inline-flex p-1 rounded-full bg-zinc-100 dark:bg-zinc-800/50">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedStatus(option.value)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-full transition-all",
                  selectedStatus === option.value
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search submissions..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Submissions */}
        {filteredSubmissions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No submissions</h3>
            <p className="text-sm text-zinc-500">
              {searchQuery ? "No results match your search" : "Share your form to start collecting responses"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {filteredSubmissions.map((submission) => (
              <motion.div
                key={submission._id}
                variants={itemVariants}
                className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden"
              >
                {/* Row Header */}
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  onClick={() => setExpandedRow(expandedRow === submission._id ? null : submission._id)}
                >
                  {/* Date */}
                  <div className="flex-shrink-0 w-24">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Contact */}
                  <div className="flex-1 min-w-0">
                    {submission.contactId ? (
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {submission.contactId.firstName} {submission.contactId.lastName}
                        </p>
                        <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                          <EnvelopeIcon className="w-3 h-3" />
                          {submission.contactId.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 italic">No contact</span>
                    )}
                  </div>

                  {/* Status */}
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0",
                    getStatusColor(submission.status)
                  )}>
                    {getStatusIcon(submission.status)}
                    {submission.status}
                  </span>

                  {/* Source */}
                  <div className="hidden md:block text-right flex-shrink-0 w-24">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                      {submission.source.utmSource || "Direct"}
                    </p>
                  </div>

                  {/* Expand */}
                  {expandedRow === submission._id ? (
                    <ChevronDownIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                  )}
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {expandedRow === submission._id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-zinc-100 dark:border-zinc-800"
                    >
                      <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 space-y-4">
                        <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Submission Data</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {form.fields
                            .filter((field) => field.type !== "divider" && field.type !== "html")
                            .map((field) => (
                              <div key={field.id} className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
                                <p className="text-xs font-medium text-zinc-500 mb-1">{field.label}</p>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100 break-words">
                                  {getFieldValue(submission, field.id)}
                                </p>
                              </div>
                            ))}
                        </div>

                        {/* Source Tracking */}
                        {(submission.source.url || submission.source.utmSource) && (
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                            <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Source</h5>
                            <div className="flex flex-wrap gap-2 text-xs">
                              {submission.source.url && (
                                <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  URL: {submission.source.url}
                                </span>
                              )}
                              {submission.source.utmSource && (
                                <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  Source: {submission.source.utmSource}
                                </span>
                              )}
                              {submission.source.utmCampaign && (
                                <span className="px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                  Campaign: {submission.source.utmCampaign}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
