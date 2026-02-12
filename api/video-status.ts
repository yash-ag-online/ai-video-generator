// api/video-status.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { video_id } = req.query;

  if (!video_id) {
    return res.status(400).json({ error: "video_id is required" });
  }

  try {
    const response = await fetch(
      `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
      {
        headers: {
          "x-api-key": String(process.env.HyGen_API_KEY),
        },
      },
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Failed to fetch video status",
        details: result,
      });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    return res.status(500).json({
      error: "Something went wrong",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
