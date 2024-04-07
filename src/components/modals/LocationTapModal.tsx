import Image from "next/image";
import { Modal, ModalProps } from "./Modal";
import { LocationWithQuests } from "@/types";
import { ListLayout } from "@/layouts/ListLayout";
import { LoadingWrapper } from "../wrappers/LoadingWrapper";
import { Placeholder } from "../placeholders/Placeholder";
import { QuestCard } from "../cards/QuestCard";
import { getNonceFromCounterMessage } from "@/lib/client/libhalo";
import { useFetchQuests } from "@/hooks/useFetchQuests";
import { useQuestRequirements } from "@/hooks/useQuestRequirements";
import Link from "next/link";
import { Button } from "../Button";
import { LocationSignature, getAuthToken } from "@/lib/client/localStorage";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { useState } from "react";
import Linkify from "react-linkify";
import { CircleCard } from "../cards/CircleCard";

enum MintDisplayState {
  DISPLAY,
  LOADING,
  SUCCESS,
}

interface LocationTapModalProps extends ModalProps {
  location: LocationWithQuests;
  signature: LocationSignature | undefined;
}

const LocationTapModal = ({
  location,
  signature,
  isOpen,
  setIsOpen,
}: LocationTapModalProps) => {
  const router = useRouter();
  const { isPending: isLoadingQuests, data: quests = [] } = useFetchQuests();
  const { numRequirementsSatisfied } = useQuestRequirements(quests);
  const locationQuestRequirementIds = location.questRequirements.map(
    (questReq) => questReq.questId
  );
  const [mintDisplayState, setMintDisplayState] = useState<MintDisplayState>(
    MintDisplayState.DISPLAY
  );

  const handleEmailMint = async () => {
    const authToken = getAuthToken();
    if (!authToken || authToken.expiresAt < new Date()) {
      toast.error("You must be logged in to mint an NFT.");
      router.push("/login");
      return;
    }

    if (!signature) {
      toast.error("You must have a signature to mint an NFT.");
      return;
    }

    setMintDisplayState(MintDisplayState.LOADING);

    const response = await fetch("/api/location/mint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: authToken.value,
        locationId: location.id,
        signature: signature.sig,
        message: signature.msg,
      }),
    });

    if (response.ok) {
      toast.success(
        "Success! Check your mail in a few minutes, and make sure to check spam."
      );
      setMintDisplayState(MintDisplayState.SUCCESS);
    } else {
      toast.error("Error minting NFT. Please try again later.");
      setMintDisplayState(MintDisplayState.DISPLAY);
    }
  };

  const getMintDisplayState = () => {
    if (mintDisplayState === MintDisplayState.DISPLAY) {
      return (
        <Button onClick={handleEmailMint} className="w-full h-8 mt-4">
          Mint an NFT to your email
        </Button>
      );
    } else if (mintDisplayState === MintDisplayState.LOADING) {
      return (
        <Button loading className="w-full h-8 mt-4">
          Minting NFT...
        </Button>
      );
    } else {
      return (
        <div className="text-md text-center text-gray-11">
          {
            "Success! Check your mail in a few minutes, and make sure to check spam."
          }
        </div>
      );
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      <div className="flex flex-col min-h-[60vh]">
        <div className="flex flex-col items-center gap-[10px] pt-24 pb-28">
          <CircleCard icon="location" size="md" />
          <div className="flex flex-col gap-2 items-center mx-6">
            <span className="text-xl tracking-[-0.2px] font-normal text-gray-12">
              Success!
            </span>
            {signature?.msg && getNonceFromCounterMessage(signature.msg) && (
              <div className="flex gap-0.5 text-xs font-normal">
                <span className=" text-gray-11">{`You are visitor #${getNonceFromCounterMessage(
                  signature.msg
                )} to`}</span>
                <span className=" text-gray-12">{` ${location.name}`}</span>
              </div>
            )}
            {location.description.length > 0 && (
              <span className="text-xs text-gray-11 text-center">
                <Linkify
                  componentDecorator={(decoratedHref, decoratedText, key) => (
                    <a
                      target="_blank"
                      href={decoratedHref}
                      key={key}
                      style={{ textDecoration: "underline" }}
                    >
                      {decoratedText}
                    </a>
                  )}
                >
                  {location.description}
                </Linkify>
              </span>
            )}
          </div>
        </div>
        {locationQuestRequirementIds.length !== 0 && (
          <ListLayout label="Quests involving this location">
            <LoadingWrapper
              className="flex flex-col gap-2"
              isLoading={isLoadingQuests}
              noResultsLabel=""
              fallback={
                <>
                  <Placeholder.List items={2} />
                </>
              }
            >
              {locationQuestRequirementIds.map((id) => {
                const questIndex = quests.findIndex((quest) => quest.id === id);
                if (questIndex === -1) {
                  return null;
                }
                const quest = quests[questIndex];
                const questNumRequirementsSatisfied =
                  numRequirementsSatisfied[questIndex];

                const {
                  name,
                  description,
                  userRequirements,
                  locationRequirements,
                  isCompleted = false,
                  userTapReq,
                } = quest;
                return (
                  <Link href={`/quests/${id}`} key={id}>
                    <QuestCard
                      key={id}
                      title={name}
                      description={description}
                      userTapReqCount={userTapReq ? 1 : 0}
                      completedReqs={questNumRequirementsSatisfied}
                      userRequirements={userRequirements}
                      locationRequirements={locationRequirements}
                      isCompleted={isCompleted}
                    />
                  </Link>
                );
              })}
            </LoadingWrapper>
          </ListLayout>
        )}
      </div>
    </Modal>
  );
};

LocationTapModal.displayName = "LocationTapModal";
export { LocationTapModal };
