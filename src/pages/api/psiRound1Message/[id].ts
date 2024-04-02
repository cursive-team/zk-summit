import { NextApiRequest, NextApiResponse } from "next";
import { ErrorResponse } from "@/types";
import prisma from "@/lib/server/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    | { psiRound1Message: string; wantsExperimentalFeatures: boolean }
    | ErrorResponse
  >
) {
  if (req.method === "GET") {
    const { id } = req.query;

    if (typeof id !== "string") {
      res.status(400).json({ error: "Invalid quest ID" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
        select: {
          psiRound1Message: true,
          wantsExperimentalFeatures: true,
        },
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
