import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";
import { isUserAdmin } from "@/lib/server/admin";
import { logServerEvent } from "@/lib/server/metrics";

export type QRCodeResponseType = {
  id: string;
  quest: {
    name: string;
  };
  user: {
    id: number;
    displayName: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<QRCodeResponseType | ErrorResponse>
) {
  if (req.method === "GET") {
    const { id, token } = req.query;
    if (typeof id !== "string") {
      return res.status(400).json({ error: "ID must be a string" });
    }

    if (typeof token !== "string") {
      return res.status(400).json({ error: "Token must be a string" });
    }

    logServerEvent("qrCodeFetch", {});

    const isAdmin = await isUserAdmin(token);
    if (!isAdmin) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const questProof = await prisma.questProof.findUnique({
      where: { id },
      include: {
        quest: {
          select: {
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            displayName: true,
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
