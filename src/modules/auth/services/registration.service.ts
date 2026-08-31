import argon2 from "argon2";
import { ConflictError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { sendWelcomeEmail, slugify } from "../../../utils";
import type { SignupInput } from "../schema/auth.schema";
import { issueAuthTokens } from "./session.service";

export async function signupService(
  data: SignupInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const email = data.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ConflictError("An account with this email already exists.");
  }

  // Parse name fields
  let firstName = data.firstName?.trim() || "";
  let lastName = data.lastName?.trim() || "";

  if (!firstName && data.fullName) {
    const parts = data.fullName.trim().split(" ");
    firstName = parts[0] || "Studio";
    lastName = parts.slice(1).join(" ") || "Director";
  }

  const rawSlug = data.slug || data.studioSlug || data.studioName;
  const baseSlug = slugify(rawSlug);
  let resolvedSlug = baseSlug;
  let counter = 1;

  while (await prisma.business.findUnique({ where: { slug: resolvedSlug } })) {
    resolvedSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const passwordHash = await argon2.hash(data.password);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone: data.phone?.trim(),
        role: "OWNER",
        isActive: true,
      },
    });

    const business = await tx.business.create({
      data: {
        name: data.studioName.trim(),
        slug: resolvedSlug,
        email,
        phone: data.phone?.trim(),
        businessType: "STUDIO",
        isPublished: true,
      },
    });

    const businessUser = await tx.businessUser.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: "OWNER",
      },
    });

    return { user, business, businessUser };
  });

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    businessId: result.business.id,
    ipAddress,
    userAgent,
  });

  // Async welcome email
  sendWelcomeEmail(
    result.user.email,
    result.user.firstName,
    result.business.name,
  ).catch(() => {});

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      name: `${result.user.firstName} ${result.user.lastName}`.trim(),
      role: result.user.role,
      avatarUrl: result.user.avatarUrl,
      studioId: result.business.id,
      studioName: result.business.name,
      studioSlug: result.business.slug,
    },
    studio: {
      id: result.business.id,
      slug: result.business.slug,
      name: result.business.name,
      role: result.businessUser.role,
    },
  };
}
