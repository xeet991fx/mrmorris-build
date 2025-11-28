import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useContactStore } from "@/store/useContactStore";
import type { CustomColumnDefinition } from "@/lib/api/customField";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";

interface DeleteColumnConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  column: CustomColumnDefinition | null;
  onSuccess?: () => void;
}

export default function DeleteColumnConfirmation({
  isOpen,
  onClose,
  column,
  onSuccess,
}: DeleteColumnConfirmationProps) {
  const params = useParams();
  const workspaceId = params.id as string;
  const { deleteCustomColumn, contacts } = useContactStore();

  const [step, setStep] = useState(1);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Count contacts with data in this column
  const contactsWithData = column
    ? contacts.filter(
        (contact) =>
          contact.customFields?.[column.fieldKey] !== undefined &&
          contact.customFields?.[column.fieldKey] !== null &&
          contact.customFields?.[column.fieldKey] !== ""
      ).length
    : 0;

  const handleClose = () => {
    setStep(1);
    setDeleteMode("soft");
    setConfirmText("");
    onClose();
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && deleteMode === "hard") {
      setStep(3);
    } else {
      handleDelete();
    }
  };

  const handleDelete = async () => {
    if (!column) return;

    // For hard delete, require typing the column name
    if (deleteMode === "hard" && confirmText !== column.fieldLabel) {
      toast.error("Column name doesn't match");
      return;
    }

    setIsDeleting(true);
    try {
      await deleteCustomColumn(workspaceId, column._id, deleteMode === "hard");
      toast.success(
        deleteMode === "hard"
          ? "Column and all data deleted successfully"
          : "Column hidden successfully. Data has been preserved."
      );
      handleClose();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete column");
    } finally {
      setIsDeleting(false);
    }
  };

  const canContinue = () => {
    if (step === 3) {
      return confirmText === column?.fieldLabel;
    }
    return true;
  };

  if (!column) return null;

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
                  key={step}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/10">
                        <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                      </div>
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-semibold text-foreground"
                      >
                        {step === 1 && "Delete Column?"}
                        {step === 2 && "Choose Deletion Mode"}
                        {step === 3 && "Confirm Deletion"}
                      </Dialog.Title>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Step 1: Initial Warning */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm text-foreground">
                        Are you sure you want to delete the column{" "}
                        <span className="font-semibold text-foreground">
                          &quot;{column.fieldLabel}&quot;
                        </span>
                        ?
                      </p>

                      {contactsWithData > 0 && (
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <p className="text-sm text-amber-400">
                            <span className="font-semibold">{contactsWithData}</span>{" "}
                            {contactsWithData === 1 ? "contact has" : "contacts have"} data
                            in this column.
                          </p>
                        </div>
                      )}

                      <p className="text-sm text-muted-foreground">
                        In the next step, you&apos;ll choose whether to hide the column (preserving
                        data) or permanently delete it.
                      </p>
                    </div>
                  )}

                  {/* Step 2: Choose Deletion Mode */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm text-foreground mb-4">
                        What should happen to the data in this column?
                      </p>

                      <div className="space-y-3">
                        {/* Soft Delete */}
                        <label
                          className={cn(
                            "flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors",
                            deleteMode === "soft"
                              ? "border-[#9ACD32] bg-[#9ACD32]/10"
                              : "border-border hover:border-border"
                          )}
                        >
                          <input
                            type="radio"
                            name="deleteMode"
                            value="soft"
                            checked={deleteMode === "soft"}
                            onChange={(e) => setDeleteMode("soft")}
                            className="mt-1 w-4 h-4 text-[#9ACD32] focus:ring-[#9ACD32] focus:ring-offset-0"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                              Hide Column, Keep Data
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                Recommended
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              The column will be hidden from the table, but all data will be
                              preserved. You can restore the column later if needed.
                            </p>
                          </div>
                        </label>

                        {/* Hard Delete */}
                        <label
                          className={cn(
                            "flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors",
                            deleteMode === "hard"
                              ? "border-red-500 bg-red-500/10"
                              : "border-border hover:border-border"
                          )}
                        >
                          <input
                            type="radio"
                            name="deleteMode"
                            value="hard"
                            checked={deleteMode === "hard"}
                            onChange={(e) => setDeleteMode("hard")}
                            className="mt-1 w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-offset-0"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-foreground">
                              Delete Column AND All Data
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              The column definition and all data will be permanently deleted.{" "}
                              {contactsWithData > 0 && (
                                <span className="text-red-400 font-medium">
                                  {contactsWithData}{" "}
                                  {contactsWithData === 1 ? "contact" : "contacts"} will lose
                                  this data.
                                </span>
                              )}{" "}
                              This action cannot be undone.
                            </p>
                          </div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Type to Confirm (for hard delete) */}
                  {step === 3 && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                        <p className="text-sm text-red-400 font-medium">
                          ⚠️ This action is permanent and cannot be undone!
                        </p>
                      </div>

                      <p className="text-sm text-foreground">
                        Type <span className="font-mono font-semibold text-foreground">&quot;{column.fieldLabel}&quot;</span> to
                        confirm deletion:
                      </p>

                      <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={column.fieldLabel}
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-red-500 transition-colors"
                        autoFocus
                      />

                      {contactsWithData > 0 && (
                        <p className="text-xs text-red-400">
                          {contactsWithData} {contactsWithData === 1 ? "contact" : "contacts"}{" "}
                          will permanently lose this data.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isDeleting}
                      className="px-4 py-2 text-sm font-medium text-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={isDeleting || !canContinue()}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                        step === 3 || (step === 2 && deleteMode === "hard")
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-[#9ACD32] hover:bg-[#8AB82E] text-background"
                      )}
                    >
                      {isDeleting
                        ? "Deleting..."
                        : step === 3
                        ? "Delete Column"
                        : step === 2 && deleteMode === "soft"
                        ? "Hide Column"
                        : "Continue"}
                    </button>
                  </div>

                  {/* Progress Indicator */}
                  <div className="flex items-center justify-center gap-2 mt-4">
                    {[1, 2, deleteMode === "hard" ? 3 : 2].map((s, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          step > s
                            ? "bg-[#9ACD32]"
                            : step === s
                            ? "bg-[#9ACD32]"
                            : "bg-muted-foreground"
                        )}
                      />
                    ))}
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
