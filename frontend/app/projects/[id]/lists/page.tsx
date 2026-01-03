"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PlusIcon,
  FunnelIcon,
  UserGroupIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

interface ContactList {
  _id: string;
  name: string;
  description?: string;
  type: "static" | "dynamic";
  cachedCount?: number;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
  filters?: {
    conditions: FilterCondition[];
    logic: "AND" | "OR";
  };
}

interface FilterCondition {
  field: string;
  operator: string;
  value: any;
}

export default function ListsPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [lists, setLists] = useState<ContactList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    loadLists();
  }, [workspaceId]);

  const loadLists = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/workspaces/${workspaceId}/lists`, {
        credentials: "include",
      });
      const data = await response.json();

      if (data.success) {
        setLists(data.data);
      }
    } catch (error) {
      console.error("Load lists error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteList = async (listId: string) => {
    if (!confirm("Are you sure you want to delete this list?")) return;

    try {
      const response = await fetch(`${backendUrl}/api/workspaces/${workspaceId}/lists/${listId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        loadLists();
      }
    } catch (error) {
      console.error("Delete list error:", error);
    }
  };

  const refreshList = async (listId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/lists/${listId}/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        loadLists();
      }
    } catch (error) {
      console.error("Refresh list error:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FunnelIcon className="w-8 h-8 text-blue-600" />
            Smart Lists
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Segment your contacts with dynamic and static lists
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <PlusIcon className="w-5 h-5" />
          Create List
        </button>
      </div>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <FunnelIcon className="w-16 h-16 mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No lists yet
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Create your first list to segment your contacts
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First List
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lists.map((list) => (
            <motion.div
              key={list._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all p-6 cursor-pointer group"
              onClick={() => router.push(`/projects/${workspaceId}/lists/${list._id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {list.type === "dynamic" ? (
                      <ArrowPathIcon className="w-5 h-5 text-blue-600" />
                    ) : (
                      <UserGroupIcon className="w-5 h-5 text-gray-600" />
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      list.type === "dynamic"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {list.type === "dynamic" ? "Dynamic" : "Static"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {list.name}
                  </h3>
                  {list.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {list.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Contact Count */}
              <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {list.cachedCount?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {list.cachedCount === 1 ? "contact" : "contacts"}
                </div>
              </div>

              {/* Filter Preview */}
              {list.type === "dynamic" && list.filters && (
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {list.filters.conditions.length} {list.filters.conditions.length === 1 ? "filter" : "filters"} ({list.filters.logic})
                  </div>
                  <div className="space-y-1">
                    {list.filters.conditions.slice(0, 2).map((condition, idx) => (
                      <div key={idx} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {condition.field} {condition.operator} {JSON.stringify(condition.value)}
                      </div>
                    ))}
                    {list.filters.conditions.length > 2 && (
                      <div className="text-xs text-gray-500">
                        +{list.filters.conditions.length - 2} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {list.type === "dynamic" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshList(list._id);
                    }}
                    className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="Refresh count"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Refresh
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/projects/${workspaceId}/lists/${list._id}/edit`);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteList(list._id);
                  }}
                  className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateListModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        workspaceId={workspaceId}
        onSuccess={() => {
          setShowCreateModal(false);
          loadLists();
        }}
      />
    </div>
  );
}

// Create List Modal Component
function CreateListModal({
  isOpen,
  onClose,
  workspaceId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"static" | "dynamic">("dynamic");
  const [filters, setFilters] = useState<FilterCondition[]>([
    { field: "status", operator: "equals", value: "lead" },
  ]);
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  const fieldOptions = [
    { value: "status", label: "Status" },
    { value: "leadScore.grade", label: "Lead Score Grade" },
    { value: "leadScore.currentScore", label: "Lead Score" },
    { value: "tags", label: "Tags" },
    { value: "source", label: "Source" },
    { value: "company", label: "Company" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "assignedTo", label: "Assigned To" },
    { value: "lastContactedAt", label: "Last Contacted" },
    { value: "createdAt", label: "Created Date" },
  ];

  const operatorOptions = [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "not equals" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
    { value: "in", label: "in" },
    { value: "not_in", label: "not in" },
    { value: "exists", label: "exists" },
    { value: "not_exists", label: "does not exist" },
  ];

  const addFilter = () => {
    setFilters([...filters, { field: "status", operator: "equals", value: "" }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, updates: Partial<FilterCondition>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setFilters(newFilters);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${backendUrl}/api/workspaces/${workspaceId}/lists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          description,
          type,
          filters: type === "dynamic" ? { conditions: filters, logic } : undefined,
        }),
      });

      if (response.ok) {
        onSuccess();
        // Reset form
        setName("");
        setDescription("");
        setFilters([{ field: "status", operator: "equals", value: "lead" }]);
      }
    } catch (error) {
      console.error("Create list error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create New List
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g., Hot Leads"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Type *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setType("dynamic")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  type === "dynamic"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <ArrowPathIcon className="w-6 h-6 text-blue-600 mb-2" />
                <div className="font-medium text-gray-900 dark:text-white">Dynamic</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Auto-updates based on filters
                </div>
              </button>
              <button
                type="button"
                onClick={() => setType("static")}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  type === "static"
                    ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <UserGroupIcon className="w-6 h-6 text-gray-600 mb-2" />
                <div className="font-medium text-gray-900 dark:text-white">Static</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Manually add/remove contacts
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Filters */}
          {type === "dynamic" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filters
                </label>
                <select
                  value={logic}
                  onChange={(e) => setLogic(e.target.value as "AND" | "OR")}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="AND">Match ALL (AND)</option>
                  <option value="OR">Match ANY (OR)</option>
                </select>
              </div>

              {filters.map((filter, index) => (
                <div key={index} className="flex gap-2 items-start p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(index, { field: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  >
                    {fieldOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(index, { operator: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  >
                    {operatorOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    value={filter.value}
                    onChange={(e) => updateFilter(index, { value: e.target.value })}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  />

                  <button
                    type="button"
                    onClick={() => removeFilter(index)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addFilter}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Filter
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? "Creating..." : "Create List"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
