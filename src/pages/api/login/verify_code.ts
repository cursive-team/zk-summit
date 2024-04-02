import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import {
  verifySigninCode,
  generateAuthToken,
  AuthTokenResponse,
} from "../../../lib/server/auth";
import { ErrorResponse } from "../../../types";
import { BackupResponse } from "../backup";
import { decryptBackupString } from "@/lib/shared/backup";

export type LoginResponse =
  | {
      authToken: AuthTokenResponse;
      backup: BackupResponse;
      password:
        | {
            salt: string;
            hash: string;
          }
        | undefined;
      twitter?: string;
      telegram?: string;
      bio?: string;
    }
  | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email: unprocessedEmail, code } = req.body;
  if (!unprocessedEmail || typeof unprocessedEmail !== "string" || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }
  const email = unprocessedEmail.toLowerCase().trim();

  const verifyResponse = await verifySigninCode(email, code, true);
  if (!verifyResponse.success) {
    return res
      .status(401)
      .json({ error: verifyResponse.reason || "Code verification failed" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Generate auth token
  const authToken = await generateAuthToken(user.id);

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

    return res.status(200).json({
      authToken,
      backup: { decryptedData: decryptedBackup },
      password: undefined,
    });
  } else {
    if (!user.passwordSalt || !user.passwordHash) {
      return res.status(404).json({ error: "Password not found" });
    }

    return res.status(200).json({
      authToken,
      backup: {
        encryptedData,
        authenticationTag,
        iv,
      },
      password: {
        salt: user.passwordSalt,
        hash: user.passwordHash,
      },
    });
  }
}
