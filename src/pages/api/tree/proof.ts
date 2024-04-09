import { getMerkleProof } from "@/lib/server/folding";
import { ErrorResponse } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";
import { merkleProofToObject } from "@/lib/shared/utils";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Object | ErrorResponse>
) {
  if (req.method === "GET") {
    let { treeType, pubkey } = req.query;
    let validTreeTypes = ["attendee", "speaker", "talk"];
    if (typeof treeType !== "string" || !validTreeTypes.includes(treeType)) {
      res.status(400).json({ error: "Invalid tree type" });
      return;
    } else if (typeof pubkey !== "string") {
      res.status(400).json({ error: "Invalid pubkey" });
      return;
    }
    const merkleProof = await getMerkleProof(pubkey, treeType);
    res.status(200).json(merkleProofToObject(merkleProof));
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
