import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ isUnique: boolean } | ErrorResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { displayName } = req.query;
  if (!displayName || typeof displayName !== "string") {
    return res.status(400).json({ error: "Bad Request" });
  }

  const sharedUser = await prisma.user.findFirst({
    where: {
      displayName,
    },
  });
  if (sharedUser) {
    return res.status(200).json({ isUnique: false });
  } else {
    return res.status(200).json({ isUnique: true });
  }
}
