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
          "w-full px-4 py-2.5 bg-input backdrop-blur-sm border rounded-lg text-foreground placeholder:text-muted-foreground transition-all duration-100 outline-none resize-none",
          "scrollbar-thin scrollbar-thumb-border scrollbar-track-input",
          error
            ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-border focus:border-[#9ACD32] focus:ring-2 focus:ring-[#9ACD32]/20",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;
