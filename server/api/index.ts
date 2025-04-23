import { VercelRequest, VercelResponse } from "@vercel/node";
import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes.js"; // adjust path if needed
import type { Request, Response, NextFunction } from "express";

// Cache the Express app across cold starts
let cachedApp: express.Express | null = null;

async function getApp() {
  if (cachedApp) return cachedApp;
  const app = express();

  // Unified CORS options for both actual and preflight requests
  const corsOptions = {
    origin: (requestOrigin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) => {
      // Echo back the request origin
      callback(null, requestOrigin);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  };

  // Apply CORS for actual requests
  app.use(cors(corsOptions));
  // Apply CORS for preflight OPTIONS requests
  app.options("*", cors(corsOptions));

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const originalJson = res.json.bind(res);
    let body: any;
    res.json = (payload) => {
      body = payload;
      return originalJson(payload);
    };
    res.on("finish", () => {
      const ms = Date.now() - start;
      let line = `${req.method} ${req.url} ${res.statusCode} in ${ms}ms`;
      if (body) line += ` :: ${JSON.stringify(body)}`;
      console.log(line.length > 80 ? line.slice(0, 79) + "…" : line);
    });
    next();
  });

  // Mount all routes from registerRoutes (no listen here)
  await registerRoutes(app);

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    return res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  cachedApp = app;
  return app;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const app = await getApp();
  return app(req as any, res as any);
}
