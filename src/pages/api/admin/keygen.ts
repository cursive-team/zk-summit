import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { generateSignatureKeyPair } from "@/lib/shared/signature";
import { initialKeygenData } from "@/shared/keygen";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const password = req.body.password;
  if (password !== process.env.KEYGEN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const existingChipKey = await prisma.chipKey.findFirst();
  if (existingChipKey) {
    return res.status(400).json({ error: "Chip keys already exist" });
  }

  try {
    for (const [chipId, chipData] of Object.entries(initialKeygenData)) {
      // Generate and save signing keypair
      const { signingKey, verifyingKey } = generateSignatureKeyPair();
      await prisma.chipKey.create({
        data: {
          chipId,
          signaturePublicKey: verifyingKey,
          signaturePrivateKey: signingKey,
        },
      });

      // Logic for person chips
      if (chipData.type === "person") {
        // If user is a speaker, precreate user object
        if (chipData.speaker) {
          await prisma.user.create({
            data: {
              chipId,
              isRegistered: false,
              displayName: chipId,
              encryptionPublicKey: "",
              signaturePublicKey: verifyingKey,
              psiPublicKeysLink: "",
            },
          });
        }

        // Logic for talk chips
      } else if (chipData.type === "talk") {
        const talkName = chipData.talkName ? chipData.talkName : "Example Talk";
        const talkDescription = chipData.talkDescription
          ? chipData.talkDescription
          : "Example Description";
        await prisma.location.create({
          data: {
            chipId,
            name: talkName,
            description: talkDescription,
            sponsor: "",
            imageUrl: "",
            signaturePublicKey: verifyingKey,
          },
        });
      } else {
        console.error("Invalid keygen type, chipId:", chipId);
      }
    }

    res.status(200).json({});
  } catch (error) {
    res.status(500).json({ error: "Failed to read keygen file" });
  }
}
