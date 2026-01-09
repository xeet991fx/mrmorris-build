import { forwardRef } from "react";
import { Listbox } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectDropdownProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

const SelectDropdown = forwardRef<HTMLDivElement, SelectDropdownProps>(
  ({ options, value, onChange, placeholder = "Select an option", error }, ref) => {
    const selectedOption = options.find((opt) => opt.value === value);

    return (
      <Listbox value={value} onChange={onChange}>
        <div className="relative" ref={ref}>
          <Listbox.Button
            className={cn(
              "relative w-full px-3 py-2 pr-10 bg-zinc-50 dark:bg-zinc-800/50 border-0 rounded-lg text-left text-zinc-900 dark:text-zinc-100 transition-all outline-none cursor-pointer focus:ring-2",
              error
                ? "focus:ring-red-500/20 ring-2 ring-red-500/40"
                : "focus:ring-emerald-500/30"
            )}
          >
            <span className={cn(selectedOption ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500")}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-900 shadow-lg py-1 ring-1 ring-zinc-200 dark:ring-zinc-800">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  cn(
                    "relative cursor-pointer select-none py-2 pl-9 pr-4 transition-colors",
                    active ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-700 dark:text-zinc-300"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={cn("block truncate text-sm", selected ? "font-medium" : "font-normal")}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-500">
                        <CheckIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    );
  }
);

SelectDropdown.displayName = "SelectDropdown";

export default SelectDropdown;
