import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ chipId: string } | ErrorResponse>
) {
  if (req.method === "GET") {
    while (true) {
      const randomId = Math.floor(Math.random() * 10000).toString();
      const existingUser = await prisma.user.findUnique({
        where: { chipId: randomId },
      });

      if (!existingUser) {
        return res.status(200).json({ chipId: randomId });
      }
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
