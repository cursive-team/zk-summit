import { ListLayout } from "@/layouts/ListLayout";
import { formatDate } from "@/lib/shared/utils";
import React, { useState } from "react";
import { Button } from "../Button";
import { NoResultContent } from "../NoResultContent";
import { TalkModal, TalkModalProps } from "../modals/TalkModal";

const talks: TalkModalProps[] = [
  {
    stageName: "Stage 1",
    speakerName: "Speaker 1",
    title: "Talk 1",
    shortDescription: "Talk 1",
    description: "Description 1",
    links: [
      { label: "Link 1", url: "https://example.com" },
      { label: "Link 2", url: "https://example.com" },
    ],
  },
  {
    stageName: "Stage 2",
    speakerName: "Speaker 2",
    title: "Talk 2",
    shortDescription: "Talk 2",
    description: "Description 2",
    links: [
      { label: "Link 1", url: "https://example.com" },
      { label: "Link 2", url: "https://example.com" },
    ],
  },
];

export const TalksSection = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTalk, setSelectedTalk] = useState<TalkModalProps | null>(null);

  return (
    <>
      {selectedTalk && (
        <TalkModal isOpen={isOpen} setIsOpen={setIsOpen} {...selectedTalk} />
      )}

      <div className="flex flex-col gap-5">
        {talks?.length === 0 ? (
          <NoResultContent>
            {"Tap posters to collect links to slides for the talks you attend."}
          </NoResultContent>
        ) : (
          <ListLayout label="Example date">
            <div className="flex flex-col gap-2 w-full">
              {talks.map((talk, index) => {
                return (
                  <Button
                    className="w-full !bg-white/40"
                    key={index}
                    variant="white"
                    onClick={() => {
                      setSelectedTalk(talk);
                      setIsOpen(true);
                    }}
                  >
                    <div className="grid grid-cols-[1fr_90px] w-full">
                      <span className="text-iron-950 font-bold text-sm text-left truncate">
                        {talk.title}
                      </span>
                      <span className="text-iron-600 font-bold text-xs">
                        {formatDate(new Date().toString())}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </ListLayout>
        )}
      </div>
    </>
  );
};
