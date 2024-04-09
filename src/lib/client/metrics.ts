import { track } from "@vercel/analytics";

export const logClientEvent = async (
  name: string,
  metadata: Record<string, string | number | boolean | null>
) => {
  if (process.env.NEXT_PUBLIC_ENABLE_METRICS !== "true") {
    return;
  }

  track(name, metadata);
};
