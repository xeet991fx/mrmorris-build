"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { UserGroupIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useContactStore } from "@/store/useContactStore";
import { Contact } from "@/lib/api/contact";
import ContactsTableHeader from "@/components/contacts/ContactsTableHeader";
import ContactsTable from "@/components/contacts/ContactsTable";
import AddContactModal from "@/components/contacts/AddContactModal";
import EditContactModal from "@/components/contacts/EditContactModal";
import ColumnManager from "@/components/contacts/ColumnManager";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import ImportModal from "@/components/import/ImportModal";

export default function ContactsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { contacts, isLoading, fetchContacts, deleteContact, fetchCustomColumns, selectedContacts, clearSelectedContacts } = useContactStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
    setIsEditModalOpen(true);
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
      <div className="min-h-screen bg-background px-8 pt-6 pb-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading contacts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-card/95 flex flex-col">
        {/* Page Header with Dividing Line */}
        <div className="h-12 px-6 border-b border-border flex items-center flex-shrink-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3"
          >
            <h1 className="text-lg font-semibold text-foreground">Contacts</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <InformationCircleIcon className="w-4 h-4" />
              <span>Manage your customer relationships</span>
            </div>
          </motion.div>
        </div>

        {/* Table Header with Search and Actions - Fixed */}
        {contacts.length > 0 || isLoading ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-shrink-0"
          >
            <ContactsTableHeader
              onAddContact={() => setIsAddModalOpen(true)}
              onImportContacts={() => setIsImportModalOpen(true)}
              onToggleColumnManager={() => setIsColumnManagerOpen(true)}
              onBulkDelete={handleBulkDelete}
              workspaceId={workspaceId}
            />
          </motion.div>
        ) : null}

        {/* Main Content - Scrollable Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {contacts.length === 0 && !isLoading ? (
              /* Empty State */
              <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-neutral-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <UserGroupIcon className="w-8 h-8 text-neutral-500" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    No contacts yet
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Start building your CRM by adding your first contact. Track
                    interactions, manage relationships, and let AI help you nurture
                    connections.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#9ACD32] text-neutral-900 font-medium text-sm rounded-lg hover:bg-[#8AB82E] transition-all shadow-sm hover:shadow"
                  >
                    Add Your First Contact
                  </button>
                </div>
              </div>
            ) : (
              /* Table Only */
              <ContactsTable
                contacts={contacts}
                onEdit={handleEdit}
                onDelete={handleDelete}
                workspaceId={workspaceId}
              />
            )}
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        workspaceId={workspaceId}
      />

      {selectedContact && (
        <EditContactModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedContact(null);
          }}
          workspaceId={workspaceId}
          contact={selectedContact}
        />
      )}

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
