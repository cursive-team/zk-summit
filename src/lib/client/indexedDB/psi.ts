import localforage from "localforage";
import { hashPublicKeyToUUID } from "../utils";

export const USERS_STORAGE_KEY = "userPsiState";

export type UserPSIState = {
  pkId?: string; // Public key ID
  r1O?: string; // Round 1 output for PSI with this user
  mr2?: string; // User's message for round 2
  r2O?: string; // Round 2 output for PSI with this user
  mr3?: string; // User's message for round 3
  oI?: string; // User's PSI overlap indices
};

// map from userId -> data
export const saveUserPsiState = async (
  userId: string,
  userPsiState: UserPSIState
) => {
  await localforage.setItem(userId, userPsiState);
};

export const userPsiStateKeys = async () => {
  return localforage.keys();
};

export const getUserPsiState = async (userId: string) => {
  return (await localforage.getItem<UserPSIState>(userId)) || undefined;
};

// Save PSI round 1 output for a user
export const saveUserRound1Output = async (
  userEncPk: string,
  round1Output: string
) => {
  const userId = await hashPublicKeyToUUID(userEncPk);
  const userPsiState = await getUserPsiState(userId);

  // console.log("Saving round 1 output for user", userId);

  if (!userPsiState) {
    await saveUserPsiState(userId, {
      r1O: round1Output,
    });
    return;
  }

  const updatedUserPsiState = {
    ...userPsiState,
    r1O: round1Output,
  };
  await saveUserPsiState(userId, updatedUserPsiState);
};

export const saveUserRound2Message = async (
  userId: string,
  messageRound2: string
) => {
  // console.log("Saving round 2 message for user", userId);

  const userPsiState = await getUserPsiState(userId);

  if (!userPsiState) {
    await saveUserPsiState(userId, {
      mr2: messageRound2,
    });
    return;
  }

  const updatedUserPsiState = {
    ...userPsiState,
    mr2: messageRound2,
  };
  await saveUserPsiState(userId, updatedUserPsiState);
};

export const saveUserRound2Output = async (
  userId: string,
  round2Output: string
) => {
  // console.log("Saving round 2 output for user", userId);

  const userPsiState = await getUserPsiState(userId);

  if (!userPsiState) {
    await saveUserPsiState(userId, {
      r2O: round2Output,
    });
    return;
  }

  const updatedUserPsiState = {
    ...userPsiState,
    r1O: undefined,
    mr2: undefined,
    r2O: round2Output,
  };
  await saveUserPsiState(userId, updatedUserPsiState);
};

export const saveUserRound3Message = async (
  userId: string,
  messageRound3: string
) => {
  // console.log("Saving round 3 message for user", userId);

  const userPsiState = await getUserPsiState(userId);

  if (!userPsiState) {
    await saveUserPsiState(userId, {
      mr3: messageRound3,
    });
    return;
  }

  const updatedUserPsiState = {
    ...userPsiState,
    r1O: undefined,
    mr3: messageRound3,
  };
  await saveUserPsiState(userId, updatedUserPsiState);
};
