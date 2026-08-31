import "./env.setup";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { prisma } from "../src/lib/prisma";

// biome-ignore lint/suspicious/noExplicitAny: dynamically resolved test helper
let Docker: any;
try {
  Docker = require("dockerode");
} catch {
  // fallback if dockerode is unavailable
}

const CONTAINER_ID_FILE = path.join(os.tmpdir(), ".test-pg-container-id");

export default async function teardown() {
  await prisma.$disconnect();
  console.info("Prisma disconnected");

  // Stop the Docker container via its ID (infra-level)
  if (fs.existsSync(CONTAINER_ID_FILE)) {
    const containerId = fs.readFileSync(CONTAINER_ID_FILE, "utf-8").trim();

    try {
      const docker = new Docker();
      const container = docker.getContainer(containerId);
      await container.stop();
      await container.remove();
      console.info(`Container ${containerId.slice(0, 12)} stopped and removed`);
    } catch (err) {
      console.warn("Could not stop container:", err);
    } finally {
      fs.unlinkSync(CONTAINER_ID_FILE); // always clean up the file
    }
  } else {
    console.warn("No container ID file found — container may still be running");
  }
}
