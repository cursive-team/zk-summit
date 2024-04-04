import { HTMLAttributes } from "react";
import { PointCard } from "./PointCard";
import { Placeholder } from "../placeholders/Placeholder";

interface StoreCardProps extends HTMLAttributes<HTMLDivElement> {
  partnerName: string;
  itemName: string;
  itemId: number;
  pointsRequired: number;
  imageUrl: string;
  isSoldOut: boolean;
}

const StoreCardPlaceholder = () => (
  <div className="flex flex-col gap-2">
    <Placeholder.Card className="h-[174px]" />
    <div className="flex flex-col gap-0.5">
      <div className="flex flex-col gap-1">
        <Placeholder.Line size="xs" className="!w-8" />
        <Placeholder.Line size="xs" className="!w-10" />
      </div>
      <Placeholder.Line size="xs" className="!w-6" />
    </div>
  </div>
);

const StoreCard = ({
  partnerName,
  itemName,
  itemId,
  pointsRequired,
  imageUrl,
  isSoldOut,
  ...props
}: StoreCardProps) => {
  return (
    <div className="flex flex-col gap-2" {...props}>
      <div className="rounded-[2px] overflow-hidden">
        <img
          className="object-cover w-full h-[160px] xs:h-[174px] bg-slate-200 bg-center"
          alt={`${partnerName} store item`}
          src={imageUrl}
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex flex-col">
          <span className="text-xs font-normal text-gray-900">
            {partnerName}
          </span>
          <h2 className="text-sm text-gray-12">{itemName}</h2>
        </div>
        {isSoldOut ? (
          <span className="text-xs font-normal text-gray-900">Sold Out</span>
        ) : pointsRequired > 0 ? (
          <PointCard className="self-start" point={pointsRequired} />
        ) : null}
      </div>
    </div>
  );
};

StoreCard.displayName = "StoreCard";
StoreCard.Placeholder = StoreCardPlaceholder;

export { StoreCard };
