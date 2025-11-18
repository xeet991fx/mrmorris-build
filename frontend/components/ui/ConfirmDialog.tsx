"use client";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { ExclamationTriangleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantColors = {
    danger: {
      icon: "text-red-400",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-500",
      button: "bg-red-600 hover:bg-red-700",
    },
    warning: {
      icon: "text-amber-400",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-500",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    info: {
      icon: "text-blue-400",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-500",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const colors = variantColors[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          as={motion.div}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel
              as={motion.div}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-neutral-950/95 backdrop-blur-xl border border-neutral-900/50 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-start gap-4 p-6">
                <div
                  className={`flex-shrink-0 w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center shadow-lg`}
                >
                  <ExclamationTriangleIcon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <div className="flex-1">
                  <Dialog.Title className="text-xl font-bold text-white mb-2">
                    {title}
                  </Dialog.Title>
                  <p className="text-sm text-neutral-400">{message}</p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 p-2 rounded-lg hover:bg-neutral-900/50 text-neutral-400 hover:text-white transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 p-6 pt-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800/50 text-neutral-300 hover:text-white rounded-lg font-medium transition-all"
                >
                  {cancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className={`flex-1 px-4 py-3 ${colors.button} text-white font-semibold rounded-lg shadow-lg transition-all`}
                >
                  {confirmText}
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
