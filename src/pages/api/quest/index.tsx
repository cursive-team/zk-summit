import { NextApiRequest, NextApiResponse } from "next";
import { object, string, array, number, mixed } from "yup";
import prisma from "@/lib/server/prisma";
import { verifyAuthToken } from "@/lib/server/auth";
import { ErrorResponse, QuestWithRequirements } from "@/types";
import { getServerRandomNullifierRandomness } from "@/lib/server/proving";
import { isUserAdmin } from "@/lib/server/admin";

export type QuestRequirementRequest = {
  name: string;
  type: "USER" | "LOCATION";
  ids: string[];
  numSigsRequired: number;
};

const questRequirementRequestSchema = object().shape({
  name: string().required("Requirement name is required"),
  type: mixed()
    .oneOf(["USER", "LOCATION"])
    .required("Requirement type is required"),
  ids: array()
    .of(string().required("ID is required"))
    .required("IDs are required"),
  numSigsRequired: number()
    .min(1, "At least one signature is required")
    .required("Number of signatures required is required"),
});

export type QuestCreateRequest = {
  token: string;
  name: string;
  description: string;
  buidlReward: number;
  requirements: QuestRequirementRequest[];
};

const questCreateRequestSchema = object().shape({
  token: string().required("Token is required"),
  name: string().required("Quest name is required"),
  description: string().required("Quest description is required"),
  requirements: array()
    .of(questRequirementRequestSchema)
    .required("Requirements are required"),
});

export type QuestCreateResponse = {
  id: number;
};

export type QuestGetResponse = QuestWithRequirements[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QuestGetResponse | QuestCreateResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    const { token } = req.query;

    if (typeof token !== "string") {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const userId = await verifyAuthToken(token);
    if (!userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const quests: QuestGetResponse = await prisma.quest.findMany({
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
    res.status(200).json(quests);
  } else if (req.method === "POST") {
    try {
      const { token, name, description, requirements } =
        await questCreateRequestSchema.validate(req.body);

      const isAdmin = await isUserAdmin(token);
      if (!isAdmin) {
        res.status(403).json({ error: "Unauthorized" });
        return;
      }

      if (requirements.length === 0) {
        res
          .status(400)
          .json({ error: "Quest must have at least one requirement" });
        return;
      }

      const userRequirements: QuestRequirementRequest[] = [];
      const locationRequirements: QuestRequirementRequest[] = [];
      requirements.forEach((requirement: any) => {
        if (
          parseInt(requirement.numSigsRequired) <= 0 ||
          parseInt(requirement.numSigsRequired) > requirement.ids.length
        ) {
          res
            .status(400)
            .json({ error: "Invalid number of signatures required" });
          return;
        }

        if (requirement.type === "USER") {
          userRequirements.push(requirement);
        } else if (requirement.type === "LOCATION") {
          locationRequirements.push(requirement);
        }
      });

      const quest = await prisma.quest.create({
        data: {
          name,
          description,
          userRequirements: {
            create: userRequirements.map((req) => ({
              name: req.name,
              numSigsRequired: req.numSigsRequired,
              sigNullifierRandomness: getServerRandomNullifierRandomness(), // Ensures signatures cannot be reused to meet this requirement
              users: {
                connect: req.ids.map((id) => ({ id: parseInt(id) })),
              },
            })),
          },
          locationRequirements: {
            create: locationRequirements.map((req) => ({
              name: req.name,
              numSigsRequired: req.numSigsRequired,
              sigNullifierRandomness: getServerRandomNullifierRandomness(), // Ensures signatures cannot be reused to meet this requirement
              locations: {
                connect: req.ids.map((id) => ({ id: parseInt(id) })),
              },
            })),
          },
        },
      });

      return res.status(200).json({ id: quest.id });
    } catch (err) {
      console.error(err);
      res.status(400).json({ error: "Failed to validate request" });
      return;
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
