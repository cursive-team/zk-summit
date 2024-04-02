import {
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "crypto";

const ENCRYPTION_KEY_LENGTH = 32; // AES-256 keys are 32 bytes
const IV_LENGTH = 12; // 12 byte IV for GCM mode
const SALT = "zk-is-cool"; // We want deterministic encryption based on email and password
const ITERATIONS = 1000; // Number of iterations for PBKDF2
const DIGEST = "sha256"; // Digest method for PBKDF2

/**
 * Derives an encryption key from an email and password.
 * @param email The user's email.
 * @param password The user's password.
 * @returns A buffer containing the derived key.
 */
const deriveBackupEncryptionKey = (email: string, password: string): Buffer => {
  return pbkdf2Sync(
    password,
    `${email}${SALT}`,
    ITERATIONS,
    ENCRYPTION_KEY_LENGTH,
    DIGEST
  );
};

/**
 * Encrypts a string using a key derived from an email and password.
 * @param text The text to encrypt.
 * @param email The user's email.
 * @param password The user's password.
 * @returns An object containing the encrypted text as a hex string and the auth tag.
 */
export const encryptBackupString = (
  backup: string,
  email: string,
  password: string
): { encryptedData: string; authenticationTag: string; iv: string } => {
  const key = deriveBackupEncryptionKey(email, password);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(backup, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authenticationTag = cipher.getAuthTag().toString("hex");
  return {
    encryptedData: encrypted,
    authenticationTag,
    iv: iv.toString("hex"),
  };
};

/**
 * Decrypts a string using a key derived from an email and password.
 * @param encryptedData The encrypted text as a hex string.
 * @param authenticationTag The authentication tag as a hex string.
 * @param email The user's email.
 * @param password The user's password.
 * @returns The decrypted text.
 */
export const decryptBackupString = (
  encryptedData: string,
  authenticationTag: string,
  iv: string,
  email: string,
  password: string
): string => {
  const key = deriveBackupEncryptionKey(email, password);
  const ivBuffer = Buffer.from(iv, "hex");
  const decipher = createDecipheriv("aes-256-gcm", key, ivBuffer);
  decipher.setAuthTag(Buffer.from(authenticationTag, "hex"));
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
