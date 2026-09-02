import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env";

export const registerCors = fp(async (app: FastifyInstance) => {
  const explicitOrigins = env.CORS
    ? env.CORS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : [env.FRONTEND_URL];

  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow non-browser requests (Postman, curl, server-to-server)
      if (!origin) {
        return cb(null, true);
      }

      // Check explicit allowed origins or wildcard
      if (explicitOrigins.includes(origin) || explicitOrigins.includes("*")) {
        return cb(null, true);
      }

      // Allow Vercel preview/production deployments and Shopwus domains
      try {
        const parsed = new URL(origin);
        const hostname = parsed.hostname;
        if (
          hostname === "shopwus.vercel.app" ||
          hostname.endsWith(".vercel.app") ||
          hostname === "shopwus.com" ||
          hostname.endsWith(".shopwus.com")
        ) {
          return cb(null, true);
        }
      } catch {
        // Ignore invalid URL parse failures
      }

      cb(new Error(`Not allowed by CORS: ${origin}`), false);
    },
    methods: ["GET", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-latitude",
      "x-longitude",
    ],
    credentials: true,
  });
});
