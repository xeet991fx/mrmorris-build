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
            <span className="absolute left-4 top-1/2 -tranneutral-y-1/2 text-neutral-400 font-medium">
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
              "w-full py-3 bg-neutral-800/50 backdrop-blur-sm border rounded-lg text-white placeholder:text-neutral-500 transition-all duration-100 outline-none",
              "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
              showCurrency ? "pl-8 pr-4" : "px-4",
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-neutral-700/50 focus:border-white/500 focus:ring-2 focus:ring-white/500/20",
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
                    ? "bg-white/500 text-white"
                    : "bg-neutral-800/50 border border-neutral-700/50 text-neutral-300 hover:border-white/500/50"
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
