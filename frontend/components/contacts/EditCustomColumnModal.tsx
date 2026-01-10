import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useContactStore } from "@/store/useContactStore";
import type { CustomColumnDefinition } from "@/lib/api/customField";
import toast from "react-hot-toast";
import TextInput from "@/components/forms/TextInput";
import { cn } from "@/lib/utils";

interface EditCustomColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  column: CustomColumnDefinition | null;
  onDelete?: () => void;
}

export default function EditCustomColumnModal({
  isOpen,
  onClose,
  column,
  onDelete,
}: EditCustomColumnModalProps) {
  const params = useParams();
  const workspaceId = params.id as string;
  const { updateCustomColumn, customColumns } = useContactStore();

  const [fieldLabel, setFieldLabel] = useState("");
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [isRequired, setIsRequired] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (column) {
      setFieldLabel(column.fieldLabel);
      setSelectOptions(column.selectOptions || []);
      setIsRequired(column.isRequired);
    }
  }, [column]);

  const handleAddOption = () => {
    setSelectOptions([...selectOptions, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (selectOptions.length > 1) {
      setSelectOptions(selectOptions.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...selectOptions];
    newOptions[index] = value;
    setSelectOptions(newOptions);
  };

  const validateForm = (): string | null => {
    if (!fieldLabel.trim()) {
      return "Column label is required";
    }

    if (fieldLabel.length > 100) {
      return "Column label must be less than 100 characters";
    }

    // Check for duplicate labels (excluding current column)
    const existingLabels = customColumns
      .filter((col) => col._id !== column?._id)
      .map((col) => col.fieldLabel.toLowerCase());
    if (existingLabels.includes(fieldLabel.trim().toLowerCase())) {
      return "A column with this name already exists";
    }

    if (column?.fieldType === "select") {
      const validOptions = selectOptions.filter((opt) => opt.trim() !== "");
      if (validOptions.length === 0) {
        return "At least one option is required for dropdown fields";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    if (!column) return;

    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setIsUpdating(true);
    try {
      const data = {
        fieldLabel: fieldLabel.trim(),
        selectOptions:
          column.fieldType === "select"
            ? selectOptions.filter((opt) => opt.trim() !== "")
            : undefined,
        isRequired,
      };

      await updateCustomColumn(workspaceId, column._id, data);
      toast.success("Custom column updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update custom column");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!column) return null;

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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-xl font-semibold text-zinc-900 dark:text-zinc-100"
                    >
                      Edit Custom Column
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-5">
                    {/* Field Key (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Field Key
                      </label>
                      <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-500 dark:text-zinc-400 text-sm font-mono select-all">
                        {column.fieldKey}
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Cannot be changed after creation
                      </p>
                    </div>

                    {/* Data Type (read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Data Type
                      </label>
                      <div className="flex">
                        <span className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider",
                          column.fieldType === "text" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
                          column.fieldType === "number" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                          column.fieldType === "select" && "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        )}>
                          {column.fieldType}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Cannot be changed to prevent data loss
                      </p>
                    </div>

                    {/* Column Label (editable) */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Column Label <span className="text-red-500">*</span>
                      </label>
                      <TextInput
                        value={fieldLabel}
                        onChange={(e) => setFieldLabel(e.target.value)}
                        maxLength={100}
                        className="bg-zinc-50 dark:bg-zinc-800/50"
                      />
                      <p className="text-xs text-zinc-500 mt-1 text-right">
                        {fieldLabel.length}/100
                      </p>
                    </div>

                    {/* Dropdown Options (editable for select type) */}
                    {column.fieldType === "select" && (
                      <div className="space-y-3 p-4 bg-zinc-50 dark:bg-zinc-800/30 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Dropdown Options <span className="text-red-500">*</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center gap-1"
                          >
                            <PlusIcon className="w-3 h-3" />
                            Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {selectOptions.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <TextInput
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="bg-white dark:bg-zinc-800"
                              />
                              {selectOptions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-500 transition-colors"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Is Required (editable) */}
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-600 text-emerald-600 focus:ring-emerald-500/20"
                      />
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          Required Field
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Users must provide a value for this field
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={isUpdating}
                      className="px-4 py-2 text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      Delete Column
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={onClose}
                        disabled={isUpdating}
                        className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isUpdating}
                        className="px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
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
