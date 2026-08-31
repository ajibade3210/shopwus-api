import axios from "axios";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { GoogleUserInfo, SocialProfile } from "../types/auth";
import { UnauthorizedError } from "./errors";
import { logger } from "./logger";

/**
 * Verifies a Google social authentication token or authorization code.
 *
 * Supports:
 * 1. Authorization Code (from Google Identity Services `initCodeClient` popup flow)
 *    -> Exchanged with Google via `https://oauth2.googleapis.com/token`
 * 2. Direct ID Token / Access Token (from legacy GSI One Tap or mobile clients)
 *    -> Verified via `https://oauth2.googleapis.com/tokeninfo` or `userinfo`
 */
export async function verifySocialToken(
  tokenOrCode: string,
  firstName?: string,
  lastName?: string,
): Promise<SocialProfile> {
  const isLikelyJwt = tokenOrCode.split(".").length === 3;

  // 1. If it's not a 3-part JWT, treat it as an OAuth2 authorization code
  if (!isLikelyJwt) {
    try {
      const postBody: Record<string, string> = {
        code: tokenOrCode,
        client_id: env.GOOGLE_CLIENT_ID || "",
        redirect_uri: "postmessage",
        grant_type: "authorization_code",
      };

      if (env.GOOGLE_CLIENT_SECRET) {
        postBody.client_secret = env.GOOGLE_CLIENT_SECRET;
      }

      const tokenRes = await axios.post<{
        access_token?: string;
        id_token?: string;
      }>("https://oauth2.googleapis.com/token", postBody, { timeout: 10000 });

      const { id_token, access_token } = tokenRes.data;

      // Extract user info from id_token (safely received directly from Google over HTTPS)
      if (id_token) {
        const decoded = jwt.decode(id_token) as GoogleUserInfo | null;
        if (decoded?.sub) {
          return {
            providerId: decoded.sub,
            provider: "google",
            email: decoded.email ?? null,
            firstName: decoded.given_name ?? firstName ?? null,
            lastName: decoded.family_name ?? lastName ?? null,
            emailVerified:
              decoded.email_verified === "true" ||
              decoded.email_verified === true,
          };
        }
      }

      // Fallback: Fetch userinfo endpoint using the access_token
      if (access_token) {
        const userInfoRes = await axios.get<GoogleUserInfo>(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${access_token}` },
            timeout: 5000,
          },
        );

        if (userInfoRes.data?.sub) {
          return {
            providerId: userInfoRes.data.sub,
            provider: "google",
            email: userInfoRes.data.email ?? null,
            firstName: userInfoRes.data.given_name ?? firstName ?? null,
            lastName: userInfoRes.data.family_name ?? lastName ?? null,
            emailVerified:
              userInfoRes.data.email_verified === "true" ||
              userInfoRes.data.email_verified === true,
          };
        }
      }
    } catch (err: unknown) {
      const axiosErr = axios.isAxiosError(err) ? err.response?.data : err;
      logger.warn(
        { err: axiosErr },
        "Google authorization code exchange failed",
      );
    }
  }

  // 2. Direct ID Token verification via Google tokeninfo
  try {
    const res = await axios.get<GoogleUserInfo>(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenOrCode}`,
      { timeout: 5000 },
    );

    if (res.data?.sub) {
      return {
        providerId: res.data.sub,
        provider: "google",
        email: res.data.email ?? null,
        firstName: res.data.given_name ?? firstName ?? null,
        lastName: res.data.family_name ?? lastName ?? null,
        emailVerified:
          res.data.email_verified === "true" ||
          res.data.email_verified === true,
      };
    }
  } catch (err) {
    logger.warn({ err }, "Google tokeninfo verification failed");
  }

  throw new UnauthorizedError("Invalid or expired social authentication token");
}
