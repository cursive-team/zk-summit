import { classed } from "@tw-classed/react";
import type * as Classed from "@tw-classed/react";
import { ReactNode } from "react";

const InputLabel = classed.div("text-iron-800", {
  variants: {
    size: {
      xs: "text-xs leading-4",
      sm: "text-sm leading-5",
    },
  },
  defaultVariants: {
    size: "xs",
  },
});

const InputDescription = classed.div("text-black text-xs leading-4");

const InputError = classed.div(
  "absolute text-error text-xs leading-4 -bottom-5"
);

const InputSpacing = classed.div("relative flex flex-col", {
  variants: {
    spacing: {
      true: "gap-[11px]",
    },
  },
  defaultVariants: {
    spacing: false,
  },
});

type InputLabelVariants = Classed.VariantProps<typeof InputLabel>;
type InputDescriptionVariants = Classed.VariantProps<typeof InputDescription>;
type InputSpacingVariants = Classed.VariantProps<typeof InputSpacing>;

export interface InputWrapperProps
  extends React.HTMLAttributes<HTMLDivElement>,
    InputLabelVariants,
    InputDescriptionVariants,
    InputSpacingVariants {
  label?: string;
  error?: string;
  description?: ReactNode;
  children: ReactNode;
}

const InputWrapper = ({
  label,
  children,
  description,
  error, // error message to display
  size,
  spacing, // spacing of label from input
  className = "",
}: InputWrapperProps) => {
  return (
    <InputSpacing spacing>
      <InputSpacing spacing={spacing}>
        {label && <InputLabel size={size}>{label}</InputLabel>}
        <div className={className}>{children}</div>
      </InputSpacing>
      {error ? (
        <InputError>{error}</InputError>
      ) : (
        <>{description && <InputDescription>{description}</InputDescription>}</>
      )}
    </InputSpacing>
  );
};

InputWrapper.displayName = "InputWrapper";

export { InputWrapper, InputDescription };
