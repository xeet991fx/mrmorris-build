import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  error?: boolean;
  showCurrency?: boolean;
  quickSelects?: number[];
  onValueChange?: (value: number) => void;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, error, showCurrency = true, quickSelects, onValueChange, value, ...props }, ref) => {
    const handleQuickSelect = (amount: number) => {
      if (onValueChange) {
        onValueChange(amount);
      }
    };

    return (
      <div className="space-y-3">
        <div className="relative">
          {showCurrency && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
              $
            </span>
          )}
          <input
            ref={ref}
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => {
              if (onValueChange) {
                onValueChange(parseFloat(e.target.value) || 0);
              }
            }}
            className={cn(
              "w-full py-3 bg-input backdrop-blur-sm border rounded-lg text-foreground placeholder:text-muted-foreground transition-all duration-100 outline-none",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              showCurrency ? "pl-8 pr-4" : "px-4",
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-border focus:border-[#9ACD32] focus:ring-2 focus:ring-[#9ACD32]/20",
              className
            )}
            {...props}
          />
        </div>

        {quickSelects && quickSelects.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quickSelects.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => handleQuickSelect(amount)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-100",
                  value === amount
                    ? "bg-[#9ACD32] text-background"
                    : "bg-muted border border-border text-foreground hover:border-border"
                )}
              >
                ${amount.toLocaleString()}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
