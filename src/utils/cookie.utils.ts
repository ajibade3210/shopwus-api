import type { FastifyReply } from "fastify";
import { Environment } from "../config/constants/environment";
import { env } from "../config/env";

const IS_PROD = env.NODE_ENV === Environment.PRODUCTION;

// Access token lives for the same duration as the JWT itself (short-lived).
// We match it so the browser drops the cookie exactly when the JWT expires.
const ACCESS_MAX_AGE_SECONDS = 15 * 60; // 15 minutes (matches JWT_EXPIRES_IN default)

// Standard refresh token TTL in seconds (1 day).
const REFRESH_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day
// "Remember me" refresh token TTL.
const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface SetAuthCookiesOptions {
  accessToken: string;
  refreshToken: string;
  rememberMe?: boolean;
}

/**
 * Sets HttpOnly, SameSite=Lax auth cookies on the response.
 * Tokens are NOT accessible to client-side JavaScript.
 */
export function setAuthCookies(
  reply: FastifyReply,
  { accessToken, refreshToken, rememberMe = false }: SetAuthCookiesOptions,
): void {
  const baseOptions = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
    path: "/",
  };

  reply.setCookie("shopwus_access_token", accessToken, {
    ...baseOptions,
    maxAge: ACCESS_MAX_AGE_SECONDS,
  });

  reply.setCookie("shopwus_refresh_token", refreshToken, {
    ...baseOptions,
    maxAge: rememberMe ? REMEMBER_ME_MAX_AGE_SECONDS : REFRESH_MAX_AGE_SECONDS,
    path: "/api/v1/auth", // Scope refresh token to auth paths only
  });
}

/**
 * Expires both auth cookies — call on logout.
 */
export function clearAuthCookies(reply: FastifyReply): void {
  const baseOptions = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax" as const,
  };

  reply.setCookie("shopwus_access_token", "", {
    ...baseOptions,
    path: "/",
    maxAge: 0,
  });

  reply.setCookie("shopwus_refresh_token", "", {
    ...baseOptions,
    path: "/api/v1/auth",
    maxAge: 0,
  });
}
