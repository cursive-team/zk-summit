import React from "react";
import { Card } from "./Card";
import { Icons } from "../Icons";

const CandyCard = () => {
  return (
    <Card.Base className="flex items-center gap-2 p-2">
      <Icons.candy />
      <div className="flex flex-col">
        <span className="text-sm font-normal text-gray-12">
          Share Candy with XXX
        </span>
        <span className="text-xs font-normal text-gray-11/60">
          Lorem ipsum dolor sit.
        </span>
      </div>
    </Card.Base>
  );
};

CandyCard.displayName = "CandyCard";
export { CandyCard };
