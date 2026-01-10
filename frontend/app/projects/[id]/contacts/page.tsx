"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserGroupIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useContactStore } from "@/store/useContactStore";
import { Contact } from "@/lib/api/contact";
import ContactsTableHeader from "@/components/contacts/ContactsTableHeader";
import ContactsTable from "@/components/contacts/ContactsTable";
import AddContactSlideOver from "@/components/contacts/AddContactSlideOver";
import EditContactSlideOver from "@/components/contacts/EditContactSlideOver";
import ColumnManager from "@/components/contacts/ColumnManager";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImportModal from "@/components/import/ImportModal";
import { cn } from "@/lib/utils";

export default function ContactsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { contacts, isLoading, fetchContacts, deleteContact, fetchCustomColumns, selectedContacts, clearSelectedContacts } = useContactStore();

  const [isAddSlideOverOpen, setIsAddSlideOverOpen] = useState(false);
  const [isEditSlideOverOpen, setIsEditSlideOverOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Fetch contacts and custom columns on mount
  useEffect(() => {
    if (workspaceId) {
      fetchContacts(workspaceId);
      fetchCustomColumns(workspaceId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleEdit = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditSlideOverOpen(true);
  };

  const handleDelete = (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!contactToDelete) return;

    try {
      await deleteContact(workspaceId, contactToDelete);
      toast.success("Contact deleted successfully");
      setContactToDelete(null);
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const contactId of selectedContacts) {
        await deleteContact(workspaceId, contactId);
      }
      toast.success(`Deleted ${selectedContacts.length} contacts`);
      clearSelectedContacts();
    } catch (error) {
      toast.error("Failed to delete some contacts");
    }
  };

  if (isLoading && contacts.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading contacts...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-4 flex-shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Contacts
              </h1>
              {contacts.length > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  {contacts.length}
                </span>
              )}
              {selectedContacts.length > 0 && (
                <span className="px-2.5 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  {selectedContacts.length} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Import</span>
              </button>
              <button
                onClick={() => setIsColumnManagerOpen(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Cog6ToothIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Columns</span>
              </button>
              {selectedContacts.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              <button
                onClick={() => setIsAddSlideOverOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Add Contact</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Divider */}
        <div className="mx-4 sm:mx-6 lg:mx-8 border-t border-zinc-200 dark:border-zinc-800" />

        {/* Table Header with Search */}
        {(contacts.length > 0 || isLoading) && (
          <ContactsTableHeader
            onAddContact={() => setIsAddSlideOverOpen(true)}
            onImportContacts={() => setIsImportModalOpen(true)}
            onToggleColumnManager={() => setIsColumnManagerOpen(true)}
            onBulkDelete={handleBulkDelete}
            workspaceId={workspaceId}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {contacts.length === 0 && !isLoading ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center py-16 px-4"
            >
              <div className="text-center max-w-md">
                <UserGroupIcon className="w-12 h-12 mx-auto text-zinc-300 dark:text-zinc-600 mb-4" />
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  No contacts yet
                </h2>
                <p className="text-sm text-zinc-500 mb-6">
                  Start building your CRM by adding your first contact. Track
                  interactions, manage relationships, and grow your business.
                </p>
                <button
                  onClick={() => setIsAddSlideOverOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm"
                >
                  <PlusIcon className="w-4 h-4" />
                  Add Your First Contact
                </button>
              </div>
            </motion.div>
          ) : (
            /* Table */
            <div className="h-full">
              <ContactsTable
                contacts={contacts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                workspaceId={workspaceId}
              />
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Forms */}
      <AddContactSlideOver
        isOpen={isAddSlideOverOpen}
        onClose={() => setIsAddSlideOverOpen(false)}
        workspaceId={workspaceId}
      />

      <EditContactSlideOver
        isOpen={isEditSlideOverOpen}
        onClose={() => {
          setIsEditSlideOverOpen(false);
          setSelectedContact(null);
        }}
        workspaceId={workspaceId}
        contact={selectedContact}
      />

      <ColumnManager
        isOpen={isColumnManagerOpen}
        onClose={() => setIsColumnManagerOpen(false)}
      />

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setContactToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmText="Delete Contact"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete Selected Contacts"
        message={`Are you sure you want to delete ${selectedContacts.length} contact(s)? This action cannot be undone.`}
        confirmText={`Delete ${selectedContacts.length} Contacts`}
        cancelText="Cancel"
        variant="danger"
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        workspaceId={workspaceId}
        type="contacts"
        onSuccess={() => fetchContacts(workspaceId)}
      />
    </>
  );
}
