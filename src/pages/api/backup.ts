import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string } from "yup";
import { decryptBackupString } from "@/lib/shared/backup";
import { verifyAuthToken } from "../../lib/server/auth";
import { EmptyResponse, ErrorResponse } from "../../types";

export type EncryptedBackupData = {
  encryptedData: string;
  authenticationTag: string;
  iv: string;
};

export const encryptedBackupDataSchema = object({
  encryptedData: string().required(),
  authenticationTag: string().required(),
  iv: string().required(),
});

export type BackupResponse = EncryptedBackupData | { decryptedData: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<BackupResponse | EmptyResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    const { authToken } = req.query;

    if (typeof authToken !== "string") {
      return res.status(400).json({ error: "Invalid auth token" });
    }

    // Validate authToken
    const userId = await verifyAuthToken(authToken);
    if (userId === undefined) {
      return res.status(401).json({ error: "Invalid or expired auth token" });
    }

    // Retrieve user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get latest backup
    const backup = await prisma.backup.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!backup) {
      return res.status(404).json({ error: "Backup not found" });
    }

    const { encryptedData, authenticationTag, iv } = backup;

    if (backup.isServerEncrypted) {
      const serverEncryptionEmail = process.env.SERVER_ENCRYPTION_EMAIL!;
      const serverEncryptionPassword = process.env.SERVER_ENCRYPTION_PASSWORD!;
      const decryptedBackup = decryptBackupString(
        encryptedData,
        authenticationTag,
        iv,
        serverEncryptionEmail,
        serverEncryptionPassword
      );
      return res.status(200).json({ decryptedData: decryptedBackup });
    }

    return res.status(200).json({
      encryptedData,
      authenticationTag,
      iv,
    });
  } else if (req.method === "POST") {
    const { backup, authToken } = req.body;

    // Validate authToken
    const userId = await verifyAuthToken(authToken);
    if (userId === undefined) {
      return res.status(401).json({ error: "Invalid or expired auth token" });
    }

    // Retrieve user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Backup must be an object with encryptedData, authenticationTag, and iv
    try {
      const backupData = encryptedBackupDataSchema.validateSync(backup);
      if (!backupData) {
        throw new Error("Invalid backup");
      }

      const { encryptedData, authenticationTag, iv } = backupData;
      await prisma.backup.create({
        data: {
          userId: user.id,
          encryptedData,
          authenticationTag,
          iv,
          isServerEncrypted: false,
        },
      });
    } catch (error) {
      return res.status(400).json({ error: "Invalid backup" });
    }

    return res.status(200).json({});
  } else {
    return res.status(405).json({ error: "Method Not Allowed" });
  }
}
