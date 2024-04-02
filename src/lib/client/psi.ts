import init, { gen_keys_js, round2_js, round3_js } from "@/lib/mp_psi";
import { Keys, getLocationSignatures, getUsers } from "./localStorage";
import { MessageRequest, PsiMessageRequest } from "@/pages/api/messages";
import {
  getUserPsiState,
  saveUserPsiState,
  saveUserRound2Output,
  userPsiStateKeys,
} from "./indexedDB/psi";
import { encryptOverlapComputedMessage } from "./jubSignal";

export const generatePSIKeys = async () => {
  await init();
  const gen_keys_output = gen_keys_js();

  return {
    psiPrivateKeys: gen_keys_output.psi_keys,
    psiPublicKeys: gen_keys_output.message_round1,
  };
};

export const generateSelfBitVector = (): Uint32Array => {
  let bitVector = new Uint32Array(25000).fill(0);
  let users = getUsers();
  let locations = getLocationSignatures();

  // 0-19999 reserved for users
  for (let id in users) {
    let user = users[id];
    // don't include yourself in PSI
    if (user.pkId && user.pkId !== "0") {
      let index = parseInt(user.pkId);
      if (index < bitVector.length) {
        bitVector[index] = 1;
      }
    }
  }

  // 20001-25000 reserved for locations
  for (let id in locations) {
    let location = locations[id];
    if (location.id) {
      let index = parseInt(location.id);
      if (index < bitVector.length) {
        bitVector[20000 + index] = 1;
      }
    }
  }

  return bitVector;
};

// Only put out 3 mr3 messages at a time (~0.6mb) to avoid
// running into 4.5 Vercel serverless function memory limit
export const handleRound2MessageRequests = async (
  keys: Keys,
  selfPkId: string
): Promise<PsiMessageRequest[]> => {
  let psiMessageRequests: PsiMessageRequest[] = [];
  const users = getUsers();
  const userPsiStateValidKeys = await userPsiStateKeys();

  for (const userId in users) {
    if (psiMessageRequests.length === 3) {
      break;
    }

    // don't waste time reading IndexedDB if keys are not present
    if (!userPsiStateValidKeys.includes(userId)) {
      continue;
    }

    const user = users[userId];
    const userPsiState = await getUserPsiState(userId);
    if (!userPsiState) {
      continue;
    }

    if (userPsiState.r1O && userPsiState.mr2 && !userPsiState.r2O) {
      await init();
      const round2Output = round2_js(
        {
          psi_keys: JSON.parse(keys.psiPrivateKeys),
          message_round1: JSON.parse(keys.psiPublicKeys),
        },
        JSON.parse(userPsiState.r1O),
        JSON.parse(userPsiState.mr2),
        parseInt(selfPkId) > parseInt(user.pkId)
      );
      await saveUserRound2Output(userId, JSON.stringify(round2Output));
      psiMessageRequests.push({
        recipientPublicKey: user.encPk,
        psiRoundMessage: JSON.stringify({
          mr3: round2Output.message_round3,
        }),
      });
    }
  }

  return psiMessageRequests;
};

export const handleOverlapMessageRequests = async (
  keys: Keys,
  selfEncPk: string
): Promise<MessageRequest[]> => {
  const messageRequests: MessageRequest[] = [];
  const users = getUsers();
  const userPsiStateValidKeys = await userPsiStateKeys();

  for (const userId in users) {
    if (!userPsiStateValidKeys.includes(userId)) {
      continue;
    }

    const userPsiState = await getUserPsiState(userId);
    if (!userPsiState) {
      continue;
    }

    if (userPsiState.r2O && userPsiState.mr3 && !userPsiState.oI) {
      await init();
      const psiOutput = round3_js(
        JSON.parse(userPsiState.r2O),
        JSON.parse(userPsiState.mr3)
      );

      let overlapIndices = [];
      for (let i = 0; i < psiOutput.length; i++) {
        if (psiOutput[i] === 1) {
          overlapIndices.push(i);
        }
      }
      await saveUserPsiState(userId, { oI: JSON.stringify(overlapIndices) });
      const encryptedMessage = await encryptOverlapComputedMessage(
        overlapIndices,
        userId,
        keys.encryptionPrivateKey,
        selfEncPk
      );
      messageRequests.push({
        recipientPublicKey: selfEncPk,
        encryptedMessage,
      });
    }
  }

  return messageRequests;
};
