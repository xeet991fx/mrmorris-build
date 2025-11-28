import { forwardRef } from "react";
import { RadioGroup as HeadlessRadioGroup } from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  columns?: 1 | 2 | 3;
  error?: boolean;
}

const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ options, value, onChange, columns = 1, error }, ref) => {
    return (
      <HeadlessRadioGroup value={value || undefined} onChange={onChange}>
        <div
          ref={ref}
          className={cn(
            "grid gap-3",
            columns === 1 && "grid-cols-1",
            columns === 2 && "grid-cols-1 sm:grid-cols-2",
            columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {options.map((option) => (
            <HeadlessRadioGroup.Option key={option.value} value={option.value}>
              {({ checked }) => (
                <div
                  className={cn(
                    "relative p-4 rounded-lg cursor-pointer transition-all duration-100 bg-input backdrop-blur-sm border",
                    checked
                      ? "border-[#9ACD32]/50 bg-[#9ACD32]/10"
                      : error
                      ? "border-red-500/50 hover:border-red-500/70"
                      : "border-border hover:border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {option.icon && (
                      <div className="flex-shrink-0 text-muted-foreground">
                        {option.icon}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <HeadlessRadioGroup.Label
                          as="p"
                          className="font-medium text-foreground"
                        >
                          {option.label}
                        </HeadlessRadioGroup.Label>
                        {checked && (
                          <CheckCircleIcon className="w-5 h-5 text-[#9ACD32] flex-shrink-0" />
                        )}
                      </div>
                      {option.description && (
                        <HeadlessRadioGroup.Description
                          as="p"
                          className="text-sm text-muted-foreground mt-1"
                        >
                          {option.description}
                        </HeadlessRadioGroup.Description>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }
);

RadioGroup.displayName = "RadioGroup";

export default RadioGroup;
