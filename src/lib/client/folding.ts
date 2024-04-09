import { TreeRoots } from "../server/folding";

export const getAllMerkleRoots = async (): Promise<TreeRoots> => {
  const response = await fetch("/api/tree/root");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.json() as Promise<TreeRoots>;
};
