import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { video_id } = req.query;

  if (!video_id) return res.status(400).json({ error: "video_id is required" });

  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // poll HeyGen every 5 seconds
  const interval = setInterval(async () => {
    try {
      const response = await fetch(
        `https://api.heygen.com/v1/video_status.get?video_id=${video_id}`,
        {
          headers: {
            "x-api-key": String(process.env.HyGen_API_KEY),
          },
        },
      );

      const data = (await response.json()).data;
      // console.log(data);

      // when video is ready, send URL and close
      if (data.status === "completed") {
        res.write(
          `data: ${
            JSON.stringify({ status: "completed", video_url: data.video_url })
          }\n\n`,
        );
        clearInterval(interval);
        res.end();
        return;
      }

      // if failed, send error and close
      if (data.status === "failed") {
        res.write(
          `data: ${
            JSON.stringify({
              status: "failed",
              error: "video generation failed",
            })
          }\n\n`,
        );
        clearInterval(interval);
        res.end();
        return;
      }

      res.write(
        `data: ${JSON.stringify({ status: "pending" })}\n\n`,
      );
    } catch (err) {
      res.write(
        `data: ${
          JSON.stringify({ status: "error", error: "something went wrong" })
        }\n\n`,
      );
      clearInterval(interval);
      res.end();
    }
  }, 5000);

  // cleanup if client disconnects
  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
}
