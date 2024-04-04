import init, { gen_keys_js, round2_js, round3_js } from "@/lib/mp_psi";
import { Keys, getLocationSignatures, getUsers } from "./localStorage";
import { type PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";

export const psiBlobUploadClient = async (name: string, data: string) => {
  const newBlob: PutBlobResult = await upload(name, data, {
    access: "public",
    handleUploadUrl: "/api/psiBlobUploadServer",
  });

  return newBlob.url;
};

export const generatePSIKeys = async () => {
  await init();
  const gen_keys_output = gen_keys_js();

  return {
    psiPrivateKeys: gen_keys_output.psi_keys,
    psiPublicKeys: gen_keys_output.message_round1,
  };
};

export const generateSelfBitVector = (): Uint32Array => {
  let bitVector = new Uint32Array(1000).fill(0);
  let users = getUsers();
  let locations = getLocationSignatures();

  // 0-500 reserved for users
  for (let id in users) {
    let user = users[id];
    // don't include yourself in PSI
    if (user.pkId && user.pkId !== "0") {
      let index = parseInt(user.pkId);
      if (index < 500) {
        bitVector[index] = 1;
      }
    }
  }

  // 500-1000 reserved for locations
  for (let id in locations) {
    let location = locations[id];
    if (location.id) {
      let index = parseInt(location.id);
      if (500 + index < bitVector.length) {
        bitVector[500 + index] = 1;
      }
    }
  }

  return bitVector;
};
