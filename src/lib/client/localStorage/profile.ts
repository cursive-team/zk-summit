import { object, string } from "yup";
import {
  deleteFromLocalStorage,
  getFromLocalStorage,
  saveToLocalStorage,
} from ".";

export const PROFILE_STORAGE_KEY = "profile";

export type Profile = {
  displayName: string;
  encryptionPublicKey: string;
  signaturePublicKey: string;
  twitterUsername?: string;
  telegramUsername?: string;
  farcasterUsername?: string;
  bio?: string;
};

export const profileSchema = object({
  displayName: string().required(),
  encryptionPublicKey: string().required(),
  signaturePublicKey: string().required(),
  twitterUsername: string().optional(),
  telegramUsername: string().optional(),
  farcasterUsername: string().optional(),
  bio: string().optional(),
});

export const saveProfile = (profile: Profile): void => {
  saveToLocalStorage(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

export const getProfile = (): Profile | undefined => {
  const profile = getFromLocalStorage(PROFILE_STORAGE_KEY);
  if (profile) {
    return JSON.parse(profile);
  }

  return undefined;
};

export const deleteProfile = (): void => {
  deleteFromLocalStorage(PROFILE_STORAGE_KEY);
};
