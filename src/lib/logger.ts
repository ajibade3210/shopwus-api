import pino from "pino";
import { Environment } from "../config/constants/environment";
import { env } from "../config/env";

export const logger = pino({
  level: env.NODE_ENV === Environment.PRODUCTION ? "info" : "debug",
  transport:
    env.NODE_ENV !== Environment.PRODUCTION && env.NODE_ENV !== "test"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
          },
        }
      : undefined,
});
