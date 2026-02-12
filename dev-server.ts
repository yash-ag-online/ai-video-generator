// server.ts
import express from "express";
import handler from "./api/video-status";
import videoApiHandler from "./api/video-api";

const app = express();
app.use(express.json());

app.all("/api/video-api", (req, res) => {
  videoApiHandler(req as any, res as any);
});

app.all("/api/video-status", (req, res) => {
  handler(req as any, res as any);
});

app.listen(3000, () => {
  console.log("API server running at http://localhost:3000");
});
