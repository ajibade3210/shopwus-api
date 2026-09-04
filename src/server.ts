import sharp from "sharp";
import { buildApp } from "./app";
import { env } from "./config/env";
import { registerAllWorkers } from "./jobs";
import { initMonitor } from "./lib/monitor";
import { startBoss } from "./lib/pgboss";
import { prisma } from "./lib/prisma";

// Restrict Sharp/libvips memory usage on constrained containers (e.g. Render 512MB RAM)
sharp.cache(false);
sharp.concurrency(1);

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

start();
