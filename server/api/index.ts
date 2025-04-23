// api/index.ts

import { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import { registerRoutes } from "./routes.js"; // your routes must now be defined without "/api" prefix
import type { Request, Response, NextFunction } from "express";

// Cache the Express app across cold starts
let cachedApp: express.Express | null = null;

async function getApp() {
  if (cachedApp) return cachedApp;

  const app = express();

  // —————————————————————————————————————————————————————
  // 1) MANUAL CORS MIDDLEWARE (actual + preflight)
  // —————————————————————————————————————————————————————
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin as string | undefined;
    // Echo back the incoming Origin header, or fallback to "*"
    res.header("Access-Control-Allow-Origin", origin || "*");                              // :contentReference[oaicite:2]{index=2}
    res.header("Access-Control-Allow-Credentials", "true");                                 // :contentReference[oaicite:3]{index=3}
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");             // :contentReference[oaicite:4]{index=4}
    res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");              // :contentReference[oaicite:5]{index=5}

    // For preflight (OPTIONS) requests, respond immediately
    if (req.method === "OPTIONS") {
      return res.status(204).end();                                                         // :contentReference[oaicite:6]{index=6}
    }

    next();
  });

  // —————————————————————————————————————————————————————
  // 2) BODY PARSING
  // —————————————————————————————————————————————————————
  app.use(express.json());                                                                 // :contentReference[oaicite:7]{index=7}
  app.use(express.urlencoded({ extended: false }));

  // —————————————————————————————————————————————————————
  // 3) LOGGING MIDDLEWARE (unchanged)
  // —————————————————————————————————————————————————————
  app.use((req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    let body: any;
    res.json = (data) => {
      body = data;
      return originalJson(data);
    };
    res.on("finish", () => {
      const ms = Date.now() - start;
      let line = `${req.method} ${req.url} ${res.statusCode} in ${ms}ms`;
      if (body) line += ` :: ${JSON.stringify(body)}`;
      console.log(line.length > 80 ? line.slice(0,79) + "…" : line);
    });
    next();
  });

  // —————————————————————————————————————————————————————
  // 4) MOUNT YOUR ROUTES (no express.listen here)
  // —————————————————————————————————————————————————————
  await registerRoutes(app);                                                               // :contentReference[oaicite:8]{index=8}

  // —————————————————————————————————————————————————————
  // 5) GLOBAL ERROR HANDLER
  // —————————————————————————————————————————————————————
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  cachedApp = app;
  return app;
}

// Export the Vercel handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const app = await getApp();
  return app(req as any, res as any);
}
