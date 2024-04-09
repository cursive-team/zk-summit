import { track } from "@vercel/analytics";

export const logClientEvent = async (
  name: string,
  metadata: Record<string, string | number | boolean | null>
) => {
  track(name, metadata);
};
