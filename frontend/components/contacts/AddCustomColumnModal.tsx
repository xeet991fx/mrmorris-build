import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useContactStore } from "@/store/useContactStore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import TextInput from "@/components/forms/TextInput";

interface AddCustomColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCustomColumnModal({
  isOpen,
  onClose,
}: AddCustomColumnModalProps) {
  const params = useParams();
  const workspaceId = params.id as string;
  const { createCustomColumn, customColumns } = useContactStore();

  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<"text" | "number" | "select">("text");
  const [selectOptions, setSelectOptions] = useState<string[]>([""]);
  const [isRequired, setIsRequired] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

    // Check for duplicate labels (case-insensitive)
    const existingLabels = customColumns.map((col) => col.fieldLabel.toLowerCase());
    if (existingLabels.includes(fieldLabel.trim().toLowerCase())) {
      return "A column with this name already exists";
    }

    if (fieldType === "select") {
      const validOptions = selectOptions.filter((opt) => opt.trim() !== "");
      if (validOptions.length === 0) {
        return "At least one option is required for dropdown fields";
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    setIsCreating(true);
    try {
      const data = {
        entityType: "contact" as const,
        fieldLabel: fieldLabel.trim(),
        fieldType,
        selectOptions:
          fieldType === "select"
            ? selectOptions.filter((opt) => opt.trim() !== "")
            : undefined,
        isRequired,
      };

      await createCustomColumn(workspaceId, data);
      toast.success("Custom column created successfully");
      handleClose();
    } catch (error: any) {
      console.error("Error creating custom column:", error);
      toast.error(error.message || "Failed to create custom column");
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setFieldLabel("");
    setFieldType("text");
    setSelectOptions([""]);
    setIsRequired(false);
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
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
                      Add Custom Column
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-2 -m-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-5">
                    {/* Column Label */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                        Column Label <span className="text-red-500">*</span>
                      </label>
                      <TextInput
                        value={fieldLabel}
                        onChange={(e) => setFieldLabel(e.target.value)}
                        placeholder="e.g., Annual Revenue"
                        maxLength={100}
                        className="bg-zinc-50 dark:bg-zinc-800/50"
                      />
                      <p className="text-xs text-zinc-500 mt-1 text-right">
                        {fieldLabel.length}/100
                      </p>
                    </div>

                    {/* Data Type */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Data Type <span className="text-red-500">*</span>
                      </label>
                      <div className="grid gap-3">
                        {[
                          { value: "text", label: "Text", description: "Single-line text input" },
                          { value: "number", label: "Number", description: "Numeric values only" },
                          { value: "select", label: "Dropdown", description: "Predefined options" },
                        ].map((type) => (
                          <label
                            key={type.value}
                            className={cn(
                              "flex items-start p-3 rounded-xl border cursor-pointer transition-all duration-200",
                              fieldType === type.value
                                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-500/50"
                                : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <input
                              type="radio"
                              name="fieldType"
                              value={type.value}
                              checked={fieldType === type.value}
                              onChange={(e) =>
                                setFieldType(e.target.value as "text" | "number" | "select")
                              }
                              className="mt-1 w-4 h-4 text-emerald-600 border-zinc-300 focus:ring-emerald-500/20"
                            />
                            <div className="ml-3">
                              <div className={cn(
                                "text-sm font-medium",
                                fieldType === type.value ? "text-emerald-900 dark:text-emerald-100" : "text-zinc-900 dark:text-zinc-100"
                              )}>
                                {type.label}
                              </div>
                              <div className={cn(
                                "text-xs mt-0.5",
                                fieldType === type.value ? "text-emerald-700 dark:text-emerald-300" : "text-zinc-500 dark:text-zinc-400"
                              )}>
                                {type.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Dropdown Options (conditional) */}
                    {fieldType === "select" && (
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

                    {/* Is Required */}
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
                  <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isCreating}
                      className="px-5 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? "Creating..." : "Create Column"}
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
