import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pug from "pug";
import puppeteer, { type Browser } from "puppeteer";
import { Environment } from "../config/constants/environment";
import { env } from "../config/env";
import type { PdfTemplateDataMap } from "../types";
import { getDateTime } from "../utils";
import { logger } from "./logger";

const PDF_TEMPLATES_DIR = path.join(process.cwd(), "assets/templates/pdf");
const DEFAULT_NAVIGATION_TIMEOUT = 30_000;
const MAX_REQUESTS_BEFORE_RESTART = 100;

export async function generatePdf<K extends keyof PdfTemplateDataMap>(
  templateName: K,
  data: PdfTemplateDataMap[K],
): Promise<Buffer> {
  const templatePath = path.join(PDF_TEMPLATES_DIR, `${templateName}.pug`);
  const html = pug.renderFile(templatePath, {
    currentYear: getDateTime().year,
    getDateTime,
    ...(data as pug.LocalsObject),
  });
  return htmlToPdfBuffer(html);
}

/**
 * Pre-warms the Puppeteer instance to avoid slow first-loads.
 */
export async function initPdfGenerator(): Promise<void> {
  if (
    env.NODE_ENV === Environment.PRODUCTION &&
    !env.PUPPETEER_WS_ENDPOINT &&
    !env.PUPPETEER_WS_ENDPOINT_BACKUP
  ) {
    throw new Error(
      "At least one of PUPPETEER_WS_ENDPOINT or PUPPETEER_WS_ENDPOINT_BACKUP is required in production environments.",
    );
  }

  try {
    logger.info("Initializing PDF generator...");
    await getBrowser();
  } catch (error) {
    logger.error(error, "Failed to initialize PDF generator");
  }
}

/**
 * Writes a PDF buffer to a temp file, calls the uploader callback,
 * then cleans up the temp file automatically using async non-blocking I/O.
 */
export async function withTempPdf<T>(
  buffer: Buffer,
  fileName: string,
  uploader: (tmpPath: string) => Promise<T>,
): Promise<T> {
  const tmpPath = path.join(os.tmpdir(), `${fileName}_${Date.now()}.pdf`);
  await fs.promises.writeFile(tmpPath, buffer);
  try {
    return await uploader(tmpPath);
  } finally {
    await fs.promises.unlink(tmpPath).catch(() => {});
  }
}

// ── Internal ─────────────────────────────────────────────────────────────────

let _browser: Browser | null = null;
let _requestCount = 0;

// Simple promise-based queue to ensure only ONE PDF is generated at a time.
// This is critical for low-RAM environments.
let _concurrencyQueue: Promise<void> = Promise.resolve();

/**
 * ── DEVOPS / LOCAL FALLBACK GUIDE ─────────────────────────────────────────────
 *
 * WHY WE USE REMOTE BROWSER CONNECTIONS:
 * We connect to remote Chromium instances (like Browserless.io) via WebSockets
 * in production instead of running Chrome locally on the server.
 * This is done to:
 * - Reduce RAM/CPU usage on the server (Chromium is heavy and can starve Fastify).
 * - Keep the deployment slug size light (no need to bundle 300MB+ Chrome binary).
 * - Avoid installing heavy native Linux graphical dependencies on the VPS.
 * - Enforce clean container boundaries by separating the browser engine from the API.
 * ─────────────────────────────────────────────────────────────────────────────
 */
async function getBrowser(): Promise<Browser> {
  if (_requestCount >= MAX_REQUESTS_BEFORE_RESTART) {
    logger.info("Restarting Puppeteer browser...");
    await closeBrowser();
  }

  if (_browser?.connected) {
    return _browser;
  }

  _browser = null;

  // Try Remote Browser connections first if configured
  const remoteEndpoints = [
    env.PUPPETEER_WS_ENDPOINT,
    env.PUPPETEER_WS_ENDPOINT_BACKUP,
  ].filter(Boolean) as string[];

  if (remoteEndpoints.length > 0) {
    for (let i = 0; i < remoteEndpoints.length; i++) {
      const endpoint = remoteEndpoints[i];
      const isBackup = i > 0;
      const label = isBackup ? "backup" : "primary";

      try {
        logger.info(
          { wsEndpoint: endpoint, endpointType: label },
          `Connecting to ${label} remote Puppeteer browser...`,
        );
        _browser = await puppeteer.connect({
          browserWSEndpoint: endpoint,
        });

        _browser.once("disconnected", () => {
          logger.warn(`Remote Puppeteer browser (${label}) disconnected.`);
          _browser = null;
        });

        _requestCount = 0;
        return _browser;
      } catch (err) {
        logger.error(
          err,
          `Failed to connect to ${label} remote Puppeteer browser.`,
        );
        if (i < remoteEndpoints.length - 1) {
          logger.info("Attempting connection to backup endpoint...");
          continue;
        }
        throw new Error(
          `All remote Puppeteer WebSocket endpoints failed to connect. Last error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  throw new Error(
    "No remote Puppeteer WebSocket endpoint is configured. Please set PUPPETEER_WS_ENDPOINT in your environment.",
  );
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    try {
      await _browser.close();
    } catch (err) {
      logger.error(err, "Error closing browser");
    } finally {
      _browser = null;
      _requestCount = 0;
    }
  }
}

/**
 * Orchestrates the FIFO concurrency queue for PDF generation using clean async locking.
 */
async function htmlToPdfBuffer(html: string): Promise<Buffer> {
  const currentQueue = _concurrencyQueue;
  let releaseLock: () => void = () => {};

  _concurrencyQueue = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  try {
    await currentQueue;
    return await generatePdfInternal(html);
  } finally {
    releaseLock();
  }
}

/**
 * The actual Puppeteer logic.
 */
async function generatePdfInternal(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  _requestCount++;

  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    // We don't need JS for a simple HTML/CSS receipt. Disabling it saves RAM.
    await page.setJavaScriptEnabled(false);
    page.setDefaultNavigationTimeout(DEFAULT_NAVIGATION_TIMEOUT);

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: DEFAULT_NAVIGATION_TIMEOUT,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "40px", bottom: "40px", left: "0", right: "0" },
    });

    const hasRemote =
      Boolean(env.PUPPETEER_WS_ENDPOINT) ||
      Boolean(env.PUPPETEER_WS_ENDPOINT_BACKUP);

    if (hasRemote) {
      logger.info(
        "PDF generated successfully via remote Browserless instance.",
      );
    } else {
      logger.info("PDF generated successfully via local browser instance.");
    }

    return Buffer.from(pdf);
  } finally {
    // Thoroughly close page and context to free memory
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

// ── Global Process Cleanup ───────────────────────────────────────────────────

function handleExit() {
  if (_browser) {
    logger.info("Closing Puppeteer browser before exit...");
    closeBrowser().finally(() => process.exit());
  } else {
    process.exit();
  }
}

if (process.listenerCount("SIGINT") === 0) {
  process.on("SIGINT", handleExit);
}
if (process.listenerCount("SIGTERM") === 0) {
  process.on("SIGTERM", handleExit);
}
