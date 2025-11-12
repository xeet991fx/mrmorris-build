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
              "relative w-full px-4 py-3 pr-10 bg-slate-800/50 backdrop-blur-sm border rounded-lg text-left text-white transition-all outline-none cursor-pointer",
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-slate-700/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            )}
          >
            <span className={cn(selectedOption ? "text-white" : "text-slate-500")}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-slate-500" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/50">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  cn(
                    "relative cursor-pointer select-none py-3 pl-10 pr-4 transition-colors",
                    active ? "bg-violet-500/20 text-white" : "text-slate-300"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={cn("block truncate", selected ? "font-semibold" : "font-normal")}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-violet-400">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
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
