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
          "w-full px-4 py-2.5 bg-neutral-700/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-neutral-400 transition-all duration-100 outline-none resize-none",
          "scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-700/50",
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-neutral-600/50 focus:border-[#9ACD32] focus:ring-2 focus:ring-[#9ACD32]/20",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
