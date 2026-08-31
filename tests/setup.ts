import "./env.setup";
import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

// Stored on globalThis so teardown.ts can stop the container
declare global {
  // eslint-disable-next-line no-var
  var __pgContainer__: StartedPostgreSqlContainer;
}

/**
 * Resolve the Docker socket on macOS Docker Desktop if DOCKER_HOST is not
 * already set. Jest's globalSetup runs in a clean subprocess that may not
 * inherit the shell environment where Docker Desktop sets the socket path.
 */
function resolveDockerHost() {
  if (process.env.DOCKER_HOST) return;

  const candidates = [
    `/Users/${os.userInfo().username}/.docker/run/docker.sock`,
    `${os.homedir()}/.docker/run/docker.sock`,
    "/var/run/docker.sock",
  ];

  for (const sock of candidates) {
    if (fs.existsSync(sock)) {
      process.env.DOCKER_HOST = `unix://${sock}`;
      console.info(`🔌  Using Docker socket: ${sock}`);
      return;
    }
  }

  // Fallback to default Docker socket if none of the candidates exist
  const defaultSock = "/var/run/docker.sock";
  if (fs.existsSync(defaultSock)) {
    process.env.DOCKER_HOST = `unix://${defaultSock}`;
    console.info(`🔌  Using fallback Docker socket: ${defaultSock}`);
  }
}

export default async function setup() {
  process.env.NODE_ENV = "test";

  resolveDockerHost();

  // If Docker is not available, skip container startup and rely on existing DATABASE_URL
  if (!process.env.DOCKER_HOST) {
    console.warn(
      "⚠️ Docker not detected – skipping test container startup. Ensure DATABASE_URL is set for tests.",
    );
    return;
  }

  // Attempt to start PostgreSQL container; if it fails (e.g., no Docker runtime), fall back to existing DATABASE_URL
  let container: StartedPostgreSqlContainer;
  try {
    container = await new PostgreSqlContainer("postgis/postgis:16-3.4")
      .withDatabase("accessa_test")
      .withUsername("postgres")
      .withPassword("postgres")
      .start();
  } catch (err) {
    console.warn(
      "⚠️ Failed to start test PostgreSQL container – proceeding with existing DATABASE_URL. Error:",
      err,
    );
    return;
  }

  const connectionString = container.getConnectionUri();

  // Expose to all Jest worker processes via process.env
  process.env.DATABASE_URL = connectionString;

  // Store reference so teardown can stop it
  global.__pgContainer__ = container;

  console.info(`Postgres container ready — ${connectionString}`);

  // Run migrations against the fresh container DB
  try {
    execSync("npx prisma migrate deploy", {
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: connectionString },
    });
  } catch {
    console.error("Prisma migrate failed — check migration files");
    process.exit(1);
  }
}
