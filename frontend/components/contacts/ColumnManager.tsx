import { Fragment, useState } from "react";
import { Dialog, Transition, Tab } from "@headlessui/react";
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, LockClosedIcon, CheckIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
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
  leadScore: "Lead Score",
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
    if (columnLabels[column]) {
      return columnLabels[column];
    }
    const customCol = customColumns.find((c) => c.fieldKey === column);
    if (customCol) {
      return customCol.fieldLabel;
    }
    return BUILT_IN_COLUMN_LABELS[column as BuiltInColumn] || column;
  };

  const tabItems = ["Visibility", "Custom Fields", "Labels"];

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          {/* Backdrop */}
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" />
          </Transition.Child>

          {/* Sidebar Panel */}
          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in duration-200"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-lg">
                    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 shadow-2xl">
                      {/* Header */}
                      <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-start justify-between">
                          <div>
                            <Dialog.Title className="text-xl font-semibold text-zinc-900 dark:text-white">
                              Manage Columns
                            </Dialog.Title>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                              Customize your contact table layout
                            </p>
                          </div>
                          <button
                            onClick={onClose}
                            className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 overflow-y-auto">
                        <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
                          <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 px-6 pt-4 pb-2">
                            <Tab.List className="flex gap-1 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800">
                              {tabItems.map((tab) => (
                                <Tab
                                  key={tab}
                                  className={({ selected }) =>
                                    cn(
                                      "flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 outline-none",
                                      selected
                                        ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm"
                                        : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                                    )
                                  }
                                >
                                  {tab}
                                </Tab>
                              ))}
                            </Tab.List>
                          </div>

                          <Tab.Panels className="px-6 py-4">
                            {/* Tab 1: Visibility */}
                            <Tab.Panel className="focus:outline-none">
                              <div className="space-y-3">
                                {allColumns.map((column, index) => {
                                  const isVisible = visibleColumns.includes(column.value);
                                  const isOnlyVisible = isVisible && visibleColumns.length === 1;

                                  return (
                                    <motion.button
                                      key={column.value}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.02 }}
                                      onClick={() => !isOnlyVisible && toggleColumn(column.value)}
                                      disabled={isOnlyVisible}
                                      className={cn(
                                        "w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-200",
                                        isVisible
                                          ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30"
                                          : "bg-zinc-50 dark:bg-zinc-800/50 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700",
                                        isOnlyVisible && "opacity-60 cursor-not-allowed"
                                      )}
                                    >
                                      <div
                                        className={cn(
                                          "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all",
                                          isVisible
                                            ? "bg-emerald-500 text-white"
                                            : "border-2 border-zinc-300 dark:border-zinc-600"
                                        )}
                                      >
                                        {isVisible && <CheckIcon className="w-3 h-3" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={cn(
                                          "text-sm font-medium block",
                                          isVisible ? "text-emerald-900 dark:text-emerald-100" : "text-zinc-700 dark:text-zinc-200"
                                        )}>
                                          {getColumnLabel(column.value)}
                                        </span>
                                      </div>
                                      {column.isCustom && (
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                                          Custom
                                        </span>
                                      )}
                                      {column.isProtected && (
                                        <LockClosedIcon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                                      )}
                                    </motion.button>
                                  );
                                })}
                              </div>
                            </Tab.Panel>

                            {/* Tab 2: Custom Fields */}
                            <Tab.Panel className="focus:outline-none">
                              <div className="space-y-4">
                                <button
                                  onClick={() => setShowAddModal(true)}
                                  className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all"
                                >
                                  <PlusIcon className="w-5 h-5" />
                                  <span className="text-sm font-medium">Add Custom Field</span>
                                </button>

                                {customColumns.filter((col) => col.isActive).length === 0 ? (
                                  <div className="py-12 text-center">
                                    <p className="text-sm text-zinc-400">No custom fields created yet</p>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    {customColumns
                                      .filter((col) => col.isActive)
                                      .sort((a, b) => a.order - b.order)
                                      .map((column, index) => (
                                        <motion.div
                                          key={column._id}
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: index * 0.05 }}
                                          className="group flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                                        >
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                                                {column.fieldLabel}
                                              </span>
                                              <span
                                                className={cn(
                                                  "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide",
                                                  column.fieldType === "text" && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                                                  column.fieldType === "number" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                                                  column.fieldType === "select" && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                                                )}
                                              >
                                                {column.fieldType}
                                              </span>
                                            </div>
                                            <span className="text-xs text-zinc-400 font-mono">{column.fieldKey}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <button
                                              onClick={() => handleEditColumn(column)}
                                              className="p-2 rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all"
                                            >
                                              <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={() => setDeletingColumn(column)}
                                              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-all"
                                            >
                                              <TrashIcon className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </motion.div>
                                      ))}
                                  </div>
                                )}
                              </div>
                            </Tab.Panel>

                            {/* Tab 3: Labels */}
                            <Tab.Panel className="focus:outline-none">
                              <div className="space-y-3">
                                {allColumns.map((column, index) => {
                                  const currentLabel = getColumnLabel(column.value);
                                  const hasCustomLabel = !!columnLabels[column.value];

                                  return (
                                    <motion.div
                                      key={column.value}
                                      initial={{ opacity: 0, x: 20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.02 }}
                                      className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                                    >
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-zinc-400 font-medium">
                                          {column.isCustom ? column.label : BUILT_IN_COLUMN_LABELS[column.value as BuiltInColumn]}
                                        </span>
                                        {column.isCustom && (
                                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
                                            Custom
                                          </span>
                                        )}
                                        {hasCustomLabel && !column.isCustom && (
                                          <button
                                            onClick={() => resetColumnLabel(column.value)}
                                            className="ml-auto text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                                          >
                                            Reset
                                          </button>
                                        )}
                                      </div>
                                      <input
                                        type="text"
                                        value={currentLabel}
                                        onChange={(e) => updateColumnLabel(column.value, e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-zinc-900 rounded-lg text-sm text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500 transition-colors"
                                        placeholder="Enter custom label"
                                      />
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </Tab.Panel>
                          </Tab.Panels>
                        </Tab.Group>
                      </div>

                      {/* Footer */}
                      <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={handleReset}
                            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-medium transition-colors"
                          >
                            Reset to defaults
                          </button>
                          <button
                            onClick={onClose}
                            className="px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Child Modals */}
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
