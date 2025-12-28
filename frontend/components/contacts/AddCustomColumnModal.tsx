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
        entityType: "contact" as const,
        fieldLabel: fieldLabel.trim(),
        fieldType,
        selectOptions:
          fieldType === "select"
            ? selectOptions.filter((opt) => opt.trim() !== "")
            : undefined,
        isRequired,
      };

      console.log("Creating custom column:", data);
      await createCustomColumn(workspaceId, data);
      console.log("Custom column created successfully");
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-card border border-border p-6 text-left align-middle shadow-xl transition-all">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-foreground"
                    >
                      Add Custom Column
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Column Label */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Column Label <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={fieldLabel}
                        onChange={(e) => setFieldLabel(e.target.value)}
                        placeholder="e.g., Annual Revenue"
                        maxLength={100}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-black transition-colors"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {fieldLabel.length}/100 characters
                      </p>
                    </div>

                    {/* Data Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
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
                                ? "border-black bg-black/10"
                                : "border-border hover:border-border"
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
                              className="mt-1 w-4 h-4 text-black focus:ring-primary focus:ring-offset-0"
                            />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-foreground">
                                {type.label}
                              </div>
                              <div className="text-xs text-muted-foreground">
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
                        <label className="block text-sm font-medium text-foreground mb-2">
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
                                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-black transition-colors"
                              />
                              {selectOptions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                  <TrashIcon className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={handleAddOption}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-black hover:bg-black/10 rounded-lg transition-colors"
                          >
                            <PlusIcon className="w-4 h-4" />
                            Add Option
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Is Required */}
                    <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4 rounded border-border bg-input text-black focus:ring-primary focus:ring-offset-0"
                      />
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          Required Field
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Users must provide a value for this field
                        </div>
                      </div>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isCreating}
                      className="px-4 py-2 text-sm font-medium text-background bg-white hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-black dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
