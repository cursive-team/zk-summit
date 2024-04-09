// pages/api/proxy/[...path].ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { path } = req.query;

  // Ensure path is a string or array of strings
  const matomoPath = Array.isArray(path) ? path.join("/") : path;
  const matomoUrl = `https://cdn.matomo.cloud/psedev.matomo.cloud/${matomoPath}`;

  try {
    const matomoResponse = await fetch(matomoUrl);

    if (!matomoResponse.ok) {
      // If the response from Matomo is not OK, forward the status code and message
      res.status(matomoResponse.status).send(matomoResponse.statusText);
      return;
    }

    // Forward the content-type from the Matomo server
    const contentType = matomoResponse.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    // Read the response body as buffer
    const data = await matomoResponse.arrayBuffer();

    // Send the buffer as the response
    res.status(200).send(Buffer.from(data));
  } catch (error) {
    console.error("Error in proxying Matomo script:", error);
    res.status(500).send("Internal server error");
  }
}
