import { NextApiRequest, NextApiResponse } from "next";
import { head } from "@vercel/blob";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";
import { generateSignatureKeyPair } from "@/lib/shared/signature";
import {
  ChipType,
  getChipIdFromIykRef,
  getChipTypeFromChipId,
} from "@/lib/server/iyk";

export type LocationRegistrationResponse = {
  locationId: Number;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LocationRegistrationResponse | ErrorResponse>
) {
  if (req.method === "POST") {
    const {
      iykRef,
      mockRef,
      sigPk,
      name,
      description,
      sponsor,
      imageUrl,
      emailWallet,
    } = req.body;

    if (
      typeof name !== "string" ||
      typeof description !== "string" ||
      typeof sponsor !== "string" ||
      typeof imageUrl !== "string"
    ) {
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    // Register a cmac location chip
    if (iykRef && typeof iykRef === "string") {
      const enableMockRef =
        process.env.ALLOW_MOCK_REF === "true" && mockRef === "true";
      const { chipId } = await getChipIdFromIykRef(iykRef, enableMockRef);
      if (!chipId) {
        return res.status(400).json({ error: "Invalid iykRef" });
      }

      const chipType = await getChipTypeFromChipId(chipId, enableMockRef);
      if (chipType !== ChipType.LOCATION) {
        return res
          .status(400)
          .json({ error: "iykRef does not correspond to location chip" });
      }

      // Check that location is not already registered
      const existingLocation = await prisma.location.findUnique({
        where: {
          chipId,
        },
      });
      if (existingLocation) {
        return res.status(400).json({ error: "Location already registered" });
      }

      // Check that user uploaded location image to vercel blob
      try {
        await head(imageUrl);
      } catch (error) {
        return res.status(400).json({ error: "Invalid image url" });
      }

      // Generate signing keypair for the location
      const { signingKey, verifyingKey } = generateSignatureKeyPair();

      const location = await prisma.location.create({
        data: {
          chipId,
          name,
          description,
          sponsor,
          imageUrl,
          signaturePublicKey: verifyingKey,
          displayEmailWalletLink: emailWallet,
        },
      });

      await prisma.chipKey.create({
        data: {
          chipId,
          signaturePublicKey: verifyingKey,
          signaturePrivateKey: signingKey,
        },
      });

      return res.status(200).json({ locationId: location.id });
    } else if (sigPk && typeof sigPk === "string") {
      // Register a signature card location chip using card sig public key
      if (process.env.ENABLE_SIG_CARDS === "true") {
        const existingLocation = await prisma.location.findFirst({
          where: {
            signaturePublicKey: sigPk,
          },
        });
        if (existingLocation) {
          return res.status(400).json({ error: "Location already registered" });
        }

        // Check that user uploaded location image to vercel blob
        try {
          await head(imageUrl);
        } catch (error) {
          return res.status(400).json({ error: "Invalid image url" });
        }

        const location = await prisma.location.create({
          data: {
            chipId: sigPk,
            name,
            description,
            sponsor,
            imageUrl,
            signaturePublicKey: sigPk,
            displayEmailWalletLink: emailWallet,
          },
        });
        return res.status(200).json({ locationId: location.id });
        // Register a signature card location chip using server generated sigs
      } else {
        const existingLocation = await prisma.location.findFirst({
          where: {
            chipId: sigPk,
          },
        });
        if (existingLocation) {
          return res.status(400).json({ error: "Location already registered" });
        }

        // Check that user uploaded location image to vercel blob
        try {
          await head(imageUrl);
        } catch (error) {
          return res.status(400).json({ error: "Invalid image url" });
        }

        // Generate signing keypair for the location
        const { signingKey, verifyingKey } = generateSignatureKeyPair();
        const chipId = sigPk;

        const location = await prisma.location.create({
          data: {
            chipId,
            name,
            description,
            sponsor,
            imageUrl,
            signaturePublicKey: verifyingKey,
            displayEmailWalletLink: emailWallet,
          },
        });

        await prisma.chipKey.create({
          data: {
            chipId,
            signaturePublicKey: verifyingKey,
            signaturePrivateKey: signingKey,
          },
        });

        return res.status(200).json({ locationId: location.id });
      }
    } else {
      return res.status(400).json({ error: "Invalid input parameters" });
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
