import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  helpText?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function FormField({
  label,
  icon,
  helpText,
  error,
  required = false,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
        {icon && <span className="text-slate-500">{icon}</span>}
        <span>
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </span>
      </label>

      {children}

      {helpText && !error && (
        <p className="text-xs text-slate-500">{helpText}</p>
      )}

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-400 flex items-center gap-1"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
