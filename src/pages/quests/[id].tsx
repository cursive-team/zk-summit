import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppBackHeader } from "@/components/AppHeader";
import { Icons } from "@/components/Icons";
import { QuestRequirementCard } from "@/components/cards/QuestRequirementCard";
import { classed } from "@tw-classed/react";
import { useParams } from "next/navigation";
import {
  LocationRequirement,
  QuestRequirementType,
  QuestWithRequirements,
  UserRequirement,
} from "@/types";
import { Button } from "@/components/Button";
import { CompleteQuestModal } from "@/components/modals/CompleteQuestModal";
import { useFetchQuestById } from "@/hooks/useFetchQuestById";
import { LoadingWrapper } from "@/components/wrappers/LoadingWrapper";
import { QuestDetailPlaceholder } from "@/components/placeholders/QuestDetailPlaceHolder";
import { ListWrapper } from "@/components/wrappers/ListWrapper";
import { Placeholder } from "@/components/placeholders/Placeholder";
import {
  LocationSignature,
  User,
  getLocationSignatures,
  getQuestCompleted,
  getUsers,
} from "@/lib/client/localStorage";
import {
  computeNumRequirementSignatures,
  computeNumRequirementsSatisfied,
} from "@/lib/client/quests";
import {
  getPinnedQuest,
  togglePinQuestById,
} from "@/lib/client/localStorage/questPinned";
import { toast } from "sonner";
import { ListLayout } from "@/layouts/ListLayout";
import { useFetchQuests } from "@/hooks/useFetchQuests";
import { QuestCard } from "@/components/cards/QuestCard";
import { useQuestRequirements } from "@/hooks/useQuestRequirements";
import Link from "next/link";
import { PartnerItemCard } from "@/components/cards/PartnerItemCard";
import { PointCard } from "@/components/cards/PointCard";
import { Card } from "@/components/cards/Card";
import { CircleCard } from "@/components/cards/CircleCard";
import { cn } from "@/lib/client/utils";

interface QuestDetailProps {
  loading?: boolean;
  quest: QuestWithRequirements | null;
}

const Label = classed.span("text-xs text-gray-10 font-light");

const QuestDetail = ({ quest, loading = false }: QuestDetailProps) => {
  const pinnedQuests = useRef<Set<number>>(getPinnedQuest());
  const { name: title, description } = quest ?? {};
  const [isQuestPinned, setIsQuestPinned] = useState(
    pinnedQuests.current.has(quest?.id ?? 0)
  );

  const onQuestPin = () => {
    if (!quest?.id) return;
    const pinned = togglePinQuestById(quest.id);
    const isPinned = pinned.has(quest.id);
    setIsQuestPinned(isPinned);
    toast.success(isPinned ? "Quest pinned" : "Quest unpinned", {
      duration: 2000,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-[40px_1fr] gap-2 xs:gap-3 items-center">
          <div className="size-10 bg-slate-200 rounded-full"></div>
          <span className="text-lg xs:text-xl font-light leading-6">
            {title}
          </span>
        </div>
        <button
          type="button"
          className="flex gap-2 items-center disabled:opacity-50 outline-none focus:outline-none"
          disabled={loading}
          onClick={onQuestPin}
        >
          <span className="text-gray-11 text-xs font-light">
            {isQuestPinned ? "Unpin" : "Pin"}
          </span>
          {isQuestPinned ? <Icons.unpin /> : <Icons.pin />}
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <span className=" text-gray-11 text-xs font-light">{description}</span>
        <div className="flex flex-col gap-2"></div>
      </div>
    </div>
  );
};

const QuestCompleted = ({ quest }: { quest: QuestWithRequirements }) => {
  const { isLoading, data: quests = [] } = useFetchQuests();

  const moreQuests = quests
    .filter((q) => q.id !== quest.id) // ignore current quest
    .filter((q) => !q.isCompleted); // ignore completed quests

  const { numRequirementsSatisfied } = useQuestRequirements(moreQuests);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col items-center gap-6 py-16">
        <div className=" bg-slate-200 w-10 h-10 rounded-full"></div>
        <div className="flex flex-col text-center">
          <span className=" text-gray-10 text-xs">{quest.name}</span>
          <span className=" text-xl text-gray-12">Quest completed</span>
        </div>
      </div>
      <ListLayout label="More quests">
        <LoadingWrapper
          className="flex flex-col gap-2"
          isLoading={isLoading}
          fallback={<Placeholder.List items={3} />}
          noResultsLabel="No quests found"
        >
          {moreQuests.map(
            (
              {
                id,
                name,
                description,
                userRequirements,
                locationRequirements,
                isCompleted = false,
                userTapReq,
              },
              index
            ) => {
              return (
                <Link key={index} href={`/quests/${id}`}>
                  <QuestCard
                    title={name}
                    description={description}
                    userTapReqCount={userTapReq ? 1 : 0}
                    completedReqs={numRequirementsSatisfied[index]}
                    userRequirements={userRequirements}
                    locationRequirements={locationRequirements}
                    isCompleted={isCompleted}
                  />
                </Link>
              );
            }
          )}
        </LoadingWrapper>
      </ListLayout>
    </div>
  );
};

export default function QuestById() {
  const params = useParams();
  const [userPublicKeys, setUserPublicKeys] = useState<string[]>([]);
  const [locationPublicKeys, setLocationPublicKeys] = useState<string[]>([]);
  const [completeQuestModal, setCompleteQuestModal] = useState(false);
  const [existingProofId, setExistingProofId] = useState<string>();
  const { id: questId } = params;
  const { isLoading, data: quest = null } = useFetchQuestById(
    questId as string
  );
  const [userOutboundTaps, setUserOutboundTaps] = useState<number>(0);

  useEffect(() => {
    const users = getUsers();
    setUserOutboundTaps(
      Object.values(users).filter((user: User) => user.outTs).length
    );

    const locationSignatures = getLocationSignatures();

    const validUserPublicKeys = Object.values(users)
      .filter((user: User) => user.sig)
      .map((user: User) => user.sigPk!);
    setUserPublicKeys(validUserPublicKeys);

    const validLocationPublicKeys = Object.values(locationSignatures).map(
      (location: LocationSignature) => location.pk
    );
    setLocationPublicKeys(validLocationPublicKeys);
  }, []);

  useEffect(() => {
    // Clear existing completion data when quest changes
    setCompleteQuestModal(false);
    setExistingProofId(undefined);
    if (quest) {
      // Check if the user has finished quest requirements
      const numRequirementsSatisfied = computeNumRequirementsSatisfied({
        userPublicKeys,
        locationPublicKeys,
        userOutboundTaps,
        userRequirements: quest.userRequirements,
        locationRequirements: quest.locationRequirements,
        questUserTapReq: quest.userTapReq,
      });
      let userTapRequirement = quest.userTapReq ? 1 : 0;

      if (
        numRequirementsSatisfied ===
        quest.userRequirements.length +
          quest.locationRequirements.length +
          userTapRequirement
      ) {
        setCompleteQuestModal(true);
        // Check if the user has already submitted a proof for this quest
        // (i.e. the quest is already completed)
        const questCompleted = getQuestCompleted(quest.id.toString());
        if (questCompleted) {
          setExistingProofId(questCompleted.pfId);
        }
      }
    }
  }, [quest, userPublicKeys, locationPublicKeys, userOutboundTaps]);

  const numRequirementsSatisfied: number = useMemo(() => {
    if (!quest) return 0;

    return computeNumRequirementsSatisfied({
      userPublicKeys,
      locationPublicKeys,
      userOutboundTaps,
      userRequirements: quest.userRequirements,
      locationRequirements: quest.locationRequirements,
      questUserTapReq: quest.userTapReq,
    });
  }, [quest, userPublicKeys, locationPublicKeys, userOutboundTaps]);

  const numUserRequirementSignatures: number[] = useMemo(() => {
    if (!quest) return [];

    return quest.userRequirements.map((requirement: UserRequirement) => {
      return computeNumRequirementSignatures({
        publicKeyList: userPublicKeys,
        userRequirement: requirement,
      });
    });
  }, [quest, userPublicKeys]);

  const numLocationRequirementSignatures: number[] = useMemo(() => {
    if (!quest) return [];

    return quest.locationRequirements.map(
      (requirement: LocationRequirement) => {
        return computeNumRequirementSignatures({
          publicKeyList: locationPublicKeys,
          locationRequirement: requirement,
        });
      }
    );
  }, [quest, locationPublicKeys]);

  const numRequirementsTotal =
    (quest?.userRequirements?.length ?? 0) +
    (quest?.locationRequirements?.length ?? 0) +
    (quest?.userTapReq ? 1 : 0);

  const isQuestComplete = existingProofId !== undefined && !isLoading;

  return (
    <div>
      <AppBackHeader />
      {quest && (
        <CompleteQuestModal
          isOpen={completeQuestModal}
          setIsOpen={setCompleteQuestModal}
          quest={quest}
          existingProofId={existingProofId}
        />
      )}
      {
        <LoadingWrapper
          isLoading={isLoading}
          className="flex flex-col gap-6"
          fallback={
            <>
              <QuestDetailPlaceholder />
              <div className="mt-4 flex flex-col gap-5">
                <Placeholder.List items={3} />
              </div>
            </>
          }
        >
          {quest ? (
            <>
              <QuestDetail quest={quest} />
              <ListWrapper
                title="Requirements"
                label={
                  <div className="flex gap-2 items-center">
                    {isQuestComplete && (
                      <Button
                        onClick={() => {
                          setCompleteQuestModal(true);
                        }}
                        size="tiny"
                      >
                        View completion
                      </Button>
                    )}
                    {!isQuestComplete && (
                      <Label>{`${numRequirementsSatisfied}/${numRequirementsTotal}`}</Label>
                    )}
                    {quest &&
                      numRequirementsSatisfied === numRequirementsTotal &&
                      !isQuestComplete && (
                        <Button
                          onClick={() => {
                            setCompleteQuestModal(true);
                          }}
                          size="tiny"
                        >
                          Complete quest
                        </Button>
                      )}
                  </div>
                }
              >
                <>
                  {quest && quest.userTapReq !== null && (
                    <Card.Base className="text-center flex justify-center py-4">
                      <div className="flex flex-col gap-2 items-center">
                        <div className={cn("flex items-center justify-center")}>
                          <CircleCard size="sm" color="white" icon="proof" />
                        </div>
                        <div className="flex flex-col">
                          <Card.Title>{`Tap ${quest.userTapReq} people!`}</Card.Title>
                          <Card.Description>
                            {userOutboundTaps >= quest.userTapReq
                              ? "Complete"
                              : `${userOutboundTaps}/${quest.userTapReq}`}
                          </Card.Description>
                        </div>
                      </div>
                      {userOutboundTaps >= quest.userTapReq && (
                        <Icons.checkedCircle className="absolute right-[6px] top-[6px]" />
                      )}
                    </Card.Base>
                  )}
                  {quest &&
                    quest.userRequirements.map(
                      (
                        { name, numSigsRequired, users }: any,
                        index: number
                      ) => (
                        <QuestRequirementCard
                          key={index}
                          title={name}
                          numSigsCollected={numUserRequirementSignatures[index]}
                          numSigsRequired={numSigsRequired}
                          questRequirementType={QuestRequirementType.USER}
                          users={users}
                          userPubKeysCollected={userPublicKeys}
                        />
                      )
                    )}
                  {quest &&
                    quest.locationRequirements.map(
                      (
                        { name, numSigsRequired, locations }: any,
                        index: number
                      ) => (
                        <QuestRequirementCard
                          key={index}
                          title={name}
                          numSigsCollected={
                            numLocationRequirementSignatures[index]
                          }
                          numSigsRequired={numSigsRequired}
                          questRequirementType={QuestRequirementType.LOCATION}
                          locations={locations}
                          locationPubKeysCollected={locationPublicKeys}
                        />
                      )
                    )}
                </>
              </ListWrapper>
            </>
          ) : (
            <span className="flex justify-center items-center text-center grow min-h-[80vh]">
              Unable to load this quest.
            </span>
          )}
        </LoadingWrapper>
      }
    </div>
  );
}

QuestById.getInitialProps = () => {
  return { showHeader: false };
};
