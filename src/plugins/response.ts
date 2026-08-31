import type { FastifyInstance, FastifyReply } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyReply {
    success<T>(data: T, message?: string, statusCode?: number): FastifyReply;
  }
}

export const registerResponsePlugin = fp(async (app: FastifyInstance) => {
  // Safe BigInt serialization without prototype pollution
  app.setReplySerializer((payload) => {
    return JSON.stringify(payload, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
  });

  app.decorateReply(
    "success",
    function (
      this: FastifyReply,
      data: unknown,
      message = "Operation successful",
      statusCode = 200,
    ) {
      return this.code(statusCode).send({
        status: true,
        code: statusCode,
        data,
        message,
      });
    },
  );
});
