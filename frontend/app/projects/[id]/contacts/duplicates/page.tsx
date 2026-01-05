"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import axiosInstance from "@/lib/axios";
import MergeContactsDialog from "@/components/contacts/MergeContactsDialog";

interface Contact {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

interface DuplicateGroup {
  _id: string | { firstName: string; lastName: string; company: string };
  count: number;
  contacts: Contact[];
}

interface DuplicatesData {
  byEmail: DuplicateGroup[];
  byNameCompany: DuplicateGroup[];
  totalDuplicateGroups: number;
}

export default function ContactDuplicatesPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [duplicatesData, setDuplicatesData] = useState<DuplicatesData | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [primaryContact, setPrimaryContact] = useState<Contact | null>(null);
  const [duplicateContact, setDuplicateContact] = useState<Contact | null>(null);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchDuplicates();
  }, [workspaceId]);

  const fetchDuplicates = async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.post(
        `/workspaces/${workspaceId}/contacts/find-duplicates`
      );

      if (response.data.success) {
        setDuplicatesData(response.data.data);
      }
    } catch (error: any) {
      const message = error.response?.data?.error || "Failed to find duplicates";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMergeClick = (group: DuplicateGroup, primaryIdx: number, duplicateIdx: number) => {
    setPrimaryContact(group.contacts[primaryIdx]);
    setDuplicateContact(group.contacts[duplicateIdx]);
    setSelectedGroup(group);
    setIsMergeDialogOpen(true);
  };

  const handleMergeComplete = () => {
    setIsMergeDialogOpen(false);
    setPrimaryContact(null);
    setDuplicateContact(null);
    setSelectedGroup(null);
    fetchDuplicates(); // Refresh the list
  };

  const getDisplayKey = (group: DuplicateGroup): string => {
    if (typeof group._id === "string") {
      return group._id; // Email
    }
    return `${group._id.firstName} ${group._id.lastName} @ ${group._id.company}`;
  };

  const filterGroups = (groups: DuplicateGroup[]): DuplicateGroup[] => {
    if (!searchQuery.trim()) return groups;

    return groups.filter((group) => {
      const key = getDisplayKey(group).toLowerCase();
      return key.includes(searchQuery.toLowerCase());
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Scanning for duplicates...</p>
        </div>
      </div>
    );
  }

  const totalContacts =
    (duplicatesData?.byEmail.reduce((sum, g) => sum + g.count, 0) || 0) +
    (duplicatesData?.byNameCompany.reduce((sum, g) => sum + g.count, 0) || 0);

  const filteredEmailGroups = filterGroups(duplicatesData?.byEmail || []);
  const filteredNameGroups = filterGroups(duplicatesData?.byNameCompany || []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-7 h-7 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Duplicate Contacts</h1>
              <p className="text-gray-600 mt-1">
                Clean up your contact list by merging duplicates
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Duplicate Groups</p>
                <p className="text-2xl font-bold text-gray-900">
                  {duplicatesData?.totalDuplicateGroups || 0}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Duplicate Contacts</p>
                <p className="text-2xl font-bold text-gray-900">{totalContacts}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Clean After Merge</p>
                <p className="text-2xl font-bold text-gray-900">
                  {totalContacts - (duplicatesData?.totalDuplicateGroups || 0)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search duplicates by email, name, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* No Duplicates */}
        {duplicatesData?.totalDuplicateGroups === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Duplicates Found!
            </h3>
            <p className="text-gray-600">Your contact list is clean and duplicate-free.</p>
          </div>
        )}

        {/* Email Duplicates */}
        {filteredEmailGroups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold">
                {filteredEmailGroups.length}
              </span>
              Duplicate Emails
            </h2>
            <div className="space-y-4">
              {filteredEmailGroups.map((group, groupIdx) => (
                <DuplicateGroupCard
                  key={`email-${groupIdx}`}
                  group={group}
                  type="email"
                  onMergeClick={handleMergeClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Name + Company Duplicates */}
        {filteredNameGroups.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center text-yellow-600 text-sm font-bold">
                {filteredNameGroups.length}
              </span>
              Duplicate Names & Companies
            </h2>
            <div className="space-y-4">
              {filteredNameGroups.map((group, groupIdx) => (
                <DuplicateGroupCard
                  key={`name-${groupIdx}`}
                  group={group}
                  type="name"
                  onMergeClick={handleMergeClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Results */}
        {searchQuery.trim() &&
          filteredEmailGroups.length === 0 &&
          filteredNameGroups.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
              <MagnifyingGlassIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
              <p className="text-gray-600">
                No duplicates match your search query: &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
      </div>

      {/* Merge Dialog */}
      {primaryContact && duplicateContact && (
        <MergeContactsDialog
          isOpen={isMergeDialogOpen}
          onClose={() => setIsMergeDialogOpen(false)}
          workspaceId={workspaceId}
          primaryContact={primaryContact}
          duplicateContact={duplicateContact}
          onMergeComplete={handleMergeComplete}
        />
      )}
    </div>
  );
}

interface DuplicateGroupCardProps {
  group: DuplicateGroup;
  type: "email" | "name";
  onMergeClick: (group: DuplicateGroup, primaryIdx: number, duplicateIdx: number) => void;
}

function DuplicateGroupCard({ group, type, onMergeClick }: DuplicateGroupCardProps) {
  const displayKey =
    typeof group._id === "string"
      ? group._id
      : `${group._id.firstName} ${group._id.lastName} @ ${group._id.company}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className={`px-6 py-4 border-b ${type === "email" ? "bg-red-50" : "bg-yellow-50"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon
              className={`w-5 h-5 ${type === "email" ? "text-red-600" : "text-yellow-600"}`}
            />
            <div>
              <p className="font-medium text-gray-900">{displayKey}</p>
              <p className="text-sm text-gray-600">
                {group.count} duplicate contact{group.count > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              type === "email"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {type === "email" ? "Exact Match" : "Similar"}
          </span>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group.contacts.map((contact, contactIdx) => (
            <div
              key={contact.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {contact.firstName} {contact.lastName}
                  </p>
                  {contact.email && (
                    <p className="text-sm text-gray-600 mt-1">{contact.email}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                  #{contactIdx + 1}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                {contact.company && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Company:</span> {contact.company}
                  </p>
                )}
                {contact.jobTitle && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Title:</span> {contact.jobTitle}
                  </p>
                )}
                {contact.phone && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Phone:</span> {contact.phone}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Created: {new Date(contact.createdAt).toLocaleDateString()}
                </p>
              </div>

              {contactIdx === 0 && group.contacts.length > 1 && (
                <div className="flex flex-col gap-2">
                  {group.contacts.slice(1).map((_, dupIdx) => (
                    <button
                      key={dupIdx}
                      onClick={() => onMergeClick(group, 0, dupIdx + 1)}
                      className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Merge with #{dupIdx + 2}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
