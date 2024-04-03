import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string, boolean } from "yup";
import { EmptyResponse, ErrorResponse } from "@/types";
import { verifyAuthToken } from "@/lib/server/auth";
import {
  telegramUsernameRegex,
  twitterUsernameRegex,
} from "@/lib/shared/utils";

const updateProfileSchema = object({
  authToken: string().required(),
  twitterUsername: string().optional().default(undefined),
  telegramUsername: string().optional().default(undefined),
  bio: string().optional().default(undefined),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EmptyResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let validatedData;
  try {
    validatedData = await updateProfileSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error("Profile update failed", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  if (!validatedData) {
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const { authToken, twitterUsername, telegramUsername, bio } = validatedData;

  if (
    twitterUsername &&
    twitterUsername !== "@" &&
    !twitterUsernameRegex.test(twitterUsername)
  ) {
    return res.status(400).json({ error: "Invalid Twitter username" });
  }

  if (
    telegramUsername &&
    telegramUsername !== "@" &&
    !telegramUsernameRegex.test(telegramUsername)
  ) {
    return res.status(400).json({ error: "Invalid Telegram username" });
  }

  if (bio && bio.length > 200) {
    return res
      .status(400)
      .json({ error: "Bio must be less than or equal to 200 characters" });
  }

  // Update user
  const userId = await verifyAuthToken(authToken);
  if (!userId) {
    return res.status(400).json({ error: "Invalid token" });
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!user) {
    return res.status(400).json({ error: "User not found" });
  }

  let parsedTwitter: string | undefined;
  if (
    twitterUsername === undefined ||
    twitterUsername === "" ||
    twitterUsername === "@"
  ) {
    parsedTwitter = undefined;
  } else {
    parsedTwitter = twitterUsername.startsWith("@")
      ? twitterUsername.slice(1)
      : twitterUsername;
  }

  let parsedTelegram: string | undefined;
  if (
    telegramUsername === undefined ||
    telegramUsername === "" ||
    telegramUsername === "@"
  ) {
    parsedTelegram = undefined;
  } else {
    parsedTelegram = telegramUsername.startsWith("@")
      ? telegramUsername.slice(1)
      : telegramUsername;
  }

  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        twitter: parsedTwitter,
        telegram: parsedTelegram,
        bio,
      },
    });
  } catch (error) {
    console.error("Failed to update user profile", error);
    return res.status(500).json({ error: "Failed to update user profile" });
  }

  return res.status(200).json({});
}
