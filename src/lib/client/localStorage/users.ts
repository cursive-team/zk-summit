import { hashPublicKeyToUUID } from "@/lib/client/utils";
import { PersonTapResponse } from "@/pages/api/tap/cmac";
import {
  deleteFromLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from ".";

export const USERS_STORAGE_KEY = "users";

export type User = {
  name: string; // User's display name
  encPk: string; // User's encryption public key
  pkId: string; // User's public key index for PSI
  psiPkLink?: string; // Link to user's PSI public keys
  x?: string; // User's Twitter username
  tg?: string; // User's Telegram username
  fc?: string; // User's Farcaster username
  bio?: string; // User's bio
  note?: string; // Private note
  sigPk?: string; // User's signature public key
  msg?: string; // User's signature message
  sig?: string; // User's signature
  outTs?: string; // Time of last outbound tap as ISO string
  inTs?: string; // Time of last inbound tap as ISO string
  oI?: string; // User's PSI overlap indices
  isSpeaker?: boolean; // Whether the user is a speaker
};

export const saveUsers = (users: Record<string, User>): void => {
  saveToLocalStorage(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const getUsers = (): Record<string, User> => {
  const users = getFromLocalStorage(USERS_STORAGE_KEY);
  if (users) {
    return JSON.parse(users);
  }

  return {};
};

// Users are stored based on the hash of their encryption public key
export const fetchUserByEncryptionPublicKey = async (
  encryptionPublicKey: string
): Promise<User | undefined> => {
  const userId = await hashPublicKeyToUUID(encryptionPublicKey);

  return fetchUserByUUID(userId);
};

export const fetchUserByUUID = (userId: string): User | undefined => {
  const users = getUsers();

  return users[userId];
};

export const deleteAllUsers = (): void => {
  deleteFromLocalStorage(USERS_STORAGE_KEY);
};
