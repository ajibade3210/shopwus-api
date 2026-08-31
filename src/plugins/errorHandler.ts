import { Prisma } from "@prisma/client";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";

import * as monitor from "../lib/monitor";

export interface ErrorDto {
  code?: string;
  message: string;
  statusCode: number;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler(
    (
      error: FastifyError | AppError | ZodError | Error,
      req: FastifyRequest,
      reply: FastifyReply,
    ) => {
      // Safely determine status code without 'any'
      let statusCode = 500;
      if ("statusCode" in error && typeof error.statusCode === "number") {
        statusCode = error.statusCode;
      } else if ("status" in error && typeof error.status === "number") {
        statusCode = error.status;
      }

      const isPrematureClose =
        error instanceof Error &&
        (error.message === "Premature close" ||
          ("code" in error && error.code === "ERR_STREAM_PREMATURE_CLOSE"));

      if (isPrematureClose) {
        statusCode = 400;
      }

      const requestId = (req.headers["x-request-id"] as string) || "unknown";

      // Report 5xx errors to Sentry
      if (statusCode >= 500 && monitor.isInitialized()) {
        // Scrub sensitive data (password, passcode, token) before sending to Sentry
        const scrubbedBody =
          req.body && typeof req.body === "object"
            ? ({ ...req.body } as Record<string, unknown>)
            : req.body;

        if (scrubbedBody && typeof scrubbedBody === "object") {
          const bodyObj = scrubbedBody as Record<string, unknown>;
          [
            "password",
            "passcode",
            "currentPassword",
            "newPassword",
            "currentPasscode",
            "newPasscode",
            "token",
            "resetCode",
          ].forEach((key) => {
            if (key in bodyObj) bodyObj[key] = "[REDACTED]";
          });
        }

        monitor.Sentry.captureException(error, {
          extra: {
            url: req.url,
            method: req.method,
            body: scrubbedBody,
            query: req.query,
            params: req.params,
            requestId,
          },
        });
      }

      // Handle Zod Validation Errors
      if (error instanceof ZodError) {
        return reply.code(400).send({
          status: false,
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          requestId,
          errors: error.issues.map((issue) => ({
            path: issue.path,
            message: issue.message,
          })),
        });
      }

      // Handle Premature Close Errors: discards the unfinished uploads in memory so the connection can close cleanly without hanging or crashing the server. (e.g. client abort during stream upload)
      if (isPrematureClose) {
        return reply.code(400).send({
          status: false,
          code: "BAD_REQUEST",
          message: "Connection closed prematurely by client",
          requestId,
        });
      }

      // Handle custom AppError (Business Logic Errors)
      if (error instanceof AppError) {
        return reply.code(error.statusCode).send({
          status: false,
          message: error.message,
          requestId,
          code: error.code || error.statusCode.toString(),
          data: error.data,
        });
      }

      // Handle Prisma Errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return reply.code(409).send({
            status: false,
            message: "A record with this value already exists",
            code: "CONFLICT",
            requestId,
          });
        }
        if (error.code === "P2025") {
          return reply.code(404).send({
            status: false,
            message: "Record not found",
            code: "NOT_FOUND",
            requestId,
          });
        }
        if (error.code === "P2003") {
          return reply.code(409).send({
            status: false,
            message:
              "Action failed because this record is linked to other existing records",
            code: "CONFLICT",
            requestId,
          });
        }
      }

      // Handle other Fastify/Generic errors with a statusCode
      if ("statusCode" in error && typeof error.statusCode === "number") {
        const fastifyError = error as FastifyError;
        const hasValidation =
          Array.isArray(fastifyError.validation) &&
          fastifyError.validation.length > 0;

        return reply.code(error.statusCode).send({
          status: false,
          validation: hasValidation ? error.message : undefined,
          message:
            hasValidation && fastifyError.validation?.[0]?.message
              ? fastifyError.validation[0].message
              : error.message,

          requestId,
          code:
            "code" in error && typeof error.code === "string"
              ? error.code
              : error.statusCode.toString(),
        });
      }

      // Default Fallback: Internal Server Error
      app.log.error({
        error: error.message || error || "Something went wrong",
        requestId,
      });
      return reply.code(500).send({
        status: false,
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        requestId,
      });
    },
  );
}
