import { classed } from "@tw-classed/react";

export const IconCircle = classed.div(
  "flex justify-center items-center h-6 w-6 rounded-full text-primary",
  {
    variants: {
      color: {
        primary: "bg-white/40",
        secondary: "bg-tertiary",
      },
      border: {
        true: "border-2 border-iron-200",
      },
    },
    defaultVariants: {
      color: "primary",
      border: false,
    },
  }
);
