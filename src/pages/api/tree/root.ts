import { getAllMerkleRoots } from "@/lib/server/folding";
import { ErrorResponse } from "@/types";
import { NextApiRequest, NextApiResponse } from "next";

export type TreeResponse = {
  attendeeMerkleRoot: string;
  speakerMerkleRoot: string;
  talksMerkleRoot: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TreeResponse | ErrorResponse>
) {
  if (req.method === "GET") {
    const merkleRoots = await getAllMerkleRoots();

    res.status(200).json(merkleRoots);
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
