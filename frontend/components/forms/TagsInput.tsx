import { forwardRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  error?: boolean;
  maxTags?: number;
}

const TagsInput = forwardRef<HTMLDivElement, TagsInputProps>(
  ({ value, onChange, placeholder = "Type and press Enter", error, maxTags }, ref) => {
    const [input, setInput] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && input.trim()) {
        e.preventDefault();
        if (maxTags && value.length >= maxTags) {
          return;
        }
        if (!value.includes(input.trim())) {
          onChange([...value, input.trim()]);
        }
        setInput("");
      } else if (e.key === "Backspace" && !input && value.length > 0) {
        onChange(value.slice(0, -1));
      }
    };

    const handleRemove = (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
      <div
        ref={ref}
        className={cn(
          "min-h-[48px] p-2 bg-slate-800/50 backdrop-blur-sm border rounded-lg transition-all",
          error
            ? "border-red-500/50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
            : "border-slate-700/50 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20"
        )}
      >
        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {value.map((tag) => (
              <motion.div
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500 }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 border border-violet-500/30 rounded-lg text-sm font-medium text-violet-300"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(tag)}
                  className="hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ""}
            disabled={maxTags ? value.length >= maxTags : false}
            className="flex-1 min-w-[200px] px-2 py-1 bg-transparent text-white placeholder:text-slate-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    );
  }
);

TagsInput.displayName = "TagsInput";

export default TagsInput;
