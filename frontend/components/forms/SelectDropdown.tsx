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
              "relative w-full px-4 py-2.5 pr-10 bg-neutral-700/50 backdrop-blur-sm border rounded-lg text-left text-white transition-all duration-100 outline-none cursor-pointer",
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                : "border-neutral-600/50 focus:border-[#9ACD32] focus:ring-2 focus:ring-[#9ACD32]/20"
            )}
          >
            <span className={cn(selectedOption ? "text-white" : "text-neutral-400")}>
              {selectedOption?.label || placeholder}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <ChevronUpDownIcon className="h-5 w-5 text-neutral-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-2 max-h-60 w-full overflow-auto rounded-lg bg-neutral-700 border border-neutral-600 shadow-xl py-1 scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-700/50">
            {options.map((option) => (
              <Listbox.Option
                key={option.value}
                value={option.value}
                className={({ active }) =>
                  cn(
                    "relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors",
                    active ? "bg-[#9ACD32]/10 text-white" : "text-neutral-300"
                  )
                }
              >
                {({ selected }) => (
                  <>
                    <span className={cn("block truncate", selected ? "font-semibold" : "font-normal")}>
                      {option.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-white">
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
