import prisma from "@/lib/server/prisma";
import { QuestWithRequirements } from "@/types";

export const getQuestById = async (
  id: number
): Promise<QuestWithRequirements | null> => {
  return await prisma.quest.findUnique({
    where: { id },
    include: {
      userRequirements: {
        select: {
          id: true,
          name: true,
          numSigsRequired: true,
          sigNullifierRandomness: true,
          users: {
            select: {
              displayName: true,
              encryptionPublicKey: true,
              signaturePublicKey: true,
            },
          },
        },
      },
      locationRequirements: {
        select: {
          id: true,
          name: true,
          numSigsRequired: true,
          sigNullifierRandomness: true,
          locations: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
              signaturePublicKey: true,
            },
          },
        },
      },
    },
  });
};
