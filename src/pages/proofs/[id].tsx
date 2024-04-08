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
import { Card } from "@/components/cards/Card";
import { Header } from "@/components/modals/QuestRequirementModal";
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
};

export const UserDetail = ({
  title,
  completed,
  users,
  userPubKeysCollected,
  numSigsRequired,
}: UserDetailProps) => {
  const numSigsCollected = useMemo(() => {
    return users.filter((user) =>
      userPubKeysCollected.includes(user.signaturePublicKey)
    ).length;
  }, [userPubKeysCollected, users]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          {users.map(({ displayName, signaturePublicKey }, index) => {
            const collected = userPubKeysCollected.includes(signaturePublicKey);
            if (!collected) return null; // should not render uncollected users
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
                    className={cn("text-sm font-sans", {
                      "text-iron-950 font-bold": collected,
                      "text-iron-600 font-normal": !collected,
                    })}
                  >
                    {displayName}
                  </Card.Title>
                </div>
                {collected && <Icons.CheckCircle className="text-iron-600" />}
              </div>
            );
          })}
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
};

export const LocationDetail = ({
  title,
  completed,
  locations,
  locationPubKeysCollected,
  numSigsRequired,
}: LocationDetailProps) => {
  const numSigsCollected = useMemo(() => {
    return locations.filter((location) =>
      locationPubKeysCollected.includes(location.signaturePublicKey)
    ).length;
  }, [locationPubKeysCollected, locations]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div>
          {locations.map(({ name, signaturePublicKey }, index) => {
            const collected =
              locationPubKeysCollected.includes(signaturePublicKey);

            if (!collected) return null; // should not render uncollected users
            return (
              <div
                key={index}
                className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1"
              >
                <div className="flex items-center gap-2">
                  <IconCircle>
                    <Icons.Person size={12} />
                  </IconCircle>
                  <Card.Title
                    className={cn("text-sm font-sans", {
                      "text-iron-950 font-bold": collected,
                      "text-iron-600 font-normal": !collected,
                    })}
                  >
                    {name}
                  </Card.Title>
                </div>
                {collected && <Icons.CheckCircle />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

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
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        {/* <button
          type="button"
          className="flex gap-2 items-center disabled:opacity-50 outline-none focus:outline-none"
          disabled={loading}
          onClick={onQuestPin}
        >
          <span className="text-gray-11 text-xs font-normal">
            {isQuestPinned ? "Unpin" : "Pin"}
          </span>
          {isQuestPinned ? <Icons.Unpin /> : <IconsP />}
        </button> */}
      </div>
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
                label={
                  <div className="flex gap-2 items-center">
                    {isQuestComplete && (
                      <Button
                        onClick={() => {
                          setCompleteQuestModal(true);
                        }}
                        size="small"
                      >
                        View proof
                      </Button>
                    )}
                    {!isQuestComplete && (
                      <Label className="text-gray-10 font-semibold font-sans">{`${numRequirementsSatisfied}/${numRequirementsTotal} collected`}</Label>
                    )}
                    {quest &&
                      numRequirementsSatisfied === numRequirementsTotal &&
                      !isQuestComplete && (
                        <Button
                          onClick={() => {
                            setCompleteQuestModal(true);
                          }}
                          size="small"
                        >
                          Generate proof
                        </Button>
                      )}
                  </div>
                }
              >
                <>
                  {quest && quest.userRequirements.length > 0 && (
                    <UserDetail
                      users={quest.userRequirements[0].users}
                      userPubKeysCollected={userPublicKeys}
                      numSigsRequired={
                        quest.userRequirements[0].numSigsRequired
                      }
                      title={quest.userRequirements[0].name}
                      completed={false}
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
                      completed={false}
                    />
                  )}
                </>
              </ListWrapper>
            </>
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
  return { showHeader: false };
};
