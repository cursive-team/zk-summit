import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper function to hash any public key to a UUID.
 * Used to index information by public key in localStorage.
 */
export const hashPublicKeyToUUID = async (
  encryptionPublicKey: string
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(encryptionPublicKey);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const uuid = `${hashHex.substring(0, 8)}-${hashHex.substring(
    8,
    12
  )}-${hashHex.substring(12, 16)}-${hashHex.substring(
    16,
    20
  )}-${hashHex.substring(20, 32)}`;

  return uuid;
};

export const generateSalt = (): string => {
  return window.crypto.getRandomValues(new Uint8Array(16)).toString();
};

export const hashPassword = async (
  password: string,
  salt: string
): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

export const handleUsername = (username?: string): string => {
  if (!username) return "";
  if (username.startsWith("@")) {
    return username;
  }
  return `@${username}`;
};

/**
 * Makes a fetch request and retries it a specified number of times until success
 * 
 * @param url - the url to make http request to
 * @param options - request options
 * @param retries - number of times to retry
 * @param backoff - delay period before retrying
 */
export const fetchWithRetry = async (
  url: string,
  options?: RequestInit,
  retries: number = 3,
  backoff: number = 200
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      throw new Error("Fetch failed");
    }
    return response;
  } catch (e) {
    console.log(`Failed fetch of "${url}" with ${retries} retries left`);
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    } else {
      throw e;
    }
  }
}
