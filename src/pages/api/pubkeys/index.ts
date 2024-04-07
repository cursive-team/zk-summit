import { getPubkeys } from "@/lib/server/folding";
import { ErrorResponse } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<string[] | ErrorResponse>
) {
  if (req.method === "GET") {
    let { pubkeyType } = req.query;
    let validKeyTypes = ["attendee", "speaker", "talk"];
    if (typeof pubkeyType !== "string" || !validKeyTypes.includes(pubkeyType)) {
      res.status(400).json({ error: "Invalid pubkey type" });
      return;
    }
    const pubkeys = await getPubkeys(pubkeyType);
    res.status(200).json(pubkeys);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
