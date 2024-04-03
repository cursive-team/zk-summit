import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { verifyAuthToken } from "@/lib/server/auth"; // hypothetical function for auth token verification
import { ErrorResponse } from "@/types";
import { getQuestById } from "@/lib/server/database";
import { verifyProofForQuest } from "@/lib/server/proving";

type SubmitQuestProofRequest = {
  questId: string;
  authToken: string;
  serializedProof: string;
};

type SubmitQuestProofResponse = {
  verified: boolean;
  proofId?: string;
};

export default async function submitProofHandler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitQuestProofResponse | ErrorResponse>
) {
  if (req.method === "POST") {
    const { questId, authToken, serializedProof }: SubmitQuestProofRequest =
      req.body;

    if (
      typeof questId !== "string" ||
      typeof authToken !== "string" ||
      typeof serializedProof !== "string"
    ) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    // Verify the auth token
    const userId = await verifyAuthToken(authToken);
    if (!userId) {
      return res.status(400).json({ error: "Invalid or expired auth token" });
    }

    if (Number.isNaN(parseInt(questId))) {
      return res.status(400).json({ error: "Invalid quest ID" });
    }

    const quest = await getQuestById(parseInt(questId));
    if (!quest) {
      return res.status(404).json({ error: "Quest not found" });
    }

    const { verified, consumedSigNullifiers } = await verifyProofForQuest(
      quest,
      serializedProof
    );
    if (!verified) {
      return res.status(200).json({ verified: false });
    }

    // Check that nullifiers are unused
    if (consumedSigNullifiers) {
      const { user: userNullifiers, location: locationNullifiers } =
        consumedSigNullifiers;
      if (userNullifiers.length !== quest.userRequirements.length) {
        return res.status(400).json({ error: "Invalid proof" });
      }
      for (let i = 0; i < quest.userRequirements.length; i++) {
        const userRequirementId = quest.userRequirements[i].id;
        const nullifiers = userNullifiers[i];
        const existingNullifiers = await prisma.userSigNullifier.findMany({
          where: {
            userRequirementId,
            sigNullifier: {
              in: nullifiers,
            },
          },
        });
        if (existingNullifiers.length > 0) {
          console.error(
            `One or more user nullifiers already used for user requirement ${userRequirementId}`
          );
          return res.status(200).json({ verified: false });
        }
      }

      if (locationNullifiers.length !== quest.locationRequirements.length) {
        return res.status(400).json({ error: "Invalid proof" });
      }
      for (let i = 0; i < quest.locationRequirements.length; i++) {
        const locationRequirementId = quest.locationRequirements[i].id;
        const nullifiers = locationNullifiers[i];
        const existingNullifiers = await prisma.locationSigNullifier.findMany({
          where: {
            locationRequirementId,
            sigNullifier: {
              in: nullifiers,
            },
          },
        });
        if (existingNullifiers.length > 0) {
          console.error(
            `One or more location nullifiers already used for location requirement ${locationRequirementId}`
          );
          return res.status(200).json({ verified: false });
        }
      }
    }

    // Save the proof to the database
    const proof = await prisma.questProof.create({
      data: {
        questId: quest.id,
        userId: userId,
        serializedProof,
      },
    });

    // Update sig nullifiers
    if (consumedSigNullifiers) {
      const { user: userNullifiers, location: locationNullifiers } =
        consumedSigNullifiers;
      for (let i = 0; i < quest.userRequirements.length; i++) {
        const userRequirementId = quest.userRequirements[i].id;
        const nullifiers = userNullifiers[i];
        await prisma.userSigNullifier.createMany({
          data: nullifiers.map((nullifier) => ({
            questProofId: proof.id,
            userRequirementId,
            sigNullifier: nullifier,
          })),
        });
      }
      for (let i = 0; i < quest.locationRequirements.length; i++) {
        const locationRequirementId = quest.locationRequirements[i].id;
        const nullifiers = locationNullifiers[i];
        await prisma.locationSigNullifier.createMany({
          data: nullifiers.map((nullifier) => ({
            questProofId: proof.id,
            locationRequirementId,
            sigNullifier: nullifier,
          })),
        });
      }
    }

    res.status(200).json({ verified: true, proofId: proof.id });
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
