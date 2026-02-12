import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { prompt, duration_sec, orientation } = req.body;

  if (!prompt || !duration_sec || !orientation) {
    return res.status(400).json({
      error: "all fields are required - {prompt, duration_sec, orientation}",
    });
  }

  // console.log(req.body);

  const response = await fetch(
    `https://api.heygen.com/v1/video_agent/generate`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-api-key": String(process.env.HyGen_API_KEY),
      },
      body: JSON.stringify({
        prompt: prompt,
        config: {
          duration_sec: duration_sec,
          orientation: orientation,
        },
      }),
    },
  );
  const data = await response.json();
  res.status(200).json(data);
}
