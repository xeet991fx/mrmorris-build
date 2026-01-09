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
import { Contact } from "@/lib/api/contact";
import { useContactStore, ContactColumn, BuiltInColumn } from "@/store/useContactStore";
import ContactTableRow from "./ContactTableRow";
import DraggableColumnHeader from "./DraggableColumnHeader";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  workspaceId: string;
}

const DEFAULT_COLUMN_LABELS: Record<BuiltInColumn, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  jobTitle: "Job Title",
  source: "Lead Source",
  notes: "Notes",
  status: "Status",
  leadScore: "Lead Score",
  createdAt: "Created Date",
};

export default function ContactsTable({
  contacts,
  onEdit,
  onDelete,
  workspaceId,
}: ContactsTableProps) {
  const {
    visibleColumns,
    columnOrder,
    columnWidths,
    selectedContacts,
    selectAllContacts,
    clearSelectedContacts,
    pagination,
    fetchContacts,
    reorderColumns,
    customColumns,
    columnLabels,
  } = useContactStore();

  // Function to get column label dynamically
  const getColumnLabel = (column: ContactColumn): string => {
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

  const [sortColumn, setSortColumn] = useState<ContactColumn | null>(null);
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
    contacts.length > 0 && selectedContacts.length === contacts.length;
  const someSelected = selectedContacts.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelectedContacts();
    } else {
      selectAllContacts();
    }
  };

  const handleSort = (column: ContactColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchContacts(workspaceId, { page: newPage, limit: pagination.limit });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columnOrder.indexOf(active.id as ContactColumn);
      const newIndex = columnOrder.indexOf(over.id as ContactColumn);
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
      <div className="h-full flex flex-col px-4 sm:px-6 lg:px-8">
        {/* Table Container - scrollable */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-max" style={{ tableLayout: 'fixed' }}>
            {/* Checkbox | Dynamic columns */}
            <colgroup>
              <col style={{ width: '40px' }} />
              {orderedVisibleColumns.map((column) => (
                <col key={column} style={{ width: `${columnWidths[column]}px` }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
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
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 checked:bg-emerald-500 checked:border-emerald-500 accent-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
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
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedVisibleColumns.length + 1}
                    className="px-4 py-12 text-center text-sm text-zinc-500"
                  >
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => (
                  <ContactTableRow
                    key={contact._id}
                    contact={contact}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    orderedColumns={orderedVisibleColumns}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Fixed at bottom */}
        {pagination.pages > 1 && (
          <div className="flex-shrink-0 py-3 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-white dark:bg-zinc-900">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Showing{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-200">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of <span className="font-medium text-zinc-700 dark:text-zinc-200">{pagination.total}</span>{" "}
              contacts
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                <ChevronLeftIcon className="w-4 h-4" />
              </button>

              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {pagination.page} of {pagination.pages}
              </span>

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
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
