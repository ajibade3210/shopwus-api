import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { Environment } from "../config/constants/environment";
import { env } from "../config/env";
import { logger } from "./logger";
import { auditExtension } from "./prisma-audit-extension";
import { currencyExtension } from "./prisma-currency-extension";
import { tenantExtension } from "./prisma-tenant-extension";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  pool: Pool;
};

function getPool(): Pool {
  if (globalForPrisma.pool) {
    return globalForPrisma.pool;
  }

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on("error", (err) => {
    logger.error({ err }, "Unexpected error on idle database client");
  });

  if (env.NODE_ENV !== Environment.PRODUCTION) {
    globalForPrisma.pool = pool;
  }

  return pool;
}

function createPrismaClient(): PrismaClient {
  const pool = getPool();
  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === Environment.DEVELOP
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const basePrisma = globalForPrisma.prisma ?? createPrismaClient();

export const prisma = basePrisma
  .$extends(auditExtension)
  .$extends(currencyExtension)
  .$extends(tenantExtension);

export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransactionClient = Parameters<
  Parameters<(typeof prisma)["$transaction"]>[0]
>[0];

if (env.NODE_ENV !== Environment.PRODUCTION) {
  // Cache prisma for the next hot reload (dev only)
  globalForPrisma.prisma = basePrisma;
}
