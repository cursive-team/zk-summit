import { deleteAllActivities } from "./activities";
import { deleteAllFoldedProof } from "./foldedProof";
import { deleteAllItemRedeemed } from "./itemRedeemed";
import { deleteAllKeys } from "./keys";
import { deleteAllLocationSignatures } from "./locationSignatures";
import { deleteProfile } from "./profile";
import { deleteAllQuestCompleted } from "./questCompleted";
import { deleteSession } from "./session";
import { deleteAllUsers } from "./users";

export * from "./session";
export * from "./backup";
export * from "./profile";
export * from "./keys";
export * from "./users";
export * from "./locationSignatures";
export * from "./activities";
export * from "./questCompleted";
export * from "./itemRedeemed";
export * from "./foldedProof";

export const saveToLocalStorage = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

export const getFromLocalStorage = (key: string): string | null => {
  return localStorage.getItem(key);
};

export const deleteFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};

// Deletes all user account data from local storage
export const deleteAccountFromLocalStorage = (): void => {
  deleteSession();
  deleteAllKeys();
  deleteAllLocationSignatures();
  deleteProfile();
  deleteAllUsers();
  deleteAllActivities();
  deleteAllQuestCompleted();
  deleteAllItemRedeemed();
  deleteAllFoldedProof();
};
