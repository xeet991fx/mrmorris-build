import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as contactApi from "@/lib/api/contact";
import type {
  Contact,
  CreateContactData,
  UpdateContactData,
  ContactQueryParams,
} from "@/lib/api/contact";

export type ContactColumn =
  | "name"
  | "email"
  | "phone"
  | "company"
  | "jobTitle"
  | "source"
  | "notes"
  | "status"
  | "createdAt";

// Default column widths in pixels
export const DEFAULT_COLUMN_WIDTHS: Record<ContactColumn, number> = {
  name: 192,
  email: 208,
  phone: 144,
  company: 176,
  jobTitle: 160,
  source: 144,
  status: 112,
  notes: 256,
  createdAt: 144,
};

// Default column order
export const DEFAULT_COLUMN_ORDER: ContactColumn[] = [
  "name",
  "email",
  "phone",
  "company",
  "jobTitle",
  "source",
  "notes",
];

interface ContactState {
  contacts: Contact[];
  currentContact: Contact | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  selectedContacts: string[]; // Contact IDs
  visibleColumns: ContactColumn[];
  columnOrder: ContactColumn[]; // Order of columns
  columnWidths: Record<ContactColumn, number>; // Custom widths in pixels
  editingCell: { contactId: string; column: ContactColumn } | null; // Currently editing cell
  searchQuery: string;
  filters: {
    status?: "lead" | "prospect" | "customer" | "inactive";
    assignedTo?: string;
    tags?: string[];
  };

  // Actions
  fetchContacts: (
    workspaceId: string,
    params?: ContactQueryParams
  ) => Promise<void>;
  fetchContact: (workspaceId: string, contactId: string) => Promise<void>;
  createContact: (
    workspaceId: string,
    data: CreateContactData
  ) => Promise<Contact>;
  updateContact: (
    workspaceId: string,
    contactId: string,
    data: UpdateContactData
  ) => Promise<void>;
  deleteContact: (workspaceId: string, contactId: string) => Promise<void>;
  setCurrentContact: (contact: Contact | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (
    filters: Partial<ContactState["filters"]>
  ) => void;
  setVisibleColumns: (columns: ContactColumn[]) => void;
  toggleContactSelection: (contactId: string) => void;
  clearSelectedContacts: () => void;
  selectAllContacts: () => void;
  clearError: () => void;

  // Column customization actions
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  resizeColumn: (column: ContactColumn, width: number) => void;
  setEditingCell: (cell: { contactId: string; column: ContactColumn } | null) => void;
  updateContactField: (
    workspaceId: string,
    contactId: string,
    column: ContactColumn,
    value: any
  ) => Promise<void>;
  resetColumnConfiguration: () => void;
}

export const useContactStore = create<ContactState>()(
  persist(
    (set, get) => ({
      contacts: [],
      currentContact: null,
      isLoading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
      selectedContacts: [],
      visibleColumns: [
        "name",
        "email",
        "phone",
        "company",
        "jobTitle",
        "source",
        "notes",
      ],
      columnOrder: DEFAULT_COLUMN_ORDER,
      columnWidths: DEFAULT_COLUMN_WIDTHS,
      editingCell: null,
      searchQuery: "",
      filters: {},

      /**
       * Fetch all contacts for a workspace
       */
      fetchContacts: async (workspaceId: string, params?: ContactQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await contactApi.getContacts(workspaceId, params);

          if (response.success && response.data) {
            set({
              contacts: response.data.contacts,
              pagination: response.data.pagination,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to fetch contacts. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch a single contact
       */
      fetchContact: async (workspaceId: string, contactId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await contactApi.getContact(workspaceId, contactId);

          if (response.success && response.data) {
            set({
              currentContact: response.data.contact,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to fetch contact. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Create a new contact
       */
      createContact: async (workspaceId: string, data: CreateContactData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await contactApi.createContact(workspaceId, data);

          if (response.success && response.data) {
            const newContact = response.data.contact;

            set((state) => ({
              contacts: [newContact, ...state.contacts],
              isLoading: false,
            }));

            return newContact;
          }

          throw new Error("Failed to create contact");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to create contact. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Update a contact
       */
      updateContact: async (
        workspaceId: string,
        contactId: string,
        data: UpdateContactData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await contactApi.updateContact(
            workspaceId,
            contactId,
            data
          );

          if (response.success && response.data) {
            const updatedContact = response.data.contact;

            set((state) => ({
              contacts: state.contacts.map((c) =>
                c._id === contactId ? updatedContact : c
              ),
              currentContact:
                state.currentContact?._id === contactId
                  ? updatedContact
                  : state.currentContact,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to update contact. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Delete a contact
       */
      deleteContact: async (workspaceId: string, contactId: string) => {
        set({ isLoading: true, error: null });

        try {
          await contactApi.deleteContact(workspaceId, contactId);

          set((state) => ({
            contacts: state.contacts.filter((c) => c._id !== contactId),
            currentContact:
              state.currentContact?._id === contactId
                ? null
                : state.currentContact,
            selectedContacts: state.selectedContacts.filter(
              (id) => id !== contactId
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to delete contact. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Set current contact (for editing)
       */
      setCurrentContact: (contact: Contact | null) => {
        set({ currentContact: contact });
      },

      /**
       * Set search query
       */
      setSearchQuery: (query: string) => {
        set({ searchQuery: query });
      },

      /**
       * Set filters
       */
      setFilters: (filters: Partial<ContactState["filters"]>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      /**
       * Set visible columns
       */
      setVisibleColumns: (columns: ContactColumn[]) => {
        set({ visibleColumns: columns });
      },

      /**
       * Toggle contact selection
       */
      toggleContactSelection: (contactId: string) => {
        set((state) => ({
          selectedContacts: state.selectedContacts.includes(contactId)
            ? state.selectedContacts.filter((id) => id !== contactId)
            : [...state.selectedContacts, contactId],
        }));
      },

      /**
       * Clear selected contacts
       */
      clearSelectedContacts: () => {
        set({ selectedContacts: [] });
      },

      /**
       * Select all contacts
       */
      selectAllContacts: () => {
        set((state) => ({
          selectedContacts: state.contacts.map((c) => c._id),
        }));
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Reorder columns
       */
      reorderColumns: (fromIndex: number, toIndex: number) => {
        set((state) => {
          const newOrder = [...state.columnOrder];
          const [movedColumn] = newOrder.splice(fromIndex, 1);
          newOrder.splice(toIndex, 0, movedColumn);
          return { columnOrder: newOrder };
        });
      },

      /**
       * Resize a column
       */
      resizeColumn: (column: ContactColumn, width: number) => {
        // Enforce minimum width of 80px
        const constrainedWidth = Math.max(80, width);

        set((state) => ({
          columnWidths: {
            ...state.columnWidths,
            [column]: constrainedWidth,
          },
        }));
      },

      /**
       * Set editing cell
       */
      setEditingCell: (cell: { contactId: string; column: ContactColumn } | null) => {
        set({ editingCell: cell });
      },

      /**
       * Update a single field of a contact
       */
      updateContactField: async (
        workspaceId: string,
        contactId: string,
        column: ContactColumn,
        value: any
      ) => {
        // Build update data based on column
        const updateData: UpdateContactData = {};

        // Map column to contact field
        switch (column) {
          case "name":
            // Name is special - we need to handle first/last name
            // For now, we'll just update firstName
            // In a real implementation, you'd need better handling
            updateData.firstName = value;
            break;
          case "email":
            updateData.email = value;
            break;
          case "phone":
            updateData.phone = value;
            break;
          case "company":
            updateData.company = value;
            break;
          case "jobTitle":
            updateData.jobTitle = value;
            break;
          case "source":
            updateData.source = value;
            break;
          case "notes":
            updateData.notes = value;
            break;
          case "status":
            updateData.status = value;
            break;
          // createdAt is read-only, skip
        }

        // Update via existing updateContact action
        await get().updateContact(workspaceId, contactId, updateData);

        // Clear editing state
        set({ editingCell: null });
      },

      /**
       * Reset column configuration to defaults
       */
      resetColumnConfiguration: () => {
        set({
          columnOrder: DEFAULT_COLUMN_ORDER,
          columnWidths: DEFAULT_COLUMN_WIDTHS,
          visibleColumns: [
            "name",
            "email",
            "phone",
            "company",
            "jobTitle",
            "source",
            "notes",
          ],
        });
      },
    }),
    {
      name: "contact-storage",
      partialize: (state) => ({
        visibleColumns: state.visibleColumns,
        columnOrder: state.columnOrder,
        columnWidths: state.columnWidths,
        filters: state.filters,
      }),
    }
  )
);
