import { create } from "zustand";
import { persist } from "zustand/middleware";
import * as companyApi from "@/lib/api/company";
import * as customFieldApi from "@/lib/api/customField";
import type {
  Company,
  CreateCompanyData,
  UpdateCompanyData,
  CompanyQueryParams,
} from "@/lib/api/company";
import type { CustomColumnDefinition } from "@/lib/api/customField";

export type BuiltInColumn =
  | "name"
  | "industry"
  | "website"
  | "phone"
  | "companySize"
  | "annualRevenue"
  | "employeeCount"
  | "status"
  | "source"
  | "notes"
  | "createdAt";

export type CompanyColumn = BuiltInColumn | string; // string for custom field keys

// Default column widths in pixels
export const DEFAULT_COLUMN_WIDTHS: Record<BuiltInColumn, number> = {
  name: 192,
  industry: 144,
  website: 208,
  phone: 144,
  companySize: 128,
  annualRevenue: 144,
  employeeCount: 144,
  status: 112,
  source: 144,
  notes: 256,
  createdAt: 144,
};

// Default column order
export const DEFAULT_COLUMN_ORDER: BuiltInColumn[] = [
  "name",
  "industry",
  "website",
  "phone",
  "companySize",
  "annualRevenue",
  "employeeCount",
  "status",
  "source",
  "createdAt",
  "notes",
];

interface CompanyState {
  companies: Company[];
  currentCompany: Company | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  selectedCompanies: string[]; // Company IDs
  visibleColumns: CompanyColumn[];
  columnOrder: CompanyColumn[]; // Order of columns
  columnWidths: Record<string, number>; // Custom widths in pixels (dynamic keys)
  editingCell: { companyId: string; column: CompanyColumn } | null; // Currently editing cell
  searchQuery: string;
  filters: {
    status?: "lead" | "prospect" | "customer" | "churned";
    assignedTo?: string;
    tags?: string[];
    industry?: string;
    companySize?: "1-10" | "11-50" | "51-200" | "201-500" | "501-1000" | "1000+";
  };
  customColumns: CustomColumnDefinition[]; // Custom field definitions
  columnLabels: Record<string, string>; // Custom display labels
  protectedColumns: BuiltInColumn[]; // Cannot be deleted

  // Actions
  fetchCompanies: (
    workspaceId: string,
    params?: CompanyQueryParams
  ) => Promise<void>;
  fetchCompany: (workspaceId: string, companyId: string) => Promise<void>;
  createCompany: (
    workspaceId: string,
    data: CreateCompanyData
  ) => Promise<Company>;
  updateCompany: (
    workspaceId: string,
    companyId: string,
    data: UpdateCompanyData
  ) => Promise<void>;
  deleteCompany: (workspaceId: string, companyId: string) => Promise<void>;
  setCurrentCompany: (company: Company | null) => void;
  setSearchQuery: (query: string) => void;
  setFilters: (
    filters: Partial<CompanyState["filters"]>
  ) => void;
  setVisibleColumns: (columns: CompanyColumn[]) => void;
  toggleCompanySelection: (companyId: string) => void;
  clearSelectedCompanies: () => void;
  selectAllCompanies: () => void;
  clearError: () => void;

  // Column customization actions
  reorderColumns: (fromIndex: number, toIndex: number) => void;
  resizeColumn: (column: CompanyColumn, width: number) => void;
  setEditingCell: (cell: { companyId: string; column: CompanyColumn } | null) => void;
  updateCompanyField: (
    workspaceId: string,
    companyId: string,
    column: CompanyColumn,
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
  updateColumnLabel: (column: CompanyColumn, label: string) => void;
  resetColumnLabel: (column: CompanyColumn) => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      companies: [],
      currentCompany: null,
      isLoading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0,
      },
      selectedCompanies: [],
      visibleColumns: [
        "name",
        "industry",
        "website",
        "phone",
        "companySize",
        "annualRevenue",
        "employeeCount",
        "status",
        "source",
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
      protectedColumns: ["name"],

      /**
       * Fetch all companies for a workspace
       */
      fetchCompanies: async (workspaceId: string, params?: CompanyQueryParams) => {
        set({ isLoading: true, error: null });

        try {
          const response = await companyApi.getCompanies(workspaceId, params);

          if (response.success && response.data) {
            set({
              companies: response.data.companies,
              pagination: response.data.pagination,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to fetch companies. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Fetch a single company
       */
      fetchCompany: async (workspaceId: string, companyId: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await companyApi.getCompany(workspaceId, companyId);

          if (response.success && response.data) {
            set({
              currentCompany: response.data.company,
              isLoading: false,
            });
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to fetch company. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Create a new company
       */
      createCompany: async (workspaceId: string, data: CreateCompanyData) => {
        set({ isLoading: true, error: null });

        try {
          const response = await companyApi.createCompany(workspaceId, data);

          if (response.success && response.data) {
            const newCompany = response.data.company;

            set((state) => ({
              companies: [newCompany, ...state.companies],
              isLoading: false,
            }));

            return newCompany;
          }

          throw new Error("Failed to create company");
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to create company. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Update a company
       */
      updateCompany: async (
        workspaceId: string,
        companyId: string,
        data: UpdateCompanyData
      ) => {
        set({ isLoading: true, error: null });

        try {
          const response = await companyApi.updateCompany(
            workspaceId,
            companyId,
            data
          );

          if (response.success && response.data) {
            const updatedCompany = response.data.company;

            set((state) => ({
              companies: state.companies.map((c) =>
                c._id === companyId ? updatedCompany : c
              ),
              currentCompany:
                state.currentCompany?._id === companyId
                  ? updatedCompany
                  : state.currentCompany,
              isLoading: false,
            }));
          }
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to update company. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Delete a company
       */
      deleteCompany: async (workspaceId: string, companyId: string) => {
        set({ isLoading: true, error: null });

        try {
          await companyApi.deleteCompany(workspaceId, companyId);

          set((state) => ({
            companies: state.companies.filter((c) => c._id !== companyId),
            currentCompany:
              state.currentCompany?._id === companyId
                ? null
                : state.currentCompany,
            selectedCompanies: state.selectedCompanies.filter(
              (id) => id !== companyId
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          const errorMessage =
            error.response?.data?.error ||
            "Failed to delete company. Please try again.";

          set({
            error: errorMessage,
            isLoading: false,
          });

          throw error;
        }
      },

      /**
       * Set current company (for editing)
       */
      setCurrentCompany: (company: Company | null) => {
        set({ currentCompany: company });
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
      setFilters: (filters: Partial<CompanyState["filters"]>) => {
        set((state) => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      /**
       * Set visible columns
       */
      setVisibleColumns: (columns: CompanyColumn[]) => {
        set({ visibleColumns: columns });
      },

      /**
       * Toggle company selection
       */
      toggleCompanySelection: (companyId: string) => {
        set((state) => ({
          selectedCompanies: state.selectedCompanies.includes(companyId)
            ? state.selectedCompanies.filter((id) => id !== companyId)
            : [...state.selectedCompanies, companyId],
        }));
      },

      /**
       * Clear selected companies
       */
      clearSelectedCompanies: () => {
        set({ selectedCompanies: [] });
      },

      /**
       * Select all companies
       */
      selectAllCompanies: () => {
        set((state) => ({
          selectedCompanies: state.companies.map((c) => c._id),
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
      resizeColumn: (column: CompanyColumn, width: number) => {
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
      setEditingCell: (cell: { companyId: string; column: CompanyColumn } | null) => {
        set({ editingCell: cell });
      },

      /**
       * Update a single field of a company
       */
      updateCompanyField: async (
        workspaceId: string,
        companyId: string,
        column: CompanyColumn,
        value: any
      ) => {
        const { customColumns } = get();
        const customColumn = customColumns.find((col) => col.fieldKey === column);

        // Build update data based on column
        const updateData: UpdateCompanyData = {};

        if (customColumn) {
          // Handle custom field
          updateData.customFields = {
            [column]: value,
          };
        } else {
          // Map column to company field
          switch (column) {
            case "name":
              updateData.name = value;
              break;
            case "industry":
              updateData.industry = value;
              break;
            case "website":
              updateData.website = value;
              break;
            case "phone":
              updateData.phone = value;
              break;
            case "companySize":
              updateData.companySize = value;
              break;
            case "annualRevenue":
              updateData.annualRevenue = value;
              break;
            case "employeeCount":
              updateData.employeeCount = value;
              break;
            case "status":
              updateData.status = value;
              break;
            case "source":
              updateData.source = value;
              break;
            case "notes":
              updateData.notes = value;
              break;
            // createdAt is read-only, skip
          }
        }

        // Update via existing updateCompany action
        await get().updateCompany(workspaceId, companyId, updateData);

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
            "industry",
            "website",
            "phone",
            "companySize",
            "annualRevenue",
            "employeeCount",
            "status",
            "source",
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
          const response = await customFieldApi.getCustomColumns(
            workspaceId,
            "company"
          );
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

          // Ensure entityType is set to "company"
          const companyData = { ...data, entityType: "company" as const };

          const response = await customFieldApi.createCustomColumn(workspaceId, companyData);
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
      updateColumnLabel: (column: CompanyColumn, label: string) => {
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
      resetColumnLabel: (column: CompanyColumn) => {
        set((state) => {
          const newLabels = { ...state.columnLabels };
          delete newLabels[column];
          return { columnLabels: newLabels };
        });
      },
    }),
    {
      name: "company-storage",
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
