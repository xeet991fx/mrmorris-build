import { forwardRef } from "react";
import { motion } from "framer-motion";
import { CheckIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface CheckboxOption {
  value: string;
  label: string;
  description?: string;
}

interface CheckboxGroupProps {
  options: CheckboxOption[];
  value: string[];
  onChange: (value: string[]) => void;
  columns?: 1 | 2 | 3;
  error?: boolean;
}

const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ options, value, onChange, columns = 2, error }, ref) => {
    const handleToggle = (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "grid gap-3",
          columns === 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        )}
      >
        {options.map((option) => {
          const isChecked = value.includes(option.value);

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              className={cn(
                "relative p-4 rounded-lg text-left cursor-pointer transition-all duration-100 bg-neutral-700/50 backdrop-blur-sm border",
                isChecked
                  ? "border-[#9ACD32]/50 bg-[#9ACD32]/10"
                  : error
                  ? "border-red-500/50 hover:border-red-500/70"
                  : "border-neutral-600/50 hover:border-neutral-600"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-100",
                    isChecked
                      ? "bg-[#9ACD32] border-[#9ACD32]"
                      : "bg-transparent border-neutral-500"
                  )}
                >
                  {isChecked && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <CheckIcon className="w-3 h-3 text-neutral-900" />
                    </motion.div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">{option.label}</p>
                  {option.description && (
                    <p className="text-sm text-neutral-400 mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

CheckboxGroup.displayName = "CheckboxGroup";

export default CheckboxGroup;
