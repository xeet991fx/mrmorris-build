import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-4 py-3 bg-slate-800/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-slate-500 transition-all outline-none resize-none",
          "scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50",
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

Textarea.displayName = "Textarea";

export default Textarea;
