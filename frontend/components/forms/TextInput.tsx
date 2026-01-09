import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        className={cn(
          "w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 transition-all outline-none focus:ring-2",
          error
            ? "focus:ring-red-500/20 ring-2 ring-red-500/40"
            : "focus:ring-emerald-500/30",
          className
        )}
        {...props}
      />
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
