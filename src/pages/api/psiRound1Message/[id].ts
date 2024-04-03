import { NextApiRequest, NextApiResponse } from "next";
import { ErrorResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ psiRound1Message: string | null } | ErrorResponse>
) {
  if (req.method === "GET") {
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
