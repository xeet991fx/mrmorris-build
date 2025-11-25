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
import { useContactStore, ContactColumn } from "@/store/useContactStore";
import ContactTableRow from "./ContactTableRow";
import DraggableColumnHeader from "./DraggableColumnHeader";
import { cn } from "@/lib/utils";

interface ContactsTableProps {
  contacts: Contact[];
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  workspaceId: string;
}

const COLUMN_LABELS: Record<ContactColumn, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  company: "Company",
  jobTitle: "Job Title",
  source: "Lead Source",
  notes: "Notes",
  status: "Status",
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
  } = useContactStore();

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
      <div>
        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-neutral-700/50">
          <table className="w-full" style={{ tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '48px' }} /> {/* Checkbox */}
              {orderedVisibleColumns.map((column) => (
                <col key={column} style={{ width: `${columnWidths[column]}px` }} />
              ))}
              <col style={{ width: '48px' }} /> {/* Actions */}
            </colgroup>
            <thead className="bg-neutral-800/50">
              <tr className="border-b border-neutral-700/50 group">
                {/* Checkbox Header */}
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someSelected;
                      }
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
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
                      label={COLUMN_LABELS[column]}
                      width={columnWidths[column]}
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  ))}
                </SortableContext>

                {/* Actions Header */}
                <th className="px-4 py-3 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.length === 0 ? (
                <tr>
                  <td
                    colSpan={orderedVisibleColumns.length + 2}
                    className="px-4 py-12 text-center text-sm text-neutral-500"
                  >
                    No contacts found
                  </td>
                </tr>
              ) : (
                contacts.map((contact, index) => (
                  <ContactTableRow
                    key={contact._id}
                    contact={contact}
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
          <p className="text-sm text-neutral-400">
            Showing{" "}
            <span className="font-medium text-white">
              {(pagination.page - 1) * pagination.limit + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-white">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="font-medium text-white">{pagination.total}</span>{" "}
            contacts
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              className="px-3 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:text-white hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>

            <span className="text-sm text-neutral-400">
              Page {pagination.page} of {pagination.pages}
            </span>

            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1.5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:text-white hover:border-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
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
