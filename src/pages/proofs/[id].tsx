import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppBackHeader } from "@/components/AppHeader";
import { Icons } from "@/components/Icons";
import { classed } from "@tw-classed/react";
import { useParams } from "next/navigation";
import {
  LocationRequirementPreview,
  QuestWithRequirements,
  UserRequirementPreview,
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
  getAllQuestCompleted,
  getLocationSignatures,
  getProfile,
  getQuestCompleted,
  getUsers,
} from "@/lib/client/localStorage";
import {
  computeNumRequirementSignatures,
  computeNumRequirementsSatisfied,
} from "@/lib/client/quests";
import { Card } from "@/components/cards/Card";
import { IconCircle } from "@/components/IconCircle";
import { cn } from "@/lib/client/utils";

interface QuestDetailProps {
  loading?: boolean;
  quest: QuestWithRequirements | null;
}

const Label = classed.span("text-xs font-sans text-iron-600 font-semibold");

type UserDetailProps = {
  label?: string;
  title?: string;
  completed?: boolean;
  users: UserRequirementPreview[];
  userPubKeysCollected: string[];
  numSigsRequired: number;
  numValidSigsCollected: number;
};

export const UserDetail = ({
  users,
  userPubKeysCollected,
  numSigsRequired,
  numValidSigsCollected,
}: UserDetailProps) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          {users
            .filter((item) =>
              userPubKeysCollected.includes(item.signaturePublicKey)
            )
            .slice(0, numSigsRequired)
            .map(({ displayName }, index) => {
              return (
                <div
                  key={index}
                  className="flex justify-between items-center border-b w-full border-white/40  last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.Person size={12} />
                    </IconCircle>
                    <Card.Title
                      className={"text-sm font-sans text-iron-950 font-bold"}
                    >
                      {displayName}
                    </Card.Title>
                  </div>
                  <Icons.CheckCircle className="text-iron-600" />
                </div>
              );
            })}
          {numSigsRequired > numValidSigsCollected ? (
            Array(numSigsRequired - numValidSigsCollected)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b w-full border-white/40  last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.Person size={12} />
                    </IconCircle>
                    <Card.Title className="text-sm font-sans text-iron-600 font-normal">
                      Ask to tap a new connection’s badge!
                    </Card.Title>
                  </div>
                </div>
              ))
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
};

type LocationDetailProps = {
  label?: string;
  title?: string;
  completed?: boolean;
  locations: LocationRequirementPreview[];
  locationPubKeysCollected: string[];
  numSigsRequired: number;
  numValidSigsCollected: number;
};

export const LocationDetail = ({
  locations,
  locationPubKeysCollected,
  numSigsRequired,
  numValidSigsCollected,
}: LocationDetailProps) => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          {locations
            .filter((item) =>
              locationPubKeysCollected.includes(item.signaturePublicKey)
            )
            .slice(0, numSigsRequired)
            .map(({ name }, index) => {
              return (
                <div
                  key={index}
                  className="flex justify-between border-b w-full border-white gap-2 last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.Location size={12} />
                    </IconCircle>
                    <Card.Title
                      className={"text-sm font-sans text-iron-950 font-bold"}
                    >
                      {name}
                    </Card.Title>
                  </div>
                  <div className="w-4">
                    <Icons.CheckCircle />
                  </div>
                </div>
              );
            })}
          {numSigsRequired > numValidSigsCollected ? (
            Array(numSigsRequired - numValidSigsCollected)
              .fill(null)
              .map((_, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center border-b w-full border-white/40  last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-2">
                    <IconCircle>
                      <Icons.Location size={12} />
                    </IconCircle>
                    <Card.Title className="text-sm font-sans text-iron-600 font-normal">
                      Tap a talk card!
                    </Card.Title>
                  </div>
                </div>
              ))
          ) : (
            <></>
          )}
        </div>
      </div>
    </div>
  );
};

const QuestDetail = ({ quest }: QuestDetailProps) => {
  const { name: title, description } = quest ?? {};

  return (
    <div className="flex flex-col gap-6">
      <span className="text-lg xs:text-xl text-iron-950 leading-6 font-medium">
        {title}
      </span>
      <span className="text-iron-600 text-sm font-normal">{description}</span>
    </div>
  );
};

export default function QuestById() {
  const params = useParams();
  const [userPublicKeys, setUserPublicKeys] = useState<string[]>([]);
  const [locationPublicKeys, setLocationPublicKeys] = useState<string[]>([]);
  const [completeQuestModal, setCompleteQuestModal] = useState(false);
  const [hasMinRequirements, setHasMinRequirements] = useState(false);
  const [existingProofId, setExistingProofId] = useState<string>();
  const { id: questId } = params;
  const { isLoading, data: quest = null } = useFetchQuestById(
    questId as string
  );
  const [userOutboundTaps, setUserOutboundTaps] = useState<number>(0);
  const [questCompleted, setQuestCompleted] = useState<boolean>(false);

  useEffect(() => {
    const questCompleted = getAllQuestCompleted();
    const completedQuestIds: string[] = Object.keys(questCompleted);
    setQuestCompleted(completedQuestIds.includes(questId as string));
  }, [completeQuestModal, questId]);

  useEffect(() => {
    const users = getUsers();
    setUserOutboundTaps(
      Object.values(users).filter((user: User) => user.outTs).length
    );
    const profile = getProfile();
    const locationSignatures = getLocationSignatures();
    const validUserPublicKeys = Object.values(users)
      .filter(
        (user: User) => user.sig && user.sigPk !== profile?.signaturePublicKey
      )
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
      let hasMinRequirements = false;
      if (quest.locationRequirements.length === 1) {
        hasMinRequirements =
          numRequirementsSatisfied ===
          quest.locationRequirements[0].numSigsRequired;
      } else if (quest.userRequirements.length === 1) {
        hasMinRequirements =
          numRequirementsSatisfied ===
          quest.userRequirements[0].numSigsRequired;
      }

      if (hasMinRequirements) {
        setHasMinRequirements(true);
        // Check if the user has already submitted a proof for this quest
        // (i.e. the quest is already completed)
        const questCompleted = getQuestCompleted(quest.id.toString());
        if (questCompleted) {
          setExistingProofId(questCompleted.pfId);
          setCompleteQuestModal(true);
        }
      }
    }
  }, [quest, userPublicKeys, locationPublicKeys, userOutboundTaps]);

  const numRequirementsSatisfied: number = useMemo(() => {
    if (!quest) return 0;

    if (quest.userRequirements.length === 0) {
      return computeNumRequirementSignatures({
        publicKeyList: locationPublicKeys,
        locationRequirement: quest.locationRequirements[0],
      });
    } else {
      return computeNumRequirementSignatures({
        publicKeyList: userPublicKeys,
        userRequirement: quest.userRequirements[0],
      });
    }
  }, [quest, userPublicKeys, locationPublicKeys]);

  const numRequirementsTotal: number = useMemo(() => {
    if (!quest) return 0;

    return quest.userRequirements.length === 0
      ? quest.locationRequirements[0].numSigsRequired
      : quest.userRequirements[0].numSigsRequired;
  }, [quest]);

  const isQuestComplete = existingProofId !== undefined && !isLoading;

  const canGenerateProof =
    quest &&
    numRequirementsSatisfied === numRequirementsTotal &&
    !isQuestComplete;

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
            <div className="flex flex-col gap-6 h-modal">
              <QuestDetail quest={quest} />
              <ListWrapper
                label={
                  <div className="flex gap-2 items-center">
                    {!isQuestComplete && (
                      <Label className="text-gray-10 font-semibold font-sans">{`${numRequirementsSatisfied}/${numRequirementsTotal} collected`}</Label>
                    )}
                  </div>
                }
              >
                <div className="flex flex-col gap-6 mb-4">
                  {quest && quest.userRequirements.length > 0 && (
                    <UserDetail
                      users={quest.userRequirements[0].users}
                      userPubKeysCollected={userPublicKeys}
                      numSigsRequired={
                        quest.userRequirements[0].numSigsRequired
                      }
                      title={quest.userRequirements[0].name}
                      completed={questCompleted}
                      numValidSigsCollected={numRequirementsSatisfied}
                    />
                  )}
                  {quest && quest.locationRequirements.length > 0 && (
                    <LocationDetail
                      locations={quest.locationRequirements[0].locations}
                      locationPubKeysCollected={locationPublicKeys}
                      numSigsRequired={
                        quest.locationRequirements[0].numSigsRequired
                      }
                      title={quest.locationRequirements[0].name}
                      completed={questCompleted}
                      numValidSigsCollected={numRequirementsSatisfied}
                    />
                  )}
                </div>
                {quest?.isCompleted ? (
                  <Button
                    variant="white"
                    onClick={() => {
                      setCompleteQuestModal(true);
                    }}
                  >
                    <span className="w-full text-left font-normal">
                      View proof
                    </span>
                    <Icons.Zoom className="ml-auto" />
                  </Button>
                ) : (
                  <Button
                    disabled={
                      !canGenerateProof &&
                      !isQuestComplete &&
                      !hasMinRequirements
                    }
                    onClick={() => {
                      setCompleteQuestModal(true);
                    }}
                  >
                    Generate proof
                  </Button>
                )}
              </ListWrapper>
            </div>
          ) : (
            <span className="flex justify-center items-center text-center grow min-h-[80vh]">
              Unable to load this proof.
            </span>
          )}
        </LoadingWrapper>
      }
    </div>
  );
}

QuestById.getInitialProps = () => {
  return { showHeader: false, showFooter: false };
};
