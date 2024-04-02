import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/server/prisma";
import { object, string, boolean } from "yup";
import { ErrorResponse } from "@/types";
import {
  AuthTokenResponse,
  generateAuthToken,
  verifySigninCode,
} from "@/lib/server/auth";
import {
  ChipType,
  getChipIdFromIykRef,
  getChipTypeFromChipId,
  verifyEmailForChipId,
} from "@/lib/server/iyk";
import { getClaveInviteLink } from "@/lib/server/clave";

const createAccountSchema = object({
  iykRef: string().required(),
  mockRef: string().optional().default(undefined),
  email: string().email().trim().lowercase().required(),
  displayName: string().trim().required(),
  wantsServerCustody: boolean().required(),
  allowsAnalytics: boolean().required(),
  wantsExperimentalFeatures: boolean().required(),
  encryptionPublicKey: string().required(),
  signaturePublicKey: string().required(),
  psiRound1Message: string().required(),
  passwordSalt: string().optional(),
  passwordHash: string().optional(),
});

type RegisterResponse = {
  authTokenResponse: AuthTokenResponse;
  pkId: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterResponse | ErrorResponse>
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
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const {
    iykRef,
    mockRef,
    email,
    displayName,
    wantsServerCustody,
    allowsAnalytics,
    wantsExperimentalFeatures,
    encryptionPublicKey,
    signaturePublicKey,
    psiRound1Message,
    passwordSalt,
    passwordHash,
  } = validatedData;

  if (!displayName || /^\s|\s$/.test(displayName) || displayName.length > 20) {
    return res.status(400).json({
      error:
        "Display name cannot have leading or trailing whitespace and must be less than or equal to 20 characters",
    });
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
  const existingUser = await prisma.user.findUnique({
    where: {
      chipId,
    },
  });
  if (existingUser) {
    return res.status(400).json({ error: "Card already registered" });
  }

  if (!mockRef) {
    const emailMatchesChipId = verifyEmailForChipId(chipId, email);
    if (!emailMatchesChipId) {
      return res.status(400).json({ error: "Email does not match iykRef" });
    }
  }

  // Fetch a clave invite code
  const claveInviteCodeResponse = await fetch(
    "https://api.getclave.io/api/v1/waitlist/codes/single",
    {
      method: "POST",
      headers: {
        "x-api-key": process.env.CLAVE_API_KEY!,
      },
    }
  );
  if (!claveInviteCodeResponse.ok) {
    return res.status(400).json({ error: "Failed to fetch Clave invite code" });
  }

  const { code: claveInviteCode } = await claveInviteCodeResponse.json();
  if (!claveInviteCode) {
    return res.status(500).json({ error: "Clave invite code not received" });
  }

  let claveInviteLink: string;
  try {
    claveInviteLink = await getClaveInviteLink(email, claveInviteCode);
  } catch (error) {
    console.error("Error generating Clave invite link:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      chipId,
      email,
      displayName,
      wantsServerCustody,
      allowsAnalytics,
      wantsExperimentalFeatures,
      encryptionPublicKey,
      signaturePublicKey,
      psiRound1Message,
      passwordSalt,
      passwordHash,
      claveInviteCode,
      claveInviteLink,
    },
  });

  const authTokenResponse = await generateAuthToken(user.id);

  return res
    .status(200)
    .json({ authTokenResponse: authTokenResponse, pkId: user.id.toString() });
}
