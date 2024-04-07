import { initialKeygenData } from "@/shared/keygen";
import prisma from "@/lib/server/prisma";
import { TreeResponse } from "@/pages/api/tree";
import {
  bigIntToHex,
  computeMerkleRoot,
  publicKeyFromString,
} from "babyjubjub-ecdsa";
import { MERKLE_TREE_DEPTH } from "@/shared/constants";
// @ts-ignore
import { buildPoseidonReference as buildPoseidon } from "circomlibjs";

export const getAllMerkleRoots = async (): Promise<TreeResponse> => {
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
