const { join } = require("node:path");

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Changes the cache location for Puppeteer to a local directory.
  // This ensures that the downloaded browser is included in the deployment slug on Render.
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
