import { classed } from "@tw-classed/react";
import { Card } from "../cards/Card";
import { ReactNode } from "react";

type PlaceholderType = "card" | "line";

interface PlaceholderPlaceholderProps {
  type?: PlaceholderType;
  items?: number;
}

const PlaceholderBase = classed.div("bg-slate-100 animate-pulse");
const PlaceholderCard = classed.div(
  PlaceholderBase,
  Card.Base,
  "min-h-[120px] bg-slate-100"
);

const PlaceholderLine = classed.div(PlaceholderBase, "!bg-tertiary", {
  variants: {
    size: {
      tiny: "h-0.5",
      xs: "h-2",
      sm: "h-4",
      md: "h-6",
      lg: "h-8",
      xl: "h-10",
    },
    width: {
      xs: "w-1/4",
      sm: "w-1/2",
      md: "w-2/3",
      lg: "w-full",
    },
  },
  defaultVariants: {
    size: "md",
    width: "lg",
  },
});

const PlaceholderCircle = classed.div(
  PlaceholderBase,
  "!bg-slate-200 block rounded-full",
  {
    variants: {
      size: {
        sm: "h-4 w-4",
        md: "h-6 w-6",
        lg: "h-8 w-8",
        xl: "h-12 w-12",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const PlaceholderComponentMapping: Record<PlaceholderType, ReactNode> = {
  card: <PlaceholderCard />,
  line: <PlaceholderLine />,
};

const ListByTypePlaceholder = ({
  items: placeholderItems = 1,
  type = "card",
}: PlaceholderPlaceholderProps) => {
  return Array.from(Array(placeholderItems).keys()).map((_item, index) => {
    return <>{PlaceholderComponentMapping?.[type]}</>;
  });
};

const Placeholder = {
  displayName: "Placeholder",
  List: ListByTypePlaceholder,
  Line: PlaceholderLine,
  Card: PlaceholderCard,
  Circle: PlaceholderCircle,
};

export { Placeholder };
