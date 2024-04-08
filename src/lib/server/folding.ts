import { initialKeygenData } from "@/shared/keygen";
import prisma from "@/lib/server/prisma";
import {
  MerkleProof,
  bigIntToHex,
  computeMerkleProof,
  computeMerkleRoot,
  publicKeyFromString,
} from "babyjubjub-ecdsa";
import { MERKLE_TREE_DEPTH } from "@/shared/constants";
// @ts-ignore
import { buildPoseidonReference as buildPoseidon } from "circomlibjs";

export type TreeRoots = {
  attendeeMerkleRoot: string;
  speakerMerkleRoot: string;
  talksMerkleRoot: string;
};

/**
 * Get the merkle proof for a given public key in a given tree type
 * @param pubkey - the public key to get for the proof
 * @param treeType - {attendees | speakers | talks}
 */
export const getMerkleProof = async (
  pubkey: string,
  treeType: string
): Promise<MerkleProof> => {
  // get all public keys for the tree type
  const pubkeys = await getPubkeys(treeType);
  // get the index of the public key
  const index = pubkeys.indexOf(pubkey);
  // check if the public key is in the set
  if (index === -1) {
    throw new Error("Public key not found in tree");
  }
  // build the poseidon hash function
  const poseidon = await buildPoseidon();
  // convert the public keys to twisted edwards form
  const pubkeysEdwards = pubkeys.map((publicKey) =>
    publicKeyFromString(publicKey).toEdwards()
  );
  // compute the merkle inclusion proof for the requested public key
  return await computeMerkleProof(
    MERKLE_TREE_DEPTH,
    pubkeysEdwards,
    index,
    poseidon
  );
};

/**
 * Get the public keys for a given group
 * @param group - the group {attendees | speakers | talks} to get the public keys for
 * @returns the public keys for the group
 */
export const getPubkeys = async (pubkeyType: string): Promise<string[]> => {
  // get chip ids for the requested pubkey type
  const chipKeys = Object.entries(initialKeygenData)
    .filter((keyStruct) => {
      // check the type of the key struct
      let keyType: string;
      if (keyStruct[1].type === "talk") keyType = "talk";
      else if (keyStruct[1].isPersonSpeaker) keyType = "speaker";
      else keyType = "attendee";
      // filter by type of requested pubkey
      return keyType === pubkeyType;
    })
    .map((entry) => entry[0]);
  // query db for pubkeys using chip ids
  return await prisma.chipKey
    .findMany({
      where: { chipId: { in: chipKeys } },
      select: { signaturePublicKey: true },
      // orderBy: { createdAt: "asc" },
    })
    .then((res) => res.map((r) => r.signaturePublicKey));
};

export const getAllMerkleRoots = async (): Promise<TreeRoots> => {
  const poseidon = await buildPoseidon();
  const keygenData = initialKeygenData;

  const chipKeys = await prisma.chipKey.findMany({
    where: {
      chipId: {
        in: Object.keys(keygenData),
      },
    },
  });

  const attendeePublicKeys: string[] = [];
  const speakerPublicKeys: string[] = [];
  const talkPublicKeys: string[] = [];

  chipKeys.forEach((chipKey) => {
    const keygenStruct = keygenData[chipKey.chipId];
    if (keygenStruct) {
      if (keygenStruct.type === "person") {
        if (keygenStruct.isPersonSpeaker) {
          speakerPublicKeys.push(chipKey.signaturePublicKey);
        } else {
          attendeePublicKeys.push(chipKey.signaturePublicKey);
        }
      } else if (keygenStruct.type === "talk") {
        talkPublicKeys.push(chipKey.signaturePublicKey);
      }
    }
  });

  const attendeePublicKeysEdwards = attendeePublicKeys.map((publicKey) =>
    publicKeyFromString(publicKey).toEdwards()
  );
  const attendeeMerkleRootBigInt = await computeMerkleRoot(
    MERKLE_TREE_DEPTH,
    attendeePublicKeysEdwards,
    poseidon
  );
  const attendeeMerkleRoot = bigIntToHex(attendeeMerkleRootBigInt);

  const speakerPublicKeysEdwards = speakerPublicKeys.map((publicKey) =>
    publicKeyFromString(publicKey).toEdwards()
  );
  const speakerMerkleRootBigInt = await computeMerkleRoot(
    MERKLE_TREE_DEPTH,
    speakerPublicKeysEdwards,
    poseidon
  );
  const speakerMerkleRoot = bigIntToHex(speakerMerkleRootBigInt);

  const talkPublicKeysEdwards = talkPublicKeys.map((publicKey) =>
    publicKeyFromString(publicKey).toEdwards()
  );
  const talksMerkleRootBigInt = await computeMerkleRoot(
    MERKLE_TREE_DEPTH,
    talkPublicKeysEdwards,
    poseidon
  );
  const talksMerkleRoot = bigIntToHex(talksMerkleRootBigInt);

  return {
    attendeeMerkleRoot,
    speakerMerkleRoot,
    talksMerkleRoot,
  };
};
