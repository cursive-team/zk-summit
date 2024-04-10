import { NextApiRequest, NextApiResponse } from "next";
import { verifyAuthToken } from "@/lib/server/auth";
import prisma from "@/lib/server/prisma";
import { ErrorResponse } from "@/types";
import { LeaderboardData } from "@/hooks/useLeaderboard";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardData | ErrorResponse>
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

    try {
      const leaderboard: LeaderboardData = await prisma.user
        .findMany({
          select: {
            id: true,
            displayName: true,
            isRegistered: true,
            sentMessages: {
              select: {
                senderId: true,
                recipientId: true,
              },
              distinct: ["recipientId"],
            },
          },
        })

        .then((users) =>
          users
            .filter((user) => user.isRegistered)
            .map((user) => ({
              name: user.displayName,
              connections: user.sentMessages.filter(
                (message) => message.senderId !== message.recipientId
              ).length,
              isCurrentUser: user.id === userId,
            }))
        )
        .then((users) => users.sort((a, b) => b.connections - a.connections));

      res.status(200).json(leaderboard);
    } catch (error) {
      console.error("Failed to retrieve leaderboard:", error);
      res.status(500).json({ error: "Failed to retrieve leaderboard" });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
