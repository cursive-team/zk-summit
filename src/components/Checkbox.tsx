import { classed } from "@tw-classed/react";
import { Icons } from "./Icons";
import { useState } from "react";

type CheckboxType = "checkbox" | "button";
interface CheckboxProps
  extends Omit<React.HTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  type?: CheckboxType; // show the checkbox as a button or a regular checkbox
}

const CheckboxBase = classed.label(
  "duration-300 bg-transparent peer-checked:bg-gray-200 w-full flex border border-gray-400 text-sm justify-center items-center rounded-[4px] cursor-pointer py-[18px] overflow-hidden"
);

const CheckboxComponent = classed.label(
  CheckboxBase,
  "relative before:absolute before:left-0 before:flex before:h-full before:w-full before:items-center before:justify-center before:transition-[background-color] before:duration-100 before:ease-in before:content-[''] peer-checked:before:text-white peer-checked:before:transition-[background-color] peer-checked:before:duration-100 peer-checked:before:ease-in",
  {
    variants: {
      disable: {
        true: "opacity-50 pointer-events-none",
      },
    },
  }
);

const CheckboxLabelBase = classed.span("font-normal font-normal", {
  variants: {
    disabled: {
      true: "opacity-50 pointer-events-none",
    },
  },
  defaultVariants: {
    disabled: false,
  },
});
const CheckboxTitle = classed.span(CheckboxLabelBase, "text-sm");
const CheckboxDescription = classed.span(
  CheckboxLabelBase,
  "ml-6 text-sm text-gray-11"
);

const CheckboxSquareBase = classed.div(
  "flex relative rounded-[1px] h-[14px] w-[14px] border border-gray-600",
  {
    variants: {
      checked: {
        true: "border-gray-12 before:bg-gray-12",
      },
      disabled: {
        true: "opacity-50 pointer-events-none",
      },
    },
    defaultVariants: {
      checked: false,
    },
  }
);

const CheckboxSquare = classed.div(
  CheckboxSquareBase,
  "absolute before:duration-200 before:m-auto before:rounded-[1px] duration-200 before:content-[''] before:h-[8px] before:w-[8px]"
);

const CheckboxButton = ({ label, disabled, id, checked }: CheckboxProps) => {
  return (
    <CheckboxComponent disable={disabled} htmlFor={id}>
      <div className="absolute right-[6px] top-[6px]">
        {checked ? (
          <Icons.checkedCircle />
        ) : (
          <div className="rounded-full h-[14px] w-[14px] border border-gray-600"></div>
        )}
      </div>
      <span>{label}</span>
    </CheckboxComponent>
  );
};

const CheckboxDefault = ({
  label,
  description,
  disabled,
  id,
  checked,
}: CheckboxProps) => {
  return (
    <label
      htmlFor={id}
      className="before:content-[''] relative flex flex-col gap-1 items-start before:absolute before:left-0 before:flex before:h-full before:w-full"
    >
      <div className="flex gap-2 items-center">
        <CheckboxSquare checked={checked} disabled={disabled} />
        <CheckboxTitle disabled={disabled}>{label}</CheckboxTitle>
      </div>
      {description && <CheckboxDescription>{description}</CheckboxDescription>}
    </label>
  );
};

const Checkbox = (checkboxProps: CheckboxProps) => {
  const {
    label,
    disabled,
    id,
    checked,
    type = "checkbox",
    onChange,
    ...props
  } = checkboxProps;

  const CheckboxComponentMapping: Record<
    CheckboxType,
    React.FC<CheckboxProps>
  > = {
    checkbox: () => CheckboxDefault(checkboxProps),
    button: () => CheckboxButton(checkboxProps),
  };

  return (
    <div className="relative flex items-center">
      <input
        type="checkbox"
        className="hidden peer"
        id={id}
        checked={checked}
        disabled={disabled}
        onChange={() => {
          onChange?.(!checked);
        }}
        {...props}
      />
      {CheckboxComponentMapping[type](checkboxProps)}
    </div>
  );
};

Checkbox.displayName = "Checkbox";

export { Checkbox };
