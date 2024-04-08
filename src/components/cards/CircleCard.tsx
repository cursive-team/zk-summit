import Image from "next/image";
import type * as Classed from "@tw-classed/react";
import { IconCircle } from "../IconCircle";

type CardIconType = "person" | "location" | "proof";

type CardIconVariants = Classed.VariantProps<typeof IconCircle>;

const CardIconMapping: Record<CardIconType, string> = {
  person: "/icons/person.svg",
  location: "/icons/location.svg",
  proof: "/icons/proof.svg",
};

interface CircleCardProps extends CardIconVariants {
  icon: CardIconType;
  isMultiple?: boolean; // have multiple icons
}

const IconSizeMapping: Record<"xs" | "sm" | "md", number> = {
  xs: 10,
  sm: 18,
  md: 24,
};

const IconSizeClass: Record<"xs" | "sm" | "md", string> = {
  xs: "h-[10px]",
  sm: "h-[18px]",
  md: "h-[32px]",
};

const CircleCard = ({ icon, color, border }: CircleCardProps) => {
  const iconSize = IconSizeMapping["xs"];
  const iconSizeClass = IconSizeClass["xs"];

  return (
    <IconCircle color={color} border={border}>
      <Image
        src={CardIconMapping[icon]}
        height={iconSize}
        width={iconSize}
        className={iconSizeClass}
        alt={`${icon} icon`}
      />
    </IconCircle>
  );
};

CircleCard.displayName = "CircleCard";
export { CircleCard };
