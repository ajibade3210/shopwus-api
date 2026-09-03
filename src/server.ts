import { buildApp } from "./app";
import { Environment } from "./config/constants/environment";
import { env } from "./config/env";
import { registerAllWorkers } from "./jobs";
import { initMonitor } from "./lib/monitor";
import { initPdfGenerator } from "./lib/pdf";
import { startBoss } from "./lib/pgboss";
import { prisma } from "./lib/prisma";

async function start() {
  initMonitor();

  // Only pre-warm PDF generator when NOT running locally in development
  // This saves resources locally while ensuring performance on deployed servers
  const isLocalDev =
    env.NODE_ENV === Environment.DEVELOP &&
    (env.HOST === "127.0.0.1" || env.HOST === "localhost");

  if (!isLocalDev) {
    await initPdfGenerator();
  }

  const app = await buildApp();

  try {
    await prisma.$connect();
    app.log.info("🐘 Database connected successfully");

    // Initialize pg-boss background queue
    const boss = await startBoss();
    await registerAllWorkers(boss);

    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err, "Failed to start server");
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Server bootstrap entrypoint
start();
