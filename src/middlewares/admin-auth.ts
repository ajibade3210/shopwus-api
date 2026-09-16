import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

export async function requireAdminSecret(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const secretHeader = request.headers["x-admin-secret"];
  const expectedSecret = env.ADMIN_PRIVATE_SECRET;

  if (!expectedSecret) {
    throw new UnauthorizedError("Admin private secret is not configured on the server.");
  }

  if (typeof secretHeader !== "string" || secretHeader.trim() !== expectedSecret.trim()) {
    throw new UnauthorizedError("Unauthorized: Invalid or missing x-admin-secret header.");
  }
}
