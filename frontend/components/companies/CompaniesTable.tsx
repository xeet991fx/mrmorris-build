import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Company } from "@/lib/api/company";
import { useCompanyStore, CompanyColumn, BuiltInColumn } from "@/store/useCompanyStore";
import CompanyTableRow from "./CompanyTableRow";
import DraggableColumnHeader from "./DraggableColumnHeader";
import { cn } from "@/lib/utils";

interface CompaniesTableProps {
  companies: Company[];
  onEdit: (company: Company) => void;
  onDelete: (companyId: string) => void;
  workspaceId: string;
}

const DEFAULT_COLUMN_LABELS: Record<BuiltInColumn, string> = {
  name: "Company Name",
  industry: "Industry",
  website: "Website",
  phone: "Phone",
  companySize: "Company Size",
  annualRevenue: "Annual Revenue",
  employeeCount: "Employee Count",
  status: "Status",
  source: "Lead Source",
  notes: "Notes",
  createdAt: "Created Date",
};

export default function CompaniesTable({
  companies,
  onEdit,
  onDelete,
  workspaceId,
}: CompaniesTableProps) {
  const {
    visibleColumns,
    columnOrder,
    columnWidths,
    selectedCompanies,
    selectAllCompanies,
    clearSelectedCompanies,
    pagination,
    fetchCompanies,
    reorderColumns,
    customColumns,
    columnLabels,
  } = useCompanyStore();

  // Function to get column label dynamically
  const getColumnLabel = (column: CompanyColumn): string => {
    // Check for custom label override
    if (columnLabels[column]) {
      return columnLabels[column];
    }

    // Check if it's a custom column
    const customCol = customColumns.find((c) => c.fieldKey === column);
    if (customCol) {
      return customCol.fieldLabel;
    }

    // Fall back to default built-in label
    return DEFAULT_COLUMN_LABELS[column as BuiltInColumn] || column;
  };

  const [sortColumn, setSortColumn] = useState<CompanyColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Setup drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  const allSelected =
    companies.length > 0 && selectedCompanies.length === companies.length;
  const someSelected = selectedCompanies.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelectedCompanies();
    } else {
      selectAllCompanies();
    }
  };

  const handleSort = (column: CompanyColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchCompanies(workspaceId, { page: newPage, limit: pagination.limit });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as CompanyColumn);
      const newIndex = columnOrder.indexOf(over.id as CompanyColumn);
      reorderColumns(oldIndex, newIndex);
    }
  };

  // Get visible columns in the correct order
  const orderedVisibleColumns = columnOrder.filter((col) =>
    visibleColumns.includes(col)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div>
        {/* Table */}
        <div>
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '36px' }} /> {/* Checkbox */}
              {orderedVisibleColumns.map((column) => (
                <col key={column} style={{ width: `${columnWidths[column]}px` }} />
              ))}
              <col style={{ width: '36px' }} /> {/* Actions */}
            </colgroup>
            <thead className="bg-card/95">
              <tr className="border-b border-border group">
                {/* Checkbox Header */}
                <th className="px-4 py-2 w-9 h-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-border bg-input text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
                  />
                </th>

                {/* Draggable Column Headers */}
                <SortableContext
                  items={orderedVisibleColumns}
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedVisibleColumns.map((column) => (
                    <DraggableColumnHeader
                      key={column}
                      column={column}
                      label={getColumnLabel(column)}
                      width={columnWidths[column] || 150}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </SortableContext>

                {/* Actions Header */}
                <th className="px-4 py-2 w-9 h-8"></th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedVisibleColumns.length + 2}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No companies found
                  </td>
                </tr>
              ) : (
                companies.map((company, index) => (
                  <CompanyTableRow
                    key={company._id}
                    company={company}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    orderedColumns={orderedVisibleColumns}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-medium text-foreground">{pagination.total}</span>{" "}
              companies
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-lg bg-card/95 border border-border text-foreground hover:text-foreground hover:border-border disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 rounded-lg bg-card/95 border border-border text-foreground hover:text-foreground hover:border-border disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}
