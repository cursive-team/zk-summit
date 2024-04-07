import { TreeResponse } from "@/pages/api/tree";

export const getAllMerkleRoots = async (): Promise<TreeResponse> => {
  const response = await fetch("/api/tree");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.json() as Promise<TreeResponse>;
};
