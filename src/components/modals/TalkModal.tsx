import { ModalProps, Modal } from "./Modal";
import { Card } from "../cards/Card";
import { classed } from "@tw-classed/react";
import Link from "next/link";
import { Button } from "../Button";
import { Icons } from "../Icons";

export interface TalkModalProps {
  stageName: string;
  shortDescription: string;
  title?: string;
  description?: string;
  speakerName?: string;
  links?: { label: string; url: string; external?: boolean }[];
}

const Title = classed.span("text-iron-800 text-xs font-normal font-sans");
const Description = classed.h5("text-iron-950 font-normal text-sm");

const TalkModal = ({
  isOpen,
  setIsOpen,
  stageName,
  speakerName,
  description,
  shortDescription,
  links,
}: TalkModalProps & ModalProps) => {
  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      <div className="flex flex-col gap-4">
        <Card.Base
          className="!border-primary/10 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/bg-gradient-card.png')",
          }}
        >
          <div className="flex flex-col py-4 px-3 min-h-[180px]">
            <span className="text-primary text-xs font-semibold font-sans">
              {stageName}
            </span>
            <h5 className="mt-auto text-primary font-medium text-[21px] leading-[21px]">
              {shortDescription}
            </h5>
          </div>
        </Card.Base>
        {speakerName && (
          <div className="flex flex-col gap-1">
            <Title>Speaker</Title>
            <Description>{speakerName}</Description>
          </div>
        )}
        {description && (
          <div className="flex flex-col gap-1">
            <Title>Description</Title>
            <Description>{description}</Description>
          </div>
        )}
        {links?.map(({ label, url }, index) => {
          return (
            <Link key={index} href={url} target="_blank">
              <Button variant="white">
                <div className="flex w-full items-center justify-between">
                  <span className="text-iron-600 font-semibold text-xs">
                    {label}
                  </span>
                  <Icons.ExternalLink className="text-gray-10" />
                </div>
              </Button>
            </Link>
          );
        })}
        <div className=""></div>
      </div>
    </Modal>
  );
};

TalkModal.displayName = "TalkModal";
export { TalkModal };
