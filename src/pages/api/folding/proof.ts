import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { verifyAuthToken } from "@/lib/server/auth";
import { ErrorResponse } from "@/types";

export type GetFoldingProofResponse = {
  id: string;
  userName: string;
  userPublicKey: string;
  attendeeProofUrl?: string;
  attendeeProofCount?: number;
  speakerProofUrl?: string;
  speakerProofCount?: number;
  talkProofUrl?: string;
  talkProofCount?: number;
};

// GET request handler
async function handleGetRequest(
  req: NextApiRequest,
  res: NextApiResponse<GetFoldingProofResponse | ErrorResponse>
) {
  const { proofUuid } = req.query;
  if (typeof proofUuid !== "string") {
    return res.status(400).json({ error: "Invalid proofUuid parameter" });
  }

  try {
    const foldingProof = await prisma.foldedProof.findUnique({
      where: { id: proofUuid },
      select: {
        attendeeProofLink: true,
        attendeeNumFolded: true,
        speakerProofLink: true,
        speakerNumFolded: true,
        talkProofLink: true,
        talkNumFolded: true,
        user: {
          select: {
            displayName: true,
            signaturePublicKey: true,
          },
        },
      },
    });

    if (!foldingProof) {
      return res.status(404).json({ error: "Proof not found" });
    }

    return res.status(200).json({
      id: proofUuid,
      userName: foldingProof.user.displayName,
      userPublicKey: foldingProof.user.signaturePublicKey,
      attendeeProofUrl: foldingProof.attendeeProofLink
        ? foldingProof.attendeeProofLink
        : undefined,
      attendeeProofCount: foldingProof.attendeeNumFolded
        ? foldingProof.attendeeNumFolded
        : undefined,
      speakerProofUrl: foldingProof.speakerProofLink
        ? foldingProof.speakerProofLink
        : undefined,
      speakerProofCount: foldingProof.speakerNumFolded
        ? foldingProof.speakerNumFolded
        : undefined,
      talkProofUrl: foldingProof.talkProofLink
        ? foldingProof.talkProofLink
        : undefined,
      talkProofCount: foldingProof.talkNumFolded
        ? foldingProof.talkNumFolded
        : undefined,
    });
  } catch (error) {
    console.log('Error: ', error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// POST request handler
async function handlePostRequest(req: NextApiRequest, res: NextApiResponse) {
  const { authToken, data } = req.body;

  if (!authToken) {
    return res.status(400).json({ error: "Invalid input parameters" });
  }

  try {
    const userId = await verifyAuthToken(authToken);
    if (!userId) {
      return res.status(401).json({ error: "Invalid or expired auth token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { attendees, speakers, talks } = data;

    const newFoldingProof = await prisma.foldedProof.create({
      data: {
        userId,
        attendeeProofLink: attendees ? attendees.uri : null,
        attendeeNumFolded: attendees ? attendees.numFolded : null,
        speakerProofLink: speakers ? speakers.uri : null,
        speakerNumFolded: speakers ? speakers.numFolded : null,
        talkProofLink: talks ? talks.uri : null,
        talkNumFolded: talks ? talks.numFolded : null,
      },
    });

    return res.status(201).json({ proofUuid: newFoldingProof.id });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      await handleGetRequest(req, res);
      break;
    case "POST":
      await handlePostRequest(req, res);
      break;
    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
