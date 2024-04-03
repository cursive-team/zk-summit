import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { boolean, object, string } from "yup";
import { ErrorResponse } from "@/types";
import {
  LocationTapResponse,
  generateChipSignature,
  locationTapResponseSchema,
} from "./cmac";

export type LocationInfo = {
  id: string;
  name: string;
  description: string;
  sponsor: string;
  imageUrl: string;
  signaturePublicKey: string;
};

export const locationInfoSchema = object({
  id: string().required(),
  name: string().required(),
  description: string().required(),
  sponsor: string().required(),
  imageUrl: string().required(),
  signaturePublicKey: string().required(),
});

export type SigCardTapResponse = {
  registered: boolean;
  locationInfo?: LocationInfo;
  locationInfoWithSig?: LocationTapResponse;
};

export const sigCardTapResponseSchema = object({
  registered: boolean().required(),
  locationInfo: locationInfoSchema.optional().default(undefined),
  locationInfoWithSig: locationTapResponseSchema.optional().default(undefined),
});

/**
 * GET
 * Receives a signature public key
 * Responds with location data
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SigCardTapResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // signaturePublicKey must be provided
  const signaturePublicKey = req.query.signaturePublicKey;
  if (!signaturePublicKey || typeof signaturePublicKey !== "string") {
    return res.status(400).json({ error: "Invalid public key" });
  }

  if (process.env.ENABLE_SIG_CARDS === "true") {
    const location = await prisma.location.findFirst({
      where: {
        signaturePublicKey,
      },
    });
    if (!location) {
      return res.status(200).json({ registered: false });
    }

    const locationInfo: LocationInfo = {
      id: location.id.toString(),
      name: location.name,
      description: location.description,
      sponsor: location.sponsor,
      imageUrl: location.imageUrl,
      signaturePublicKey: location.signaturePublicKey,
    };
    return res.status(200).json({ registered: true, locationInfo });
  } else {
    const chipId = signaturePublicKey;
    const location = await prisma.location.findFirst({
      where: {
        chipId,
      },
    });
    if (!location) {
      return res.status(200).json({ registered: false });
    }

    const { message, signature } = await generateChipSignature(chipId);
    const locationTapResponse: LocationTapResponse = {
      id: location.id.toString(),
      name: location.name,
      description: location.description,
      sponsor: location.sponsor,
      imageUrl: location.imageUrl,
      signaturePublicKey: location.signaturePublicKey,
      signatureMessage: message,
      signature,
    };

    return res.status(200).json({
      registered: true,
      locationInfoWithSig: locationTapResponse,
    });
  }
}
