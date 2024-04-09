import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";
import { isUserAdmin } from "@/lib/server/admin";
import { logServerEvent } from "@/lib/server/metrics";

export type QRCodeResponseType = {
  id: string;
  quest: {
    name: string;
    description: string;
  };
  user: {
    id: number;
    displayName: string;
    signaturePublicKey: string;
  };
  serializedProof: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QRCodeResponseType | ErrorResponse>
) {
  if (req.method === "GET") {
    const { id } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "ID must be a string" });
    }

    logServerEvent("qrCodeFetch", {});

    const questProof = await prisma.questProof.findUnique({
      where: { id },
      include: {
        quest: {
          select: {
            name: true,
            description: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
            signaturePublicKey: true,
          },
        },
      },
    });
    if (!questProof) {
      return res.status(404).json({ error: "QR code not found" });
    }

    res.status(200).json(questProof);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
