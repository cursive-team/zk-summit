import {
  generateSignatureKeyPair as getBBJJKeyPair,
  sign as signBBJJ,
  verify as verifyBBJJ,
} from "babyjubjub-ecdsa";

export const generateSignatureKeyPair = (): {
  signingKey: string;
  verifyingKey: string;
} => {
  return getBBJJKeyPair();
};

export const sign = (signingKey: string, data: string): string => {
  return signBBJJ(signingKey, data);
};

export const verify = (
  verifyingKey: string,
  data: string,
  signature: string
): boolean => {
  return verifyBBJJ(verifyingKey, data, signature);
};
