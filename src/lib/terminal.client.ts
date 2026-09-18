import axios, { type AxiosInstance } from "axios";
import { TERMINAL_CONFIG } from "../config/constants/delivery.constants";
import { env } from "../config/env";

export function getTerminalClient(): AxiosInstance {
  const baseURL =
    env.TERMINAL_BASE_URL ||
    (env.TERMINAL_ENVIRONMENT === "live"
      ? TERMINAL_CONFIG.LIVE_BASE_URL
      : TERMINAL_CONFIG.SANDBOX_BASE_URL);

  const secretKey = env.TERMINAL_SECRET_KEY || "";

  return axios.create({
    baseURL,
    timeout: TERMINAL_CONFIG.TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
