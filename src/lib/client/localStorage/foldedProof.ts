import {
  deleteFromLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from ".";

export const FOLDED_PROOF_STORAGE_KEY = "foldedProof";

export type FoldedProof = {
  pfId: string; // Id for proof of folding
  pfLink: string; // Link to proof of folding
  ts: string; // Timestamp as ISO string
};

export const saveFoldedProof = (foldedProof: FoldedProof | undefined): void => {
  if (foldedProof) {
    saveToLocalStorage(FOLDED_PROOF_STORAGE_KEY, JSON.stringify(foldedProof));
  }
};

export const getFoldedProof = (): FoldedProof | undefined => {
  const foldedProof = getFromLocalStorage(FOLDED_PROOF_STORAGE_KEY);
  if (foldedProof) {
    return JSON.parse(foldedProof);
  }

  return undefined;
};

export const deleteAllFoldedProof = (): void => {
  deleteFromLocalStorage(FOLDED_PROOF_STORAGE_KEY);
};
