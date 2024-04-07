import { QuestWithRequirements } from "@/types";
import {
  MembershipProof,
  VerificationResult,
  areAllBigIntsDifferent,
  areAllBigIntsTheSame,
  batchVerifyMembership,
  bigIntToHex,
  computeMerkleRoot,
  getPublicSignalsFromMembershipZKP,
  hexToBigInt,
  isNode,
  publicKeyFromString,
} from "babyjubjub-ecdsa";
import path from "path";
import { deserializeQuestProof } from "../client/proving";
const crypto = require("crypto");
// @ts-ignore
import { buildPoseidonReference as buildPoseidon } from "circomlibjs";
import { MERKLE_TREE_DEPTH } from "@/shared/constants";

// In our current configuration, this is the path to the circuits directory for server side proving
export const getServerPathToCircuits = (): string => {
  return path.resolve(process.cwd(), "public", "circuits") + "/";
};

// Generates randomness for nullifiers
// Uses Crypto Web API in browser and Node.js Crypto module in Node.js
export const getServerRandomNullifierRandomness = (): string => {
  const numBytes = 30; // Generate a number of bytes smaller than the size of a field element

  if (!isNode()) {
    throw new Error(
      "Used client side function to get nullifier randomness in server"
    );
  }

  return crypto.randomBytes(numBytes).toString("hex");
};

type QuestProofConsumedSigNullifiers = {
  user: string[][]; // List of consumed signature nullifiers for each user requirement
  location: string[][]; // List of consumed signature nullifiers for each location requirement
};

// Verifies a proof for a quest
// Returns an object with verified boolean indicating if the proof is valid
// If the proof is valid, also returns an object with consumedSigNullifiers
export const verifyProofForQuest = async (
  quest: QuestWithRequirements,
  serializedProof: string
): Promise<{
  verified: boolean;
  consumedSigNullifiers?: QuestProofConsumedSigNullifiers;
}> => {
  const poseidon = await buildPoseidon();

  const { userProofs, locationProofs } = deserializeQuestProof(serializedProof);
  if (userProofs.length !== quest.userRequirements.length) {
    return { verified: false };
  }
  if (locationProofs.length !== quest.locationRequirements.length) {
    return { verified: false };
  }

  const consumedUserSigNullifiers: string[][] = [];
  for (let i = 0; i < quest.userRequirements.length; i++) {
    const proofs = userProofs[i];
    const requirement = quest.userRequirements[i];

    const requirementPublicKeys = requirement.users.map(
      (user) => user.signaturePublicKey
    );

    const { verified, consumedSigNullifiers } =
      await verifyProofForQuestRequirement(
        proofs,
        requirementPublicKeys,
        requirement.numSigsRequired,
        requirement.sigNullifierRandomness,
        poseidon
      );
    if (!verified) {
      return { verified: false };
    }

    const newlyConsumedSigNullifiers = consumedSigNullifiers
      ? consumedSigNullifiers.map(bigIntToHex)
      : [];
    consumedUserSigNullifiers.push(newlyConsumedSigNullifiers);
  }

  const consumedLocationSigNullifiers: string[][] = [];
  for (let i = 0; i < quest.locationRequirements.length; i++) {
    const proofs = locationProofs[i];
    const requirement = quest.locationRequirements[i];

    const requirementPublicKeys = requirement.locations.map(
      (location) => location.signaturePublicKey
    );

    const { verified, consumedSigNullifiers } =
      await verifyProofForQuestRequirement(
        proofs,
        requirementPublicKeys,
        requirement.numSigsRequired,
        requirement.sigNullifierRandomness,
        poseidon
      );
    if (!verified) {
      return { verified: false };
    }

    const newlyConsumedSigNullifiers = consumedSigNullifiers
      ? consumedSigNullifiers.map(bigIntToHex)
      : [];
    consumedLocationSigNullifiers.push(newlyConsumedSigNullifiers);
  }

  return {
    verified: true,
    consumedSigNullifiers: {
      user: consumedUserSigNullifiers,
      location: consumedLocationSigNullifiers,
    },
  };
};

export const verifyProofForQuestRequirement = async (
  proofs: MembershipProof[],
  requirementPublicKeys: string[],
  numSigsRequired: number,
  sigNullifierRandomness: string,
  hashFn: any
): Promise<VerificationResult> => {
  if (proofs.length !== numSigsRequired) {
    return { verified: false };
  }

  // Checks that all the pubKeyNullifiers are unique but all the
  // pubKeyNullifierRandomnessHashes are the same
  const pubKeyNullifiers = proofs.map(
    (proof) => getPublicSignalsFromMembershipZKP(proof.zkp).pubKeyNullifier
  );
  if (!areAllBigIntsDifferent(pubKeyNullifiers)) {
    return { verified: false };
  }
  const pubKeyNullifierRandomnessHashes = proofs.map(
    (proof) =>
      getPublicSignalsFromMembershipZKP(proof.zkp).pubKeyNullifierRandomnessHash
  );
  if (!areAllBigIntsTheSame(pubKeyNullifierRandomnessHashes)) {
    return { verified: false };
  }

  const publicKeys = requirementPublicKeys.map((publicKey) =>
    publicKeyFromString(publicKey).toEdwards()
  );
  const merkleRoot = await computeMerkleRoot(
    MERKLE_TREE_DEPTH,
    publicKeys,
    hashFn
  );

  return await batchVerifyMembership({
    proofs,
    merkleTreeDepth: MERKLE_TREE_DEPTH,
    merkleRoot,
    sigNullifierRandomness: hexToBigInt(sigNullifierRandomness),
    usedSigNullifiers: [],
    pathToCircuits: getServerPathToCircuits(),
  });
};
