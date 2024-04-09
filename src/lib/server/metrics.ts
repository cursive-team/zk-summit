import { track } from "@vercel/analytics/server";

export const logServerEvent = async (
  name: string,
  metadata: Record<string, string | number | boolean | null>
) => {
  if (process.env.NEXT_PUBLIC_ENABLE_METRICS !== "true") {
    return;
  }

  await track(name, metadata);
  return;
};
