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
          "w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-slate-500 transition-all outline-none",
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-slate-700/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
          className
        )}
        {...props}
      />
    );
  }
);

TextInput.displayName = "TextInput";

export default TextInput;
