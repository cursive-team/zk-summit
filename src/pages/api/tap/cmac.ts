import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { boolean, object, string } from "yup";
import { ErrorResponse } from "@/types";
import { sign } from "@/lib/shared/signature";
import { getCounterMessage } from "babyjubjub-ecdsa";
import {
  ChipType,
  getChipIdFromIykRef,
  getChipTypeFromChipId,
} from "@/lib/server/iyk";
const crypto = require("crypto");

export enum TapResponseCode {
  CMAC_INVALID = "CMAC_INVALID",
  PERSON_NOT_REGISTERED = "PERSON_NOT_REGISTERED",
  LOCATION_NOT_REGISTERED = "LOCATION_NOT_REGISTERED",
  VALID_PERSON = "VALID_PERSON",
  VALID_LOCATION = "VALID_LOCATION",
  CHIP_KEY_NOT_FOUND = "CHIP_KEY_NOT_FOUND",
}

export type PersonTapResponse = {
  displayName: string;
  encryptionPublicKey: string;
  psiPublicKeysLink: string;
  pkId: string;
  twitter?: string;
  telegram?: string;
  bio?: string;
  isUserSpeaker: boolean;
  signaturePublicKey: string;
  signatureMessage: string;
  signature: string;
};

export const personTapResponseSchema = object({
  displayName: string().required(),
  encryptionPublicKey: string().required(),
  psiPublicKeysLink: string().required(),
  pkId: string().required(),
  twitter: string().optional().default(undefined),
  telegram: string().optional().default(undefined),
  bio: string().optional().default(undefined),
  isUserSpeaker: boolean().required(),
  signaturePublicKey: string().required(),
  signatureMessage: string().required(),
  signature: string().required(),
});

export type LocationTapResponse = {
  id: string;
  name: string;
  stage: string;
  speaker: string;
  description: string;
  startTime: string;
  endTime: string;
  signaturePublicKey: string;
  signatureMessage: string;
  signature: string;
};

export const locationTapResponseSchema = object({
  id: string().required(),
  name: string().required(),
  stage: string().required(),
  speaker: string().required(),
  description: string().required(),
  startTime: string().required(),
  endTime: string().required(),
  signaturePublicKey: string().required(),
  signatureMessage: string().required(),
  signature: string().required(),
});

export type TapResponse = {
  code: TapResponseCode;
  person?: PersonTapResponse;
  location?: LocationTapResponse;
};

export const tapResponseSchema = object({
  code: string().oneOf(Object.values(TapResponseCode)),
  person: personTapResponseSchema.optional().default(undefined),
  location: locationTapResponseSchema.optional().default(undefined),
});

/**
 * Returns a signature for a given chip
 * Mirrors Arx card signature generation
 * First 4 bytes of message are an incrementing counter
 * Remaining 28 bytes are random
 * @param chipId The id of the chip for which to generate a signature
 */
export const generateChipSignature = async (
  chipId: string
): Promise<{ message: string; signature: string }> => {
  const chipKey = await prisma.chipKey.findFirst({
    where: {
      chipId,
    },
  });
  if (!chipKey) {
    throw new Error("Chip key not found");
  }

  const { signaturePrivateKey, numPreviousTaps } = chipKey;
  const msgNonce = numPreviousTaps + 1; // Incrementing counter
  const randomBytes = crypto.randomBytes(28); // 28 random bytes
  const message = getCounterMessage(msgNonce, randomBytes.toString("hex"));
  const signature = sign(signaturePrivateKey, message);

  await prisma.chipKey.update({
    where: {
      chipId,
    },
    data: {
      numPreviousTaps: numPreviousTaps + 1,
    },
  });

  return { message, signature };
};

/**
 * GET
 * Receives an iyk chip iykRef
 * Responds with person tap data, location tap data, or an error
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TapResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // iykRef must be provided
  const iykRef = req.query.iykRef;
  if (!iykRef || typeof iykRef !== "string") {
    return res.status(400).json({ error: "Invalid code provided" });
  }

  const mockRef: boolean =
    process.env.ALLOW_MOCK_REF === "true" && req.query.mockRef === "true";

  const { chipId, isValid } = await getChipIdFromIykRef(iykRef, mockRef);
  // ref must exist in iyk's lookup
  if (chipId === undefined) {
    return res.status(400).json({ error: "Invalid code provided" });
  }
  // ref must not have been used before
  if (!isValid) {
    return res.status(200).json({ code: TapResponseCode.CMAC_INVALID });
  }

  // chip key must exist
  const chipKey = await prisma.chipKey.findFirst({
    where: {
      chipId,
    },
  });
  if (!chipKey) {
    return res.status(400).json({
      code: TapResponseCode.CHIP_KEY_NOT_FOUND,
      error: "Chip key not found",
    });
  }

  // if user is registered, return user data
  const user = await prisma.user.findUnique({
    where: {
      chipId,
    },
  });
  if (user) {
    // If user is not registered, return person not registered response
    if (!user.isRegistered) {
      return res
        .status(200)
        .json({ code: TapResponseCode.PERSON_NOT_REGISTERED });
    }

    // Get signature from chip
    const { message, signature } = await generateChipSignature(chipId);

    const personTapResponse: PersonTapResponse = {
      displayName: user.displayName,
      pkId: user.id.toString(),
      psiPublicKeysLink: user.psiPublicKeysLink,
      encryptionPublicKey: user.encryptionPublicKey,
      twitter: user.twitter ? user.twitter : undefined,
      telegram: user.telegram ? user.telegram : undefined,
      bio: user.bio ? user.bio : undefined,
      isUserSpeaker: user.isUserSpeaker,
      signaturePublicKey: user.signaturePublicKey,
      signatureMessage: message,
      signature,
    };
    return res
      .status(200)
      .json({ code: TapResponseCode.VALID_PERSON, person: personTapResponse });
  }

  // if location is registered, return location data
  const location = await prisma.location.findUnique({
    where: {
      chipId,
    },
  });
  if (location) {
    // Get signature from chip
    const { message, signature } = await generateChipSignature(chipId);

    const locationTapResponse: LocationTapResponse = {
      id: location.id.toString(),
      name: location.name,
      stage: location.stage,
      speaker: location.speaker,
      description: location.description,
      startTime: location.startTime,
      endTime: location.endTime,
      signaturePublicKey: location.signaturePublicKey,
      signatureMessage: message,
      signature,
    };
    return res.status(200).json({
      code: TapResponseCode.VALID_LOCATION,
      location: locationTapResponse,
    });
  }

  // card is not registered, return whether it is a person card or location card
  const chipType = await getChipTypeFromChipId(chipId, mockRef);
  if (chipType === ChipType.PERSON) {
    return res
      .status(200)
      .json({ code: TapResponseCode.PERSON_NOT_REGISTERED });
  } else if (chipType === ChipType.LOCATION) {
    return res
      .status(200)
      .json({ code: TapResponseCode.LOCATION_NOT_REGISTERED });
  } else {
    return res.status(200).json({ code: TapResponseCode.CMAC_INVALID });
  }
}
