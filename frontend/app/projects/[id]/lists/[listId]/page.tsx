"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  UserGroupIcon,
  FunnelIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

interface Contact {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
  leadScore?: {
    currentScore: number;
    grade: string;
  };
  createdAt: string;
}

interface ContactList {
  _id: string;
  name: string;
  description?: string;
  type: "static" | "dynamic";
  cachedCount?: number;
  filters?: {
    conditions: any[];
    logic: "AND" | "OR";
  };
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  const listId = params.listId as string;

  const [list, setList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    loadList();
  }, [listId, page]);

  const loadList = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/lists/${listId}?page=${page}&limit=20`,
        {
          credentials: "include",
        }
      );
      const data = await response.json();

      if (data.success) {
        setList(data.data.list);
        setContacts(data.data.contacts);
        setTotalPages(data.data.pages);
      }
    } catch (error) {
      console.error("Load list error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshList = async () => {
    if (list?.type !== "dynamic") return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${backendUrl}/api/workspaces/${workspaceId}/lists/${listId}/refresh`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      if (response.ok) {
        loadList();
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !list) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">List not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Lists
        </button>

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {list.type === "dynamic" ? (
                <ArrowPathIcon className="w-8 h-8 text-blue-600" />
              ) : (
                <UserGroupIcon className="w-8 h-8 text-gray-600" />
              )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {list.name}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${list.type === "dynamic"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
                }`}>
                {list.type === "dynamic" ? "Dynamic List" : "Static List"}
              </span>
            </div>
            {list.description && (
              <p className="text-gray-600 dark:text-gray-400">{list.description}</p>
            )}
          </div>

          {list.type === "dynamic" && (
            <button
              onClick={refreshList}
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium flex items-center gap-2"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh Count
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {list.cachedCount?.toLocaleString() || contacts.length}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Total Contacts
          </div>
        </div>

        {list.type === "dynamic" && list.filters && (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {list.filters.conditions.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Active Filters
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {list.filters.logic}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Filter Logic
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters Display */}
      {list.type === "dynamic" && list.filters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-blue-600" />
            Filter Conditions
          </h2>
          <div className="space-y-2">
            {list.filters.conditions.map((condition, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                  {idx + 1}
                </span>
                <code className="text-sm text-gray-900 dark:text-white">
                  {condition.field}
                </code>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {condition.operator}
                </span>
                <code className="text-sm text-blue-600 dark:text-blue-400">
                  {JSON.stringify(condition.value)}
                </code>
                {idx < (list.filters?.conditions.length ?? 0) - 1 && (
                  <span className="ml-auto text-sm font-semibold text-purple-600">
                    {list.filters?.logic}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Contacts ({contacts.length})
          </h2>
        </div>

        {contacts.length === 0 ? (
          <div className="p-12 text-center">
            <UserGroupIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No contacts in this list</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Lead Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contacts.map((contact) => (
                  <motion.tr
                    key={contact._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => router.push(`/projects/${workspaceId}/contacts/${contact._id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </div>
                        {contact.email && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <EnvelopeIcon className="w-3 h-3" />
                            {contact.email}
                          </div>
                        )}
                        {contact.phone && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <PhoneIcon className="w-3 h-3" />
                            {contact.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.company ? (
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                          <BuildingOfficeIcon className="w-4 h-4" />
                          {contact.company}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${contact.status === "lead"
                          ? "bg-blue-100 text-blue-800"
                          : contact.status === "prospect"
                            ? "bg-purple-100 text-purple-800"
                            : contact.status === "customer"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}>
                        {contact.status || "N/A"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contact.leadScore ? (
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${contact.leadScore.grade === "A"
                              ? "bg-green-100 text-green-800"
                              : contact.leadScore.grade === "B"
                                ? "bg-blue-100 text-blue-800"
                                : contact.leadScore.grade === "C"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}>
                            {contact.leadScore.grade}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {contact.leadScore.currentScore}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
