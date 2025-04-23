// File: api/[...all].ts

import { VercelRequest, VercelResponse } from "@vercel/node";
import indexHandler from "./index.js";  // your existing handler, which calls registerRoutes()

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1) strip the /api prefix so Express sees "/chat/generate" not "/api/chat/generate"
  if (req.url) {
    req.url = req.url.replace(/^\/api/, "") || "/";
  }

  // 2) delegate to your original Express handler in index.js
  return indexHandler(req, res);
}
