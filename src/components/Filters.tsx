import { cn } from "@/lib/client/utils";
import { RadioGroup } from "@headlessui/react";
import { classed } from "@tw-classed/react";
import React, { useState } from "react";

const RadioOptionItem = classed.div(
  "whitespace-nowrap border border-gray-400 text-xs font-normal rounded px-3 py-2 duration-200 ease-in-out cursor-pointer leading-none",
  {
    variants: {
      checked: {
        true: "bg-gray-400 text-white",
        false: "bg-gray-200 text-white",
      },
    },
  }
);

interface FiltersProps {
  object?: Record<string, string>;
  defaultValue?: string;
  onChange?: (value: any) => void;
  disabled?: boolean;
  label?: string;
}

const Filters = ({
  object = {},
  defaultValue,
  onChange,
  disabled,
  label,
}: FiltersProps) => {
  let [option, setOption] = useState(defaultValue);

  const handleChange = (value: any) => {
    setOption(value);
    if (onChange) onChange(value);
  };

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className="text-xs text-gray-900 font-normal">{label}</span>
      )}
      <RadioGroup
        className={cn("flex gap-2 overflow-scroll", {
          "opacity-50": disabled,
        })}
        value={option}
        onChange={handleChange}
        disabled={disabled}
      >
        {Object.entries(object).map(([key, label]) => {
          return (
            <RadioGroup.Option key={key} value={key}>
              {({ checked }) => (
                <RadioOptionItem checked={checked}>{label}</RadioOptionItem>
              )}
            </RadioGroup.Option>
          );
        })}
      </RadioGroup>
    </div>
  );
};

Filters.displayName = "Filters";
export { Filters };
