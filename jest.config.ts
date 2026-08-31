import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  watchman: false,
  testMatch: ["**/tests/**/*.test.ts"],
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
  globalSetup: "./tests/setup.ts",
  globalTeardown: "./tests/teardown.ts",
  setupFiles: ["./tests/env.setup.ts"],
  testTimeout: 60_000,
  transform: {
    "^.+\\.(ts|js)$": [
      "ts-jest",
      {
        tsconfig: "tests/tsconfig.json",
      },
    ],
  },
  transformIgnorePatterns: [
    "node_modules/(?!pg-boss|serialize-error|non-error|type-fest)",
  ],
};

export default config;
