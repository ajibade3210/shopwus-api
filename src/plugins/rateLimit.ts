import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { env } from "../config/env";

export async function registerRateLimit(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    max:
      env.NODE_ENV === "development"
        ? Math.max(env.RATE_LIMIT_MAX, 2000)
        : env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW,
    errorResponseBuilder: (_req, context) => {
      return {
        success: false,
        statusCode: 429,
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded, retry in ${context.after}`,
      };
    },
  });
}
