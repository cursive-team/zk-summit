import { track } from "@vercel/analytics/server";

export const logServerEvent = async (
  name: string,
  metadata: Record<string, string | number | boolean | null>
) => {
  await track(name, metadata);
  return;
};
