import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { verifyAuthToken } from "../../lib/server/auth";
import { EmptyResponse, ErrorResponse } from "../../types";
import { EncryptedMessage } from "@/lib/client/jubSignal";
import { array, boolean, object, string } from "yup";
import { logServerEvent } from "@/lib/server/metrics";

export type MessageRequest = {
  encryptedMessage: string;
  recipientPublicKey: string;
};

export const messageRequestSchema = object({
  encryptedMessage: string().required(),
  recipientPublicKey: string().required(),
});

export const postMessagesSchema = object({
  token: string().required(),
  messageRequests: array().of(messageRequestSchema).required(),
  shouldFetchMessages: boolean().required(),
  startDate: string().optional().default(undefined),
  endDate: string().optional().default(undefined),
});

export type GetMessagesResponse = {
  messages: EncryptedMessage[];
  mostRecentMessageTimestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMessagesResponse | EmptyResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    const { token, startDate, endDate } = req.query;

    if (typeof token !== "string") {
      res.status(400).json({ error: "Invalid token" });
      return;
    }

    const userId = await verifyAuthToken(token);
    if (!userId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    logServerEvent("loadMessagesServerGet", {});

    // Add date filters if they are valid
    // Use half open interval [startDate, endDate)
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (typeof startDate === "string" && !isNaN(Date.parse(startDate))) {
      dateFilter["gte"] = new Date(startDate);
    }
    let mostRecentMessageTimestamp = endDate;
    if (typeof endDate === "string" && !isNaN(Date.parse(endDate))) {
      dateFilter["lt"] = new Date(endDate);
    } else if (endDate === undefined) {
      const newEndDate = new Date();
      dateFilter["lt"] = newEndDate;
      mostRecentMessageTimestamp = newEndDate.toISOString();
    } else {
      res.status(400).json({ error: "Invalid end date" });
      return;
    }

    const receivedMessages = await prisma.message.findMany({
      where: {
        recipientId: userId,
        createdAt: dateFilter,
      },
      include: {
        sender: {
          select: {
            displayName: true,
            encryptionPublicKey: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const messages: EncryptedMessage[] = receivedMessages.map((message) => ({
      metadata: {
        toPublicKey: user.encryptionPublicKey,
        fromPublicKey: message.sender.encryptionPublicKey,
        fromDisplayName: message.sender.displayName,
        timestamp: message.createdAt,
      },
      encryptedContents: message.encryptedData,
    }));

    res.status(200).json({ messages, mostRecentMessageTimestamp });
  } else if (req.method === "POST") {
    let validatedData;
    try {
      validatedData = await postMessagesSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
      if (!validatedData) {
        throw new Error("Could not validate request body");
      }
    } catch (error) {
      console.error("Invalid arguments for posting message", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    logServerEvent("loadMessagesServerPost", {});

    const { token, messageRequests, shouldFetchMessages, startDate, endDate } =
      validatedData;

    const senderUserId = await verifyAuthToken(token);
    if (!senderUserId) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    const sender = await prisma.user.findUnique({
      where: { id: senderUserId },
    });
    if (!sender) {
      res.status(404).json({ error: "Sender user not found" });
      return;
    }

    if (messageRequests.length === 0) {
      res.status(400).json({ error: "No message requests" });
      return;
    }

    let latestMessageDate: Date;
    for (const { encryptedMessage, recipientPublicKey } of messageRequests) {
      const recipient = await prisma.user.findFirst({
        where: { encryptionPublicKey: recipientPublicKey },
      });
      if (!recipient) {
        res.status(404).json({ error: "Recipient user not found" });
        return;
      }

      const message = await prisma.message.create({
        data: {
          senderId: sender.id,
          recipientId: recipient.id,
          encryptedData: encryptedMessage,
        },
      });
      latestMessageDate = message.createdAt;
    }

    // If no need to fetch messages, return
    if (!shouldFetchMessages) {
      return res.status(200).json({});
    }

    // Fetch messages for sender if requested
    // Add date filters if they are valid
    // Use half open interval [startDate, endDate)
    const dateFilter: { gte?: Date; lt?: Date } = {};
    if (typeof startDate === "string" && !isNaN(Date.parse(startDate))) {
      dateFilter["gte"] = new Date(startDate);
    }
    let mostRecentMessageTimestamp = endDate;
    if (typeof endDate === "string" && !isNaN(Date.parse(endDate))) {
      dateFilter["lt"] = new Date(endDate);
    } else if (endDate === undefined) {
      const newEndDate = new Date(latestMessageDate!.getTime() + 1);
      dateFilter["lt"] = newEndDate;
      mostRecentMessageTimestamp = newEndDate.toISOString();
    } else {
      res.status(400).json({ error: "Invalid end date" });
      return;
    }

    const receivedMessages = await prisma.message.findMany({
      where: {
        recipientId: sender.id,
        createdAt: dateFilter,
      },
      include: {
        sender: {
          select: {
            displayName: true,
            encryptionPublicKey: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const messages: EncryptedMessage[] = receivedMessages.map((message) => ({
      metadata: {
        toPublicKey: sender.encryptionPublicKey,
        fromPublicKey: message.sender.encryptionPublicKey,
        fromDisplayName: message.sender.displayName,
        timestamp: message.createdAt,
      },
      encryptedContents: message.encryptedData,
    }));

    res.status(200).json({ messages, mostRecentMessageTimestamp });
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
