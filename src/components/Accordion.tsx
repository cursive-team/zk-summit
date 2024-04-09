"use client";
import { ReactNode, useState } from "react";
import { Icons } from "./Icons";
import { cn } from "@/lib/client/utils";

interface AccordionProps {
  label: string;
  children?: ReactNode;
}

const Accordion = ({ label, children }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-col p-3 bg-white/40" aria-expanded={isOpen}>
      <div
        className="grid grid-cols-[1fr_16px] gap-1 justify-between items-center cursor-pointer"
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        <span className="font-sans text-sm font-semibold leading-6 text-iron-600">
          {label}
        </span>
        <Icons.ArrowUp
          size={16}
          className={cn("duration-200", {
            "transform rotate-180": !isOpen,
          })}
        />
      </div>
      <div className="overflow-hidden box-border transition-all duration-300 ease-in-out">
        <div
          className={cn(
            "block overflow-hidden max-h-0 duration-200 ease-in-out",
            isOpen
              ? "grid-rows-[1fr] opacity-100 max-h-full"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <p className="block overflow-hidden pt-4 text-primary text-sm leading-5 font-sans font-normal">
            {children}
          </p>
        </div>
      </div>
    </div>
  );
};

Accordion.displayName = "Accordion";
export { Accordion };
