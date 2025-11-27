import { Fragment, useState } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useContactStore, ContactColumn, BuiltInColumn } from "@/store/useContactStore";
import { cn } from "@/lib/utils";
import AddCustomColumnModal from "./AddCustomColumnModal";
import EditCustomColumnModal from "./EditCustomColumnModal";
import DeleteColumnConfirmation from "./DeleteColumnConfirmation";
import type { CustomColumnDefinition } from "@/lib/api/customField";

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const BUILT_IN_COLUMN_LABELS: Record<BuiltInColumn, string> = {
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

export default function ColumnManager({ isOpen, onClose }: ColumnManagerProps) {
  const {
    visibleColumns,
    setVisibleColumns,
    resetColumnConfiguration,
    customColumns,
    protectedColumns,
    columnLabels,
    updateColumnLabel,
    resetColumnLabel,
  } = useContactStore();

  const [selectedTab, setSelectedTab] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CustomColumnDefinition | null>(null);
  const [deletingColumn, setDeletingColumn] = useState<CustomColumnDefinition | null>(null);

  // Get all available columns (built-in + custom active columns)
  const allColumns: Array<{ value: ContactColumn; label: string; isCustom: boolean; isProtected: boolean }> = [
    ...Object.entries(BUILT_IN_COLUMN_LABELS).map(([value, label]) => ({
      value: value as BuiltInColumn,
      label,
      isCustom: false,
      isProtected: protectedColumns.includes(value as BuiltInColumn),
    })),
    ...customColumns
      .filter((col) => col.isActive)
      .map((col) => ({
        value: col.fieldKey,
        label: col.fieldLabel,
        isCustom: true,
        isProtected: false,
      })),
  ];

  const toggleColumn = (column: ContactColumn) => {
    if (visibleColumns.includes(column)) {
      // Prevent hiding all columns - keep at least one
      if (visibleColumns.length > 1) {
        setVisibleColumns(visibleColumns.filter((c) => c !== column));
      }
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  const handleReset = () => {
    resetColumnConfiguration();
    onClose();
  };

  const handleEditColumn = (column: CustomColumnDefinition) => {
    setEditingColumn(column);
  };

  const handleDeleteClick = (column: CustomColumnDefinition) => {
    setDeletingColumn(column);
    setEditingColumn(null);
  };

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
    return BUILT_IN_COLUMN_LABELS[column as BuiltInColumn] || column;
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-xl bg-neutral-800 border border-neutral-700/50 p-6 text-left align-middle shadow-xl transition-all">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-white"
                      >
                        Manage Columns
                      </Dialog.Title>
                      <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Tabs */}
                    <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                      <Tab.List className="flex space-x-1 rounded-lg bg-neutral-900 p-1 mb-6">
                        <Tab
                          className={({ selected }) =>
                            cn(
                              "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                              "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-neutral-900 ring-[#9ACD32]/50",
                              selected
                                ? "bg-neutral-700 text-white shadow"
                                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                            )
                          }
                        >
                          Show/Hide
                        </Tab>
                        <Tab
                          className={({ selected }) =>
                            cn(
                              "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                              "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-neutral-900 ring-[#9ACD32]/50",
                              selected
                                ? "bg-neutral-700 text-white shadow"
                                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                            )
                          }
                        >
                          Custom Columns
                        </Tab>
                        <Tab
                          className={({ selected }) =>
                            cn(
                              "w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors",
                              "focus:outline-none focus:ring-2 ring-offset-2 ring-offset-neutral-900 ring-[#9ACD32]/50",
                              selected
                                ? "bg-neutral-700 text-white shadow"
                                : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                            )
                          }
                        >
                          Edit Labels
                        </Tab>
                      </Tab.List>

                      <Tab.Panels>
                        {/* Tab 1: Show/Hide Columns */}
                        <Tab.Panel className="space-y-2">
                          <p className="text-sm text-neutral-400 mb-4">
                            Select which columns to display in the contacts table. You can also
                            drag column headers to reorder them and drag their edges to resize.
                          </p>

                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {allColumns.map((column) => {
                              const isVisible = visibleColumns.includes(column.value);
                              const isOnlyVisible = isVisible && visibleColumns.length === 1;

                              return (
                                <label
                                  key={column.value}
                                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-700/30 transition-colors cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isVisible}
                                    onChange={() => toggleColumn(column.value)}
                                    disabled={isOnlyVisible}
                                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span
                                    className={cn(
                                      "text-sm flex-1",
                                      isVisible ? "text-white" : "text-neutral-400"
                                    )}
                                  >
                                    {getColumnLabel(column.value)}
                                  </span>
                                  {column.isCustom && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                      Custom
                                    </span>
                                  )}
                                  {column.isProtected && (
                                    <LockClosedIcon className="w-4 h-4 text-neutral-500" title="Protected column" />
                                  )}
                                  {isOnlyVisible && (
                                    <span className="text-xs text-neutral-500 ml-auto">
                                      (Required)
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </Tab.Panel>

                        {/* Tab 2: Custom Columns */}
                        <Tab.Panel className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-neutral-400">
                              Create and manage custom columns for tracking additional data.
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowAddModal(true)}
                              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-900 bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors"
                            >
                              <PlusIcon className="w-4 h-4" />
                              Add Column
                            </button>
                          </div>

                          {customColumns.filter((col) => col.isActive).length === 0 ? (
                            <div className="py-12 text-center">
                              <div className="mx-auto w-16 h-16 rounded-full bg-neutral-700/50 flex items-center justify-center mb-4">
                                <PlusIcon className="w-8 h-8 text-neutral-500" />
                              </div>
                              <p className="text-sm text-neutral-400 mb-4">
                                No custom columns yet. Click &quot;Add Column&quot; to create one.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                              {customColumns
                                .filter((col) => col.isActive)
                                .sort((a, b) => a.order - b.order)
                                .map((column) => (
                                  <div
                                    key={column._id}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-700/30 hover:bg-neutral-700/50 transition-colors"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-white">
                                          {column.fieldLabel}
                                        </span>
                                        <span
                                          className={cn(
                                            "text-xs px-2 py-0.5 rounded capitalize",
                                            column.fieldType === "text" &&
                                              "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                                            column.fieldType === "number" &&
                                              "bg-green-500/10 text-green-400 border border-green-500/20",
                                            column.fieldType === "select" &&
                                              "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                          )}
                                        >
                                          {column.fieldType}
                                        </span>
                                        {column.isRequired && (
                                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-neutral-500 font-mono mt-1">
                                        {column.fieldKey}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleEditColumn(column)}
                                      className="p-2 rounded-lg hover:bg-neutral-600 text-neutral-400 hover:text-white transition-colors"
                                      title="Edit column"
                                    >
                                      <PencilIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeletingColumn(column)}
                                      className="p-2 rounded-lg hover:bg-neutral-600 text-neutral-400 hover:text-red-400 transition-colors"
                                      title="Delete column"
                                    >
                                      <TrashIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                            </div>
                          )}
                        </Tab.Panel>

                        {/* Tab 3: Edit Labels */}
                        <Tab.Panel className="space-y-4">
                          <p className="text-sm text-neutral-400 mb-4">
                            Customize how column names appear in the table.
                          </p>

                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {allColumns.map((column) => {
                              const currentLabel = getColumnLabel(column.value);
                              const hasCustomLabel = !!columnLabels[column.value];

                              return (
                                <div
                                  key={column.value}
                                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-700/30"
                                >
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-neutral-500 font-mono">
                                        {column.value}
                                      </span>
                                      {column.isCustom && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                          Custom
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      type="text"
                                      value={currentLabel}
                                      onChange={(e) =>
                                        updateColumnLabel(column.value, e.target.value)
                                      }
                                      className="w-full px-2 py-1 bg-neutral-700 border border-neutral-600 rounded text-sm text-white focus:outline-none focus:border-[#9ACD32] transition-colors"
                                    />
                                  </div>
                                  {!column.isCustom && hasCustomLabel && (
                                    <button
                                      type="button"
                                      onClick={() => resetColumnLabel(column.value)}
                                      className="px-3 py-1 text-xs text-neutral-400 hover:text-white hover:bg-neutral-600 rounded transition-colors"
                                      title="Reset to default"
                                    >
                                      Reset
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </Tab.Panel>
                      </Tab.Panels>
                    </Tab.Group>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-neutral-700/50 mt-6">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                        title="Reset columns, order, and widths to defaults"
                      >
                        Reset All
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-neutral-900 bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Modals */}
      <AddCustomColumnModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />
      <EditCustomColumnModal
        isOpen={!!editingColumn}
        onClose={() => setEditingColumn(null)}
        column={editingColumn}
        onDelete={() => handleDeleteClick(editingColumn!)}
      />
      <DeleteColumnConfirmation
        isOpen={!!deletingColumn}
        onClose={() => setDeletingColumn(null)}
        column={deletingColumn}
        onSuccess={() => setDeletingColumn(null)}
      />
    </>
  );
}
