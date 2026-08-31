import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env";

export const registerCors = fp(async (app: FastifyInstance) => {
  const origins = env.CORS
  
  ? env.CORS.split(",").map(o => o.trim())
  : [env.FRONTEND_URL];
  
  await app.register(cors, {
    origin: origins,
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
