import { classed } from "@tw-classed/react";
import { CSSProperties, HTMLAttributes, useEffect, useState } from "react";

const CardBase = classed.div("relative rounded overflow-hidden ", {
  variants: {
    variant: {
      primary: "bg-tertiary border border-iron-950/10",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});
const CardTitle = classed.h1("text-sm leading-5 text-iron-600 font-bold");
const CardDescription = classed.span(
  "text-xs leading-4 text-iron-600 font-bold"
);
const Artwork = classed.div("rounded-[8px] p-0 m-0");

const CardProgressLine = classed.div("absolute bottom-0 left-0 right-0 h-1", {
  variants: {
    color: {
      white: "bg-white",
      black: "bg-[#323232]",
    },
  },
  defaultVariants: {
    color: "white",
  },
});

const CardProgress = ({ style }: HTMLAttributes<HTMLDivElement>) => {
  const [delayStyle, setDelayStyle] = useState<CSSProperties>({ width: "0%" });

  useEffect(() => {
    // delay the style to allow the progress line to animate
    setTimeout(() => {
      setDelayStyle({ ...style });
    }, 100);
  }, [style]);

  return (
    <div className="absolute bottom-0 right-0 left-0 h-1">
      <CardProgressLine
        color="white"
        className="delay-50 duration-500 w-0"
        style={{
          zIndex: 1,
          ...delayStyle,
        }}
      />
      <CardProgressLine color="black" className="w-full" />
    </div>
  );
};

const Card = {
  displayName: "Card",
  Base: CardBase,
  Title: CardTitle,
  Description: CardDescription,
  Progress: CardProgress,
  Artwork: Artwork,
};

export { Card };
