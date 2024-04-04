import React, { useMemo, useState } from "react";
import { Modal, ModalProps } from "./Modal";
import {
  LocationRequirementPreview,
  QuestRequirementType,
  UserRequirementPreview,
} from "@/types";
import { Icons } from "../Icons";
import { classed } from "@tw-classed/react";
import useSettings from "@/hooks/useSettings";
import { Card } from "../cards/Card";
import {
  LocationSignature,
  getLocationSignature,
} from "@/lib/client/localStorage";
import { ListWrapper } from "../wrappers/ListWrapper";

const Label = classed.span("text-xs text-gray-10 font-normal");
const Description = classed.span("text-gray-12 text-sm font-normal");
const Title = classed.span("text-gray-12 text-lg font-normal");

type HeaderProps = {
  label?: string;
  title?: string;
  completed?: boolean;
};

export const Header = ({ title, label, completed }: HeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col ">
        {label && <Label>{label}</Label>}
        <Title>{title}</Title>
      </div>
      {completed && <Icons.checkedCircle />}
    </div>
  );
};

type LocationDetailProps = HeaderProps & {
  locations: LocationRequirementPreview[];
  locationPubKeysCollected: string[];
  numSigsRequired: number;
};

interface SingleLocationProps
  extends Pick<
    LocationDetailProps,
    "locationPubKeysCollected" | "numSigsRequired"
  > {
  title: string;
  location: LocationRequirementPreview;
  completed?: boolean;
}

interface LocationListProps
  extends Pick<
    LocationDetailProps,
    "locationPubKeysCollected" | "numSigsRequired"
  > {
  title: string;
  locations: LocationRequirementPreview[];
  completed?: boolean;
}

const SingleLocation = ({
  location,
  title,
  completed,
}: SingleLocationProps) => {
  const { pageWidth } = useSettings();
  const imageWidth = pageWidth - 38;

  const signature: LocationSignature | undefined = getLocationSignature(
    location.id.toString()
  );

  return (
    <>
      <Header title={title} label="Requirement" />
      <div className="flex flex-col gap-4 mt-2">
        <div
          className="bg-slate-200 rounded bg-cover bg-center bg-no-repeat object-cover overflow-hidden mx-auto"
          style={{
            width: `${imageWidth}px`,
            height: `${imageWidth}px`,
            backgroundImage: `url(${location.imageUrl})`,
          }}
        ></div>

        <div key={location.id} className="flex gap-6">
          <div className="flex flex-col">
            <Label>Location</Label>
            <Description>{location.name}</Description>
          </div>
          {signature !== undefined && (
            <div className="flex flex-col">
              <Label>Visited On</Label>
              <Description>{`${signature?.ts}`}</Description>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const LocationList = ({
  title,
  locations,
  locationPubKeysCollected,
  completed,
  numSigsRequired,
}: LocationListProps) => {
  const [selectedLocationId, setSelectedLocationId] = useState<number>();

  const totalCollected = locations.reduce((sum, location) => {
    const collected = locationPubKeysCollected?.includes(
      location.signaturePublicKey
    );
    return sum + (collected ? 1 : 0);
  }, 0);

  const handleCloseSingleLocationModal = () => {
    setSelectedLocationId(undefined);
  };

  if (selectedLocationId !== undefined) {
    const location = locations[selectedLocationId];
    const locationCompleted = locationPubKeysCollected.includes(
      location.signaturePublicKey
    );

    return (
      <Modal
        isOpen={true}
        setIsOpen={() => {}}
        onClose={handleCloseSingleLocationModal}
        withBackButton
      >
        <SingleLocation
          title={title}
          location={location}
          locationPubKeysCollected={locationPubKeysCollected}
          completed={locationCompleted}
          numSigsRequired={numSigsRequired}
        />
      </Modal>
    );
  }

  return (
    <>
      <Header title={title} label="Requirement" completed={completed} />
      <ListWrapper
        title={`${totalCollected} location(s) visited out of ${numSigsRequired} required`}
      >
        <div>
          {locations.map(
            (location: LocationRequirementPreview, index: number) => {
              const collected = locationPubKeysCollected?.includes(
                location.signaturePublicKey
              );

              return (
                <div
                  key={location.id}
                  onClick={() => setSelectedLocationId(index)}
                  className="flex justify-between border-b w-full border-gray-300 last-of-type:border-none first-of-type:pt-0 py-1"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex justify-center items-center bg-cover bg-center bg-[#677363] h-6 w-6 rounded"
                      style={{
                        backgroundImage: location?.imageUrl
                          ? `url(${location.imageUrl})`
                          : undefined,
                      }}
                    />
                    <Card.Title>{location.name}</Card.Title>
                  </div>
                  {collected && <Icons.checkedCircle />}
                </div>
              );
            }
          )}
        </div>
      </ListWrapper>
    </>
  );
};

export const LocationDetail = ({
  title,
  completed,
  locations,
  locationPubKeysCollected,
  numSigsRequired,
}: LocationDetailProps) => {
  if (locations.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <LocationList
          title={title!}
          numSigsRequired={numSigsRequired}
          locations={locations}
          completed={completed}
          locationPubKeysCollected={locationPubKeysCollected}
        />
      </div>
    </div>
  );
};

type UserDetailProps = HeaderProps & {
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
      <Header title={title} label="Requirement" completed={completed} />
      <div className="flex flex-col gap-4">
        <Label>{`${numSigsCollected} met out of ${numSigsRequired} required`}</Label>
        <div>
          {users.map(({ displayName, signaturePublicKey }, index) => {
            const collected = userPubKeysCollected.includes(signaturePublicKey);
            return (
              <div
                key={index}
                className="flex justify-between border-b w-full border-gray-300  last-of-type:border-none first-of-type:pt-0 py-1"
              >
                <div className="flex items-center gap-2">
                  <div className="flex justify-center items-center bg-[#677363] h-6 w-6 rounded-full">
                    <Icons.person size={12} />
                  </div>
                  <Card.Title>{displayName}</Card.Title>
                </div>
                {collected && <Icons.checkedCircle />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface QuestRequirementModalProps extends ModalProps {
  requirementName: string;
  questRequirementType: QuestRequirementType;
  users?: UserRequirementPreview[];
  locations?: LocationRequirementPreview[];
  userPubKeysCollected?: string[];
  locationPubKeysCollected?: string[];
  numSigsRequired: number;
  completed: boolean;
}

const QuestRequirementModal = ({
  requirementName,
  questRequirementType,
  users,
  locations,
  userPubKeysCollected,
  locationPubKeysCollected,
  numSigsRequired,
  completed,
  isOpen,
  setIsOpen,
}: QuestRequirementModalProps) => {
  const showUsers =
    questRequirementType === QuestRequirementType.USER &&
    users &&
    userPubKeysCollected;
  const showLocations =
    questRequirementType === QuestRequirementType.LOCATION &&
    locations &&
    locationPubKeysCollected;

  if (!showUsers && !showLocations) return null;

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} withBackButton>
      <div className="flex flex-col min-h-[60vh]">
        {showUsers && (
          <UserDetail
            users={users}
            userPubKeysCollected={userPubKeysCollected}
            numSigsRequired={numSigsRequired}
            title={requirementName}
            completed={completed}
          />
        )}
        {showLocations && (
          <LocationDetail
            locations={locations}
            locationPubKeysCollected={locationPubKeysCollected}
            numSigsRequired={numSigsRequired}
            title={requirementName}
            completed={completed}
          />
        )}
      </div>
    </Modal>
  );
};

QuestRequirementModal.displayName = "QuestRequirementModal";
export { QuestRequirementModal };
