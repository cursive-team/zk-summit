import { Location, Quest } from "@prisma/client";
import { MembershipProof } from "babyjubjub-ecdsa";

export type EmptyResponse = {};

export type ErrorResponse = { error: string };

export type LabelProps = {
  label: string;
  content: string;
};

export enum ProfileDisplayState {
  VIEW,
  EDIT,
  INPUT_PASSWORD,
  CHOOSE_PASSWORD,
}

export interface QuestItem extends Quest {}

export enum QuestRequirementType {
  USER = "USER",
  LOCATION = "LOCATION",
}

export type UserRequirementPreview = {
  displayName: string;
  encryptionPublicKey: string;
  signaturePublicKey: string;
};

export type UserRequirement = {
  id: number;
  name: string;
  numSigsRequired: number;
  sigNullifierRandomness: string;
  users: UserRequirementPreview[];
};

export type LocationRequirementPreview = {
  id: number;
  name: string;
  imageUrl: string;
  signaturePublicKey: string;
};

export type LocationRequirement = {
  id: number;
  name: string;
  numSigsRequired: number;
  sigNullifierRandomness: string;
  locations: LocationRequirementPreview[];
};

export type QuestWithRequirements = Quest & {
  userRequirements: UserRequirement[];
  locationRequirements: LocationRequirement[];
};

export type QuestWithCompletion = QuestWithRequirements & {
  isCompleted?: boolean;
};

export type QuestProof = {
  userProofs: MembershipProof[][];
  locationProofs: MembershipProof[][];
};

export type LocationWithQuests = Location & {
  questRequirements: {
    id: number;
    questId: number;
  }[];
};
