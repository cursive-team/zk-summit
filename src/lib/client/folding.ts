import { TreeRoots } from "@/pages/api/tree/root";

export const getAllMerkleRoots = async (): Promise<TreeRoots> => {
  const response = await fetch("/api/tree");
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }

  return response.json() as Promise<TreeRoots>;
};
