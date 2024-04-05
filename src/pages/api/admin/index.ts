import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { EmptyResponse, ErrorResponse } from "@/types";
import {
  UserAdminInfo,
  getUserAdminInfo,
  isUserSuperAdmin,
} from "@/lib/server/admin";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserAdminInfo | EmptyResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    const { token } = req.query;

    if (typeof token !== "string") {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    try {
      const adminInfo = await getUserAdminInfo(token);
      return res.status(200).json(adminInfo);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  } else if (req.method === "POST") {
    // Create a new admin user
    const { token, otherUserId } = req.body;

    if (typeof token !== "string") {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const isSuperAdmin = await isUserSuperAdmin(token);
    if (!isSuperAdmin) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const otherUser = await prisma.user.findUnique({
      where: { id: parseInt(otherUserId) },
    });
    if (!otherUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const otherUserAdmin = await prisma.admin.findUnique({
      where: { userId: otherUserId },
    });
    if (otherUserAdmin) {
      res.status(400).json({ error: "User is already an admin" });
      return;
    }

    await prisma.admin.create({
      data: {
        userId: otherUserId,
        isSuperAdmin: false,
      },
    });

    res.status(200).json({});
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
