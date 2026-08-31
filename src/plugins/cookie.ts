import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env";

export const registerCookiePlugin = fp(async (app: FastifyInstance) => {
  await app.register(cookie, {
    secret: env.JWT_SECRET,
    parseOptions: {},
  });
});
