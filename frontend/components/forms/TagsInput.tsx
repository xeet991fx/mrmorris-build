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
          "min-h-[48px] p-2 bg-input backdrop-blur-sm border rounded-lg transition-all duration-100",
          error
            ? "border-red-500/50 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
            : "border-border focus-within:border-[#9ACD32] focus-within:ring-2 focus-within:ring-[#9ACD32]/20"
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9ACD32]/20 border border-[#9ACD32]/30 rounded-lg text-sm font-medium text-foreground"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(tag)}
                  className="hover:text-foreground transition-colors"
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
            className="flex-1 min-w-[200px] px-2 py-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>
    );
  }
);

TagsInput.displayName = "TagsInput";

export default TagsInput;
