"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useContactStore } from "@/store/useContactStore";
import { Contact } from "@/lib/api/contact";
import ContactsTableHeader from "@/components/contacts/ContactsTableHeader";
import ContactsTable from "@/components/contacts/ContactsTable";
import AddContactModal from "@/components/contacts/AddContactModal";
import EditContactModal from "@/components/contacts/EditContactModal";
import ColumnManager from "@/components/contacts/ColumnManager";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function ContactsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { contacts, isLoading, fetchContacts, deleteContact } = useContactStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isColumnManagerOpen, setIsColumnManagerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);

  // Fetch contacts on mount
  useEffect(() => {
    if (workspaceId) {
      fetchContacts(workspaceId);
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

  if (isLoading && contacts.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 px-8 pt-14 pb-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-neutral-400">Loading contacts...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-neutral-900 px-8 pt-14 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Contacts</h1>
          <p className="text-sm text-neutral-400">
            Manage your customer relationships and contacts
          </p>
        </motion.div>

        {/* Table Header with Search and Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ContactsTableHeader
            onAddContact={() => setIsAddModalOpen(true)}
            onToggleColumnManager={() => setIsColumnManagerOpen(true)}
            workspaceId={workspaceId}
          />
        </motion.div>

        {/* Contacts Table or Empty State */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {contacts.length === 0 && !isLoading ? (
            /* Empty State */
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 bg-neutral-800/50 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <UserGroupIcon className="w-8 h-8 text-neutral-500" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  No contacts yet
                </h2>
                <p className="text-sm text-neutral-400 mb-6">
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
            /* Table View */
            <ContactsTable
              contacts={contacts}
              onEdit={handleEdit}
              onDelete={handleDelete}
              workspaceId={workspaceId}
            />
          )}
        </motion.div>
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
    </>
  );
}
