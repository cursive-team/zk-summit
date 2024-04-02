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

// Populate user information based on a tap
export const updateUserFromTap = async (
  userUpdate: PersonTapResponse
): Promise<string> => {
  const users = getUsers();
  const userId = await hashPublicKeyToUUID(userUpdate.encryptionPublicKey);
  const user = users[userId];

  if (user) {
    const updatedUser = {
      ...user,
      name: userUpdate.displayName,
      encPk: userUpdate.encryptionPublicKey,
      x: userUpdate.twitter,
      tg: userUpdate.telegram,
      bio: userUpdate.bio,
    };

    users[userId] = updatedUser;
  } else {
    const newUser = {
      name: userUpdate.displayName,
      encPk: userUpdate.encryptionPublicKey,
      x: userUpdate.twitter,
      tg: userUpdate.telegram,
      bio: userUpdate.bio,
    };

    users[userId] = newUser;
  }

  saveUsers(users);

  return userId;
};

// Update user information after an outbound tap
export const updateUserFromOutboundTap = async (
  encryptionPublicKey: string,
  privateNote?: string
): Promise<void> => {
  const users = getUsers();
  const userId = await hashPublicKeyToUUID(encryptionPublicKey);
  const user = users[userId];

  if (!user) {
    return;
  }

  const updatedUser = {
    ...user,
    note: privateNote,
    outTs: new Date().toISOString(),
  };

  users[userId] = updatedUser;
  saveUsers(users);
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
