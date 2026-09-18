import { buildApp } from "./app";
import { env } from "./config/env";
import { registerAllWorkers } from "./jobs";
import { initMonitor } from "./lib/monitor";
import { startBoss } from "./lib/pgboss";
import { prisma } from "./lib/prisma";

async function start() {
  initMonitor();

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
