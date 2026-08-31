import type { FastifyInstance } from "fastify";
import fastifySocketIO from "fastify-socket.io";
import jwt from "jsonwebtoken";
import type { Server } from "socket.io";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import type { JwtPayload } from "../middlewares/auth";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

export let io: Server;

export async function registerSocketPlugin(app: FastifyInstance) {
  await app.register(fastifySocketIO, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io = app.io;

  // Middleware for socket authentication
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      const err = new Error("Authentication error: No token provided");
      Object.assign(err, {
        data: { code: "UNAUTHORIZED", reason: "NO_TOKEN" },
      });
      return next(err);
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET, {
        algorithms: ["HS256"],
      }) as JwtPayload;
      socket.data.user = decoded;
      next();
    } catch (_err) {
      const err = new Error("Authentication error: Invalid token");
      Object.assign(err, {
        data: { code: "UNAUTHORIZED", reason: "INVALID_TOKEN" },
      });
      next(err);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as JwtPayload;

    // Auto-join private user room
    socket.join(`user_${user.userId}`);

    // Auto-join role room
    if (user.role) {
      socket.join(`role_${user.role}`);
    }

    // Auto-join primary business/studio room if available
    if (user.businessId) {
      socket.join(`studio_${user.businessId}`);
    }

    logger.info(
      { userId: user.userId, socketId: socket.id },
      "🔌 User connected to websocket",
    );

    socket.on("join_studio", async (businessId: string) => {
      try {
        if (!businessId) return;

        const businessUser = await prisma.businessUser.findFirst({
          where: {
            userId: user.userId,
            businessId,
            user: { isActive: true },
          },
        });

        if (businessUser) {
          socket.join(`studio_${businessId}`);
          logger.info(
            { userId: user.userId, businessId },
            "🤝 Authorized user joined studio room",
          );
        } else {
          logger.warn(
            { userId: user.userId, businessId },
            "⚠️ Unauthorized attempt to join studio room",
          );
        }
      } catch (err) {
        logger.error(
          { userId: user.userId, businessId, err },
          "❌ Error joining studio room",
        );
      }
    });

    socket.on("disconnect", () => {
      logger.info({ userId: user.userId }, "❌ Websocket disconnected");
    });
  });

  app.log.info("📢 Websocket plugin registered with auto-room management");
}
