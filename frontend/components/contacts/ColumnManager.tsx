import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useContactStore, ContactColumn } from "@/store/useContactStore";

interface ColumnManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_COLUMNS: { value: ContactColumn; label: string }[] = [
  { value: "name", label: "Name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "company", label: "Company" },
  { value: "jobTitle", label: "Job Title" },
  { value: "source", label: "Lead Source" },
  { value: "notes", label: "Notes" },
  { value: "status", label: "Status" },
  { value: "createdAt", label: "Created Date" },
];

export default function ColumnManager({ isOpen, onClose }: ColumnManagerProps) {
  const { visibleColumns, setVisibleColumns, resetColumnConfiguration } = useContactStore();

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

  return (
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-neutral-800 border border-neutral-700/50 p-6 text-left align-middle shadow-xl transition-all">
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

                  <p className="text-sm text-neutral-400 mb-4">
                    Select which columns to display in the contacts table. You can also drag column headers to reorder them and drag their edges to resize.
                  </p>

                  {/* Column Checkboxes */}
                  <div className="space-y-2 mb-6">
                    {AVAILABLE_COLUMNS.map((column) => {
                      const isVisible = visibleColumns.includes(column.value);
                      const isOnlyVisible =
                        isVisible && visibleColumns.length === 1;

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
                            className={`text-sm ${
                              isVisible ? "text-white" : "text-neutral-400"
                            }`}
                          >
                            {column.label}
                          </span>
                          {isOnlyVisible && (
                            <span className="text-xs text-neutral-500 ml-auto">
                              (Required)
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-neutral-700/50">
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
  );
}
