import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useContactStore } from "@/store/useContactStore";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

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
                      Add Custom Column
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Column Label */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Column Label <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={fieldLabel}
                        onChange={(e) => setFieldLabel(e.target.value)}
                        placeholder="e.g., Annual Revenue"
                        maxLength={100}
                        className="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-[#9ACD32] transition-colors"
                      />
                      <p className="text-xs text-neutral-400 mt-1">
                        {fieldLabel.length}/100 characters
                      </p>
                    </div>

                    {/* Data Type */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-300 mb-2">
                        Data Type <span className="text-red-400">*</span>
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: "text", label: "Text", description: "Single-line text input" },
                          { value: "number", label: "Number", description: "Numeric values only" },
                          { value: "select", label: "Dropdown", description: "Predefined options" },
                        ].map((type) => (
                          <label
                            key={type.value}
                            className={cn(
                              "flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors",
                              fieldType === type.value
                                ? "border-[#9ACD32] bg-[#9ACD32]/10"
                                : "border-neutral-700 hover:border-neutral-600"
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
                              className="mt-1 w-4 h-4 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
                            />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-white">
                                {type.label}
                              </div>
                              <div className="text-xs text-neutral-400">
                                {type.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Dropdown Options (conditional) */}
                    {fieldType === "select" && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">
                          Dropdown Options <span className="text-red-400">*</span>
                        </label>
                        <div className="space-y-2">
                          {selectOptions.map((option, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="flex-1 px-3 py-2 bg-neutral-700 border border-neutral-600 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:border-[#9ACD32] transition-colors"
                              />
                              {selectOptions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-2 rounded-lg hover:bg-neutral-700 text-neutral-400 hover:text-red-400 transition-colors"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#9ACD32] hover:bg-[#9ACD32]/10 rounded-lg transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Is Required */}
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-700/30 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-700 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-white">
                          Required Field
                        </div>
                        <div className="text-xs text-neutral-400">
                          Users must provide a value for this field
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-700/50">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-neutral-900 bg-[#9ACD32] hover:bg-[#8AB82E] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
