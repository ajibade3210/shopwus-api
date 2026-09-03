import { randomUUID } from "node:crypto";
import multipart from "@fastify/multipart";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { Environment } from "./config/constants/environment";
import { env } from "./config/env";
import { stopBoss } from "./lib/pgboss";
import { registerCookiePlugin } from "./plugins/cookie";
import { registerCors } from "./plugins/cors";
import { registerErrorHandler } from "./plugins/errorHandler";
import { registerRateLimit } from "./plugins/rateLimit";
import { registerResponsePlugin } from "./plugins/response";
import { registerSocketPlugin } from "./plugins/socket";
import { registerRoutes } from "./routes";
import { getDateTime } from "./utils";
import { requestContext } from "./utils/requestContext";

export async function buildApp() {
  const app = Fastify({
    trustProxy: true,
    logger:
      env.NODE_ENV === "test"
        ? false
        : env.NODE_ENV === Environment.PRODUCTION
          ? { level: "info" }
          : { level: "info", transport: { target: "pino-pretty" } },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(registerCookiePlugin);
  await app.register(registerCors);
  await app.register(registerResponsePlugin);
  await app.register(registerSocketPlugin);

  await app.register(sensible);
  await app.register(multipart, {
    limits: {
      fileSize: env.MAX_VIDEO_SIZE,
    },
  });

  // Preserve raw body buffer for secure cryptographic webhook signature verification
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body: Buffer, done) => {
      (req as FastifyRequest & { rawBody?: string }).rawBody =
        body.toString("utf8");
      try {
        const json = JSON.parse(body.toString("utf8"));
        done(null, json);
      } catch (err: unknown) {
        done(err as Error, undefined);
      }
    },
  );

  await registerRateLimit(app);
  registerErrorHandler(app);

  app.addHook("onRequest", (req, _reply, done) => {
    const raw = req.headers["x-request-id"];
    req.headers["x-request-id"] = typeof raw === "string" ? raw : randomUUID();

    const context = {
      userId: undefined as string | undefined,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    };

    requestContext.run(context, done);
  });

  app.get("/health", async () => ({
    status: "ok",
    timestamp: getDateTime().toJSDate().toISOString(),
  }));

  await registerRoutes(app);

  app.addHook("onClose", async () => {
    await stopBoss();
  });

  return app;
}
