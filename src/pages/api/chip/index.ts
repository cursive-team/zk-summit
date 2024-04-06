import { getChipIdFromIykRef } from "@/lib/server/iyk";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { iykRef } = req.query;
  if (!iykRef || typeof iykRef !== "string") {
    return res.status(400).json({ error: "Missing iykRef" });
  }

  try {
    const { chipId } = await getChipIdFromIykRef(iykRef, false);
    if (!chipId) {
      return res.status(404).json({ error: "Chip not found" });
    }

    return res.status(200).json({ chipId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
