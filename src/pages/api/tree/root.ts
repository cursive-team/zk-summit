import { TreeRoots, getAllMerkleRoots } from "@/lib/server/folding";
import { ErrorResponse } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TreeRoots | ErrorResponse>
) {
  if (req.method === "GET") {
    const merkleRoots = await getAllMerkleRoots();

    res.status(200).json(merkleRoots);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
