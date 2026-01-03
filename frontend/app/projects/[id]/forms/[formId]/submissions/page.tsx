"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { getForm, getFormSubmissions, type Form, type FormSubmission } from "@/lib/api/form";
import { formatDistanceToNow } from "date-fns";

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
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });

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

      if (formResponse.success) {
        setForm(formResponse.data);
      }

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
      // Search in submission data
      const dataString = JSON.stringify(submission.data).toLowerCase();
      if (dataString.includes(query)) return true;

      // Search in contact info
      if (submission.contactId) {
        const contact = submission.contactId;
        if (
          contact.firstName?.toLowerCase().includes(query) ||
          contact.lastName?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.toLowerCase().includes(query) ||
          contact.company?.toLowerCase().includes(query)
        ) {
          return true;
        }
      }

      // Search in source
      if (
        submission.source.url?.toLowerCase().includes(query) ||
        submission.source.referrer?.toLowerCase().includes(query) ||
        submission.source.utmSource?.toLowerCase().includes(query) ||
        submission.source.utmCampaign?.toLowerCase().includes(query)
      ) {
        return true;
      }

      return false;
    });

    setFilteredSubmissions(filtered);
  };

  const exportToCSV = () => {
    if (!form || filteredSubmissions.length === 0) return;

    // Build CSV header
    const fieldIds = form.fields.map((f) => f.id);
    const fieldLabels = form.fields.map((f) => f.label);
    const headers = [
      "Submission ID",
      "Date",
      "Status",
      "Contact Name",
      "Contact Email",
      ...fieldLabels,
      "Source URL",
      "UTM Source",
      "UTM Campaign",
    ];

    // Build CSV rows
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
          if (Array.isArray(value)) return value.join(", ");
          return value || "";
        }),
        submission.source.url || "",
        submission.source.utmSource || "",
        submission.source.utmCampaign || "",
      ];
    });

    // Generate CSV
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Download
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
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "contacted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "qualified":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "spam":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <ClockIcon className="w-4 h-4" />;
      case "contacted":
        return <EnvelopeIcon className="w-4 h-4" />;
      case "qualified":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "spam":
        return <XCircleIcon className="w-4 h-4" />;
      case "archived":
        return <TrashIcon className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const statusOptions = [
    { value: "all", label: "All Submissions", count: submissions.length },
    { value: "new", label: "New", count: submissions.filter((s) => s.status === "new").length },
    {
      value: "contacted",
      label: "Contacted",
      count: submissions.filter((s) => s.status === "contacted").length,
    },
    {
      value: "qualified",
      label: "Qualified",
      count: submissions.filter((s) => s.status === "qualified").length,
    },
    { value: "spam", label: "Spam", count: submissions.filter((s) => s.status === "spam").length },
    {
      value: "archived",
      label: "Archived",
      count: submissions.filter((s) => s.status === "archived").length,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-600 dark:text-gray-400">Form not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push(`/projects/${workspaceId}/forms`)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Back to Forms
          </button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{form.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">
          {pagination.total} total submission{pagination.total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <ClockIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">New</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {submissions.filter((s) => s.status === "new").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
              <EnvelopeIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contacted</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {submissions.filter((s) => s.status === "contacted").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Qualified</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {submissions.filter((s) => s.status === "qualified").length}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Contact Created</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {submissions.filter((s) => s.contactCreated).length}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Status Filter */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FunnelIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Status
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedStatus(option.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedStatus === option.value
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="w-full md:w-80">
            <div className="flex items-center gap-2 mb-2">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Search</span>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or any field..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Export */}
          <div className="flex items-end">
            <button
              onClick={exportToCSV}
              disabled={filteredSubmissions.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery
                ? "No submissions match your search criteria"
                : selectedStatus === "all"
                  ? "No submissions yet. Share your form to start collecting responses!"
                  : `No ${selectedStatus} submissions`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSubmissions.map((submission) => (
                  <React.Fragment key={submission._id}>
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div>{new Date(submission.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDistanceToNow(new Date(submission.createdAt), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {submission.contactId ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {submission.contactId.firstName} {submission.contactId.lastName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <EnvelopeIcon className="w-3 h-3" />
                              {submission.contactId.email}
                            </div>
                            {submission.contactId.phone && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <PhoneIcon className="w-3 h-3" />
                                {submission.contactId.phone}
                              </div>
                            )}
                            {submission.contactId.company && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <BuildingOfficeIcon className="w-3 h-3" />
                                {submission.contactId.company}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            No contact created
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(submission.status)}`}
                        >
                          {getStatusIcon(submission.status)}
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {submission.source.utmSource || submission.source.utmCampaign ? (
                          <div>
                            <div className="text-gray-900 dark:text-white font-medium">
                              {submission.source.utmSource || "Direct"}
                            </div>
                            {submission.source.utmCampaign && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {submission.source.utmCampaign}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <GlobeAltIcon className="w-4 h-4" />
                            Direct
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() =>
                            setExpandedRow(expandedRow === submission._id ? null : submission._id)
                          }
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {expandedRow === submission._id ? (
                            <>
                              <ChevronDownIcon className="w-4 h-4" />
                              Hide Details
                            </>
                          ) : (
                            <>
                              <ChevronRightIcon className="w-4 h-4" />
                              View Details
                            </>
                          )}
                        </button>
                      </td>
                    </motion.tr>

                    {/* Expanded Row */}
                    {expandedRow === submission._id && (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Submission Data
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {form.fields
                                .filter((field) => field.type !== "divider" && field.type !== "html")
                                .map((field) => (
                                  <div
                                    key={field.id}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                                  >
                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                      {field.label}
                                    </div>
                                    <div className="text-sm text-gray-900 dark:text-white break-words">
                                      {getFieldValue(submission, field.id)}
                                    </div>
                                  </div>
                                ))}
                            </div>

                            {/* Source Details */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                              <h5 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Source Tracking
                              </h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                {submission.source.url && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">URL: </span>
                                    <a
                                      href={submission.source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline break-all"
                                    >
                                      {submission.source.url}
                                    </a>
                                  </div>
                                )}
                                {submission.source.referrer && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      Referrer:{" "}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                      {submission.source.referrer}
                                    </span>
                                  </div>
                                )}
                                {submission.source.utmSource && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      UTM Source:{" "}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                      {submission.source.utmSource}
                                    </span>
                                  </div>
                                )}
                                {submission.source.utmMedium && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      UTM Medium:{" "}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                      {submission.source.utmMedium}
                                    </span>
                                  </div>
                                )}
                                {submission.source.utmCampaign && (
                                  <div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      UTM Campaign:{" "}
                                    </span>
                                    <span className="text-gray-900 dark:text-white">
                                      {submission.source.utmCampaign}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
