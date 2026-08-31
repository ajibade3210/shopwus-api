import crypto from "node:crypto";
import type { Role } from "@prisma/client";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { CACHE_KEYS } from "../../../config/constants/cache";
import { DomainErrorCode } from "../../../config/constants/errors";
import { env } from "../../../config/env";
import { cacheStore } from "../../../lib/cache";
import { ForbiddenError, UnauthorizedError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { JwtPayload } from "../../../middlewares/auth";
import {
  generateRefreshToken,
  getCurrentDateInTimezone,
  getDateTime,
  hashToken,
  parseRefreshExpiryMs,
} from "../../../utils";
import type {
  LoginInput,
  LogoutInput,
  RefreshInput,
} from "../schema/auth.schema";

export interface IssueTokensParams {
  userId: string;
  role: Role;
  email?: string;
  businessId?: string;
  rememberMe?: boolean;
  deviceId?: string;
  deviceName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function issueAuthTokens(params: IssueTokensParams) {
  const jti = crypto.randomUUID();
  const payload: JwtPayload = {
    userId: params.userId,
    email: params.email,
    role: params.role,
    businessId: params.businessId,
    jti,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn:
      env.JWT_EXPIRES_IN as import("jsonwebtoken").SignOptions["expiresIn"],
    algorithm: "HS256",
  });

  const refreshTokenPlain = generateRefreshToken();
  const tokenHash = hashToken(refreshTokenPlain);

  await prisma.refreshToken.create({
    data: {
      userId: params.userId,
      tokenHash,
      deviceId: params.deviceId,
      deviceName: params.deviceName,
      expiresAt: getDateTime()
        .plus({ milliseconds: parseRefreshExpiryMs(params.rememberMe) })
        .toJSDate(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    },
  });

  return { accessToken, refreshToken: refreshTokenPlain };
}

export async function loginService(
  data: LoginInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const email = data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  if (!user || !user.passwordHash) {
    throw new UnauthorizedError(
      "Invalid email or password",
      DomainErrorCode.AUTH_FAILED,
    );
  }

  const passwordIsValid = await argon2.verify(user.passwordHash, data.password);
  if (!passwordIsValid) {
    throw new UnauthorizedError(
      "Invalid email or password",
      DomainErrorCode.AUTH_FAILED,
    );
  }

  if (!user.isActive) {
    throw new ForbiddenError(
      "Your account has been deactivated. Please contact support.",
      DomainErrorCode.DEACTIVATED_ACCOUNT,
    );
  }

  const primaryBusinessUser = user.businessUsers[0];
  const businessId = primaryBusinessUser?.businessId;

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    businessId,
    rememberMe: data.rememberMe,
    deviceId: data.deviceId,
    deviceName: data.deviceName,
    ipAddress,
    userAgent,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      avatarUrl: user.avatarUrl,
      studioId: primaryBusinessUser?.business.id,
      studioName: primaryBusinessUser?.business.name,
      studioSlug: primaryBusinessUser?.business.slug,
    },
    studio: primaryBusinessUser
      ? {
          id: primaryBusinessUser.business.id,
          slug: primaryBusinessUser.business.slug,
          name: primaryBusinessUser.business.name,
          role: primaryBusinessUser.role,
        }
      : null,
  };
}

export async function refreshService(
  data: RefreshInput,
  ipAddress?: string,
  userAgent?: string,
) {
  if (!data.refreshToken) {
    throw new UnauthorizedError(
      "Refresh token is required",
      DomainErrorCode.SESSION_EXPIRED,
    );
  }
  const tokenHash = hashToken(data.refreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          businessUsers: {
            include: { business: true },
          },
        },
      },
    },
  });

  if (!tokenRecord) {
    throw new UnauthorizedError(
      "Invalid or expired refresh token",
      DomainErrorCode.SESSION_EXPIRED,
    );
  }

  const now = getCurrentDateInTimezone();
  if (tokenRecord.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId, revokedAt: null },
      data: { revokedAt: now },
    });
    throw new UnauthorizedError(
      "Security alert: This token was already used. All sessions have been terminated. Please log in again.",
      DomainErrorCode.REUSE_DETECTION,
    );
  }

  if (now.getTime() > tokenRecord.expiresAt.getTime()) {
    throw new UnauthorizedError(
      "Refresh token has expired. Please log in again.",
      DomainErrorCode.SESSION_EXPIRED,
    );
  }

  if (!tokenRecord.user.isActive) {
    throw new ForbiddenError(
      "Account is deactivated",
      DomainErrorCode.DEACTIVATED_ACCOUNT,
    );
  }

  // Revoke old token on rotation
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { revokedAt: now },
  });

  const primaryBusinessUser = tokenRecord.user.businessUsers[0];
  const businessId = primaryBusinessUser?.businessId;

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: tokenRecord.user.id,
    email: tokenRecord.user.email,
    role: tokenRecord.user.role,
    businessId,
    deviceId: tokenRecord.deviceId || undefined,
    deviceName: tokenRecord.deviceName || undefined,
    ipAddress,
    userAgent,
  });

  return {
    token: accessToken,
    accessToken,
    refreshToken,
  };
}

export async function logoutService(data: LogoutInput) {
  if (!data.refreshToken) {
    return { message: "Logged out successfully" };
  }
  const tokenHash = hashToken(data.refreshToken);

  const tokenRecord = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: getCurrentDateInTimezone() },
  });

  if (tokenRecord) {
    await cacheStore.delete(CACHE_KEYS.userSession(tokenRecord.userId));
  }

  return { message: "Logged out successfully" };
}

export async function logoutAllService(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: getCurrentDateInTimezone() },
  });

  await cacheStore.delete(CACHE_KEYS.userSession(userId));

  return { message: "All sessions have been terminated" };
}
