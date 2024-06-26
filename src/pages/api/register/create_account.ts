import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string } from "yup";
import { ErrorResponse } from "@/types";
import { AuthTokenResponse, generateAuthToken } from "@/lib/server/auth";
import {
  telegramUsernameRegex,
  twitterUsernameRegex,
} from "@/lib/shared/utils";
import {
  ChipType,
  getChipIdFromIykRef,
  getChipTypeFromChipId,
} from "@/lib/server/iyk";

const createAccountSchema = object({
  iykRef: string().required(),
  mockRef: string().optional().default(undefined),
  displayName: string().trim().required(),
  encryptionPublicKey: string().required(),
  psiPublicKeysLink: string().required(),
  passwordSalt: string().optional().default(undefined),
  passwordHash: string().optional().default(undefined),
  authPublicKey: string().optional().default(undefined),
  twitter: string().optional().default(undefined),
  telegram: string().optional().default(undefined),
  bio: string().optional().default(undefined),
});

export type CreateAccountResponse =
  | {
      authToken: AuthTokenResponse;
      signingKey: string;
      verifyingKey: string;
    }
  | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateAccountResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let validatedData;
  try {
    validatedData = await createAccountSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error("Account creation failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  if (!validatedData) {
    console.log("Account creation failed: no validated data");
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const {
    iykRef,
    mockRef,
    displayName,
    encryptionPublicKey,
    psiPublicKeysLink,
    passwordSalt,
    passwordHash,
    authPublicKey,
    twitter,
    telegram,
    bio,
  } = validatedData;

  if (/^\s|\s$/.test(displayName) || displayName.length > 20) {
    return res.status(400).json({
      error:
        "Display name cannot have leading or trailing whitespace and must be 20 characters or less",
    });
  }

  if (twitter && twitter !== "@" && !twitterUsernameRegex.test(twitter)) {
    return res.status(400).json({ error: "Invalid Twitter username" });
  }

  if (telegram && telegram !== "@" && !telegramUsernameRegex.test(telegram)) {
    return res.status(400).json({ error: "Invalid Telegram username" });
  }

  if (bio && bio.length > 200) {
    return res
      .status(400)
      .json({ error: "Bio must be less than or equal to 200 characters" });
  }

  // Validate iykRef corresponds to an unregistered person chip
  const enableMockRef =
    process.env.ALLOW_MOCK_REF === "true" && mockRef === "true";
  const { chipId } = await getChipIdFromIykRef(iykRef, enableMockRef);
  if (chipId === undefined) {
    return res.status(400).json({ error: "Invalid iykRef" });
  }
  const chipType = await getChipTypeFromChipId(chipId, enableMockRef);
  if (chipType !== ChipType.PERSON) {
    return res.status(400).json({ error: "Invalid iykRef" });
  }

  // Check that the chip key exists
  const chipKey = await prisma.chipKey.findUnique({
    where: {
      chipId,
    },
  });
  if (!chipKey) {
    return res.status(400).json({ error: "Chip key not found" });
  }

  // Check username has not been taken
  const existingUsername = await prisma.user.findUnique({
    where: {
      displayName,
    },
  });
  if (existingUsername) {
    return res.status(400).json({ error: "Username already taken" });
  }

  let parsedTwitter: string | undefined;
  if (twitter === undefined || twitter === "" || twitter === "@") {
    parsedTwitter = undefined;
  } else {
    parsedTwitter = twitter.startsWith("@") ? twitter.slice(1) : twitter;
  }

  let parsedTelegram: string | undefined;
  if (telegram === undefined || telegram === "" || telegram === "@") {
    parsedTelegram = undefined;
  } else {
    parsedTelegram = telegram.startsWith("@") ? telegram.slice(1) : telegram;
  }

  // Check if user is already created
  const existingChipUser: any = await prisma.user.findUnique({
    where: {
      chipId,
    },
  });
  // If user is created and registered, return error
  if (existingChipUser && existingChipUser?.isRegistered) {
    return res.status(400).json({ error: "Card already registered" });
  } else if (existingChipUser) {
    // If user is created but not registered, update user
    const updatedUser = await prisma.user.update({
      where: {
        chipId,
      },
      data: {
        // @ts-ignore
        isRegistered: true,
        displayName,
        encryptionPublicKey,
        signaturePublicKey: chipKey.signaturePublicKey,
        psiPublicKeysLink,
        passwordSalt,
        passwordHash,
        authPublicKey,
        twitter: parsedTwitter,
        telegram: parsedTelegram,
        bio,
      },
    });

    const authTokenResponse = await generateAuthToken(updatedUser.id);

    return res.status(200).json({
      authToken: authTokenResponse,
      signingKey: chipKey.signaturePrivateKey,
      verifyingKey: chipKey.signaturePublicKey,
    });
  }

  // If user is not created, create user
  const user = await prisma.user.create({
    data: {
      chipId,
      // @ts-ignore
      isRegistered: true,
      displayName,
      encryptionPublicKey,
      signaturePublicKey: chipKey.signaturePublicKey,
      psiPublicKeysLink,
      passwordSalt,
      passwordHash,
      authPublicKey,
      twitter: parsedTwitter,
      telegram: parsedTelegram,
      bio,
    },
  });

  const authTokenResponse = await generateAuthToken(user.id);

  return res.status(200).json({
    authToken: authTokenResponse,
    signingKey: chipKey.signaturePrivateKey,
    verifyingKey: chipKey.signaturePublicKey,
  });
}
