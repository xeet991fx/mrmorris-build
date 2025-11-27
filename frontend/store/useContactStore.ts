import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as contactApi from "@/lib/api/contact";
import * as customFieldApi from "@/lib/api/customField";
import type {
  Contact,
  CreateContactData,
  UpdateContactData,
  ContactQueryParams,
} from "@/lib/api/contact";
import type { CustomColumnDefinition } from "@/lib/api/customField";

export type BuiltInColumn =
  | "name"
  | "email"
  | "phone"
  | "company"
  | "jobTitle"
  | "source"
  | "notes"
  | "status"
  | "createdAt";

export type ContactColumn = BuiltInColumn | string; // string for custom field keys

// Default column widths in pixels
export const DEFAULT_COLUMN_WIDTHS: Record<BuiltInColumn, number> = {
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
export const DEFAULT_COLUMN_ORDER: BuiltInColumn[] = [
  "name",
  "email",
  "phone",
  "company",
  "jobTitle",
  "source",
  "status",
  "createdAt",
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
  columnWidths: Record<string, number>; // Custom widths in pixels (dynamic keys)
  editingCell: { contactId: string; column: ContactColumn } | null; // Currently editing cell
  searchQuery: string;
  filters: {
    status?: "lead" | "prospect" | "customer" | "inactive";
    assignedTo?: string;
    tags?: string[];
  };
  customColumns: CustomColumnDefinition[]; // Custom field definitions
  columnLabels: Record<string, string>; // Custom display labels
  protectedColumns: BuiltInColumn[]; // Cannot be deleted

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

  // Custom column actions
  fetchCustomColumns: (workspaceId: string) => Promise<void>;
  createCustomColumn: (
    workspaceId: string,
    data: customFieldApi.CreateCustomColumnData
  ) => Promise<void>;
  updateCustomColumn: (
    workspaceId: string,
    fieldId: string,
    data: customFieldApi.UpdateCustomColumnData
  ) => Promise<void>;
  deleteCustomColumn: (
    workspaceId: string,
    fieldId: string,
    deleteData: boolean
  ) => Promise<void>;

  // Column label actions
  updateColumnLabel: (column: ContactColumn, label: string) => void;
  resetColumnLabel: (column: ContactColumn) => void;
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
        "status",
        "createdAt",
        "notes",
      ],
      columnOrder: DEFAULT_COLUMN_ORDER,
      columnWidths: DEFAULT_COLUMN_WIDTHS as Record<string, number>,
      editingCell: null,
      searchQuery: "",
      filters: {},
      customColumns: [],
      columnLabels: {},
      protectedColumns: ["name", "email"],

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
        const { customColumns } = get();
        const customColumn = customColumns.find((col) => col.fieldKey === column);

        // Build update data based on column
        const updateData: UpdateContactData = {};

        if (customColumn) {
          // Handle custom field
          updateData.customFields = {
            [column]: value,
          };
        } else {
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
          columnWidths: DEFAULT_COLUMN_WIDTHS as Record<string, number>,
          visibleColumns: [
            "name",
            "email",
            "phone",
            "company",
            "jobTitle",
            "source",
            "status",
            "createdAt",
            "notes",
          ],
        });
      },

      /**
       * Fetch custom columns for a workspace
       */
      fetchCustomColumns: async (workspaceId: string) => {
        try {
          const response = await customFieldApi.getCustomColumns(workspaceId);
          if (response.success && response.data) {
            set({ customColumns: response.data.customFields });
          }
        } catch (error: any) {
          console.error("Error fetching custom columns:", error);
          set({ error: "Failed to fetch custom columns" });
        }
      },

      /**
       * Create a new custom column
       */
      createCustomColumn: async (
        workspaceId: string,
        data: customFieldApi.CreateCustomColumnData
      ) => {
        try {
          console.log("Store: Creating custom column with data:", data);
          const response = await customFieldApi.createCustomColumn(workspaceId, data);
          console.log("Store: API response:", response);

          if (response.success && response.data) {
            const newColumn = response.data.customField;
            const fieldKey = newColumn.fieldKey;
            console.log("Store: New column created:", newColumn);

            // Update all related state in one call
            set((state) => ({
              customColumns: [...state.customColumns, newColumn],
              visibleColumns: [...state.visibleColumns, fieldKey],
              columnOrder: [...state.columnOrder, fieldKey],
            }));

            console.log("Store: Custom column added successfully");

            // Refetch to ensure consistency
            await get().fetchCustomColumns(workspaceId);
          } else {
            console.error("Store: API response missing data:", response);
            throw new Error(response.error || "Failed to create custom column");
          }
        } catch (error: any) {
          console.error("Store: Error creating custom column:", error);
          set({ error: "Failed to create custom column" });
          throw error;
        }
      },

      /**
       * Update a custom column
       */
      updateCustomColumn: async (
        workspaceId: string,
        fieldId: string,
        data: customFieldApi.UpdateCustomColumnData
      ) => {
        try {
          const response = await customFieldApi.updateCustomColumn(
            workspaceId,
            fieldId,
            data
          );
          if (response.success && response.data) {
            // Update the custom column in the store
            set((state) => ({
              customColumns: state.customColumns.map((col) =>
                col._id === fieldId ? response.data!.customField : col
              ),
            }));
          }
        } catch (error: any) {
          console.error("Error updating custom column:", error);
          set({ error: "Failed to update custom column" });
          throw error;
        }
      },

      /**
       * Delete a custom column
       */
      deleteCustomColumn: async (
        workspaceId: string,
        fieldId: string,
        deleteData: boolean
      ) => {
        try {
          const { protectedColumns } = get();

          // Find the column to check if it's protected
          const column = get().customColumns.find((col) => col._id === fieldId);
          if (
            column &&
            protectedColumns.includes(column.fieldKey as BuiltInColumn)
          ) {
            throw new Error("Cannot delete protected column");
          }

          const response = await customFieldApi.deleteCustomColumn(
            workspaceId,
            fieldId,
            deleteData
          );

          if (response.success) {
            if (deleteData) {
              // Hard delete: Remove from custom columns
              set((state) => ({
                customColumns: state.customColumns.filter(
                  (col) => col._id !== fieldId
                ),
              }));

              // Remove from visible columns and column order
              if (column) {
                const fieldKey = column.fieldKey;
                set((state) => ({
                  visibleColumns: state.visibleColumns.filter(
                    (col) => col !== fieldKey
                  ),
                  columnOrder: state.columnOrder.filter((col) => col !== fieldKey),
                }));
              }
            } else {
              // Soft delete: Update isActive flag
              set((state) => ({
                customColumns: state.customColumns.map((col) =>
                  col._id === fieldId ? { ...col, isActive: false } : col
                ),
              }));
            }
          }
        } catch (error: any) {
          console.error("Error deleting custom column:", error);
          set({ error: error.message || "Failed to delete custom column" });
          throw error;
        }
      },

      /**
       * Update column label
       */
      updateColumnLabel: (column: ContactColumn, label: string) => {
        set((state) => ({
          columnLabels: {
            ...state.columnLabels,
            [column]: label.trim(),
          },
        }));
      },

      /**
       * Reset column label to default
       */
      resetColumnLabel: (column: ContactColumn) => {
        set((state) => {
          const newLabels = { ...state.columnLabels };
          delete newLabels[column];
          return { columnLabels: newLabels };
        });
      },
    }),
    {
      name: "contact-storage",
      partialize: (state) => ({
        visibleColumns: state.visibleColumns,
        columnOrder: state.columnOrder,
        columnWidths: state.columnWidths,
        columnLabels: state.columnLabels,
        filters: state.filters,
      }),
    }
  )
);
