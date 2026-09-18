import argon2 from "argon2";
import { isReservedSlug } from "../../../config/constants/reserved-slugs";
import {
  DEFAULT_BUSINESS_TYPE,
  DEFAULT_BUTTON_RADIUS,
  DEFAULT_COLOR_SCHEME,
  DEFAULT_FOOTER_SETTINGS,
  DEFAULT_PORTFOLIO_CATEGORIES,
  DEFAULT_SOCIAL_CHANNELS,
  DEFAULT_VISIBILITY_SETTINGS,
} from "../../../config/constants/studio";
import { queueBannerGeneration } from "../../../jobs/workers/banner.worker";
import { ConflictError, NotFoundError, ValidationError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";
import {
  generateOtp,
  getDateTime,
  sendVerificationOtpEmail,
  sendWelcomeEmail,
  slugify,
} from "../../../utils";
import type {
  ResendVerificationInput,
  SignupInput,
  VerifyEmailInput,
} from "../schema/auth.schema";
import { issueAuthTokens } from "./session.service";

export async function signupService(
  data: SignupInput,
  _ipAddress?: string,
  _userAgent?: string,
) {
  const email = data.email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  // Parse name fields
  let firstName = data.firstName?.trim() || "";
  let lastName = data.lastName?.trim() || "";

  if (!firstName && data.fullName) {
    const parts = data.fullName.trim().split(" ");
    firstName = parts[0] || "Studio";
    lastName = parts.slice(1).join(" ") || "Director";
  }

  // Handle re-signup for unverified account (Abandoned OTP Recovery)
  if (existingUser) {
    if (existingUser.emailVerified) {
      throw new ConflictError("An account with this email already exists.");
    }

    const passwordHash = await argon2.hash(data.password);
    const otp = generateOtp(6);
    const verificationExpires = getDateTime().plus({ minutes: 15 }).toJSDate();

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash,
        verificationToken: otp,
        verificationExpires,
        ...(firstName ? { firstName } : {}),
        ...(lastName ? { lastName } : {}),
        ...(data.phone ? { phone: data.phone.trim() } : {}),
      },
    });

    const primaryStudioName =
      existingUser.businessUsers[0]?.business.name || data.studioName;

    sendVerificationOtpEmail(
      existingUser.email,
      existingUser.firstName,
      otp,
      primaryStudioName,
    ).catch((err) => {
      logger.error(
        { err, email: existingUser.email },
        "Failed to dispatch verification OTP email on re-signup",
      );
    });

    return {
      requiresVerification: true,
      email: existingUser.email,
      message: "A verification code has been sent to your email.",
    };
  }

  const rawSlug = data.slug || data.studioSlug || data.studioName;
  const baseSlug = slugify(rawSlug);
  let resolvedSlug = baseSlug;
  let counter = 1;

  while (
    isReservedSlug(resolvedSlug) ||
    (await prisma.business.findUnique({ where: { slug: resolvedSlug } }))
  ) {
    resolvedSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const passwordHash = await argon2.hash(data.password);
  const otp = generateOtp(6);
  const verificationExpires = getDateTime().plus({ minutes: 15 }).toJSDate();

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
        emailVerified: false,
        verificationToken: otp,
        verificationExpires,
      },
    });

    const business = await tx.business.create({
      data: {
        name: data.studioName.trim(),
        slug: resolvedSlug,
        email,
        phone: data.phone?.trim(),
        businessType: data.businessType || DEFAULT_BUSINESS_TYPE,
        colors: DEFAULT_COLOR_SCHEME,
        buttonRadius: DEFAULT_BUTTON_RADIUS,
        showServices: DEFAULT_VISIBILITY_SETTINGS.showServices,
        showPortfolio: DEFAULT_VISIBILITY_SETTINGS.showPortfolio,
        showReviews: DEFAULT_VISIBILITY_SETTINGS.showReviews,
        showFooterCta: DEFAULT_VISIBILITY_SETTINGS.showFooterCta,
        footerEyebrow: DEFAULT_FOOTER_SETTINGS.footerEyebrow,
        footerTitle: DEFAULT_FOOTER_SETTINGS.footerTitle,
        footerDescription: DEFAULT_FOOTER_SETTINGS.footerDescription,
        portfolioCategories: DEFAULT_PORTFOLIO_CATEGORIES,
        isPublished: true,
      },
    });

    await tx.socialChannel.createMany({
      data: DEFAULT_SOCIAL_CHANNELS.map((ch) => ({
        businessId: business.id,
        type: ch.type,
        label: ch.label,
        connected: false,
        handle: ch.handle,
        url: ch.url,
      })),
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

  // Trigger background email header banner generation for the new studio
  queueBannerGeneration(result.business.id).catch((err) => {
    logger.warn(
      { err, businessId: result.business.id },
      "Failed to trigger banner generation on signup",
    );
  });

  // Async OTP verification email
  sendVerificationOtpEmail(
    result.user.email,
    result.user.firstName,
    otp,
    result.business.name,
  ).catch((err) => {
    logger.error(
      { err, email: result.user.email },
      "Failed to dispatch verification OTP email on signup",
    );
  });

  return {
    requiresVerification: true,
    email: result.user.email,
    studioSlug: result.business.slug,
    message:
      "Account created. Please enter the 6-digit verification code sent to your email.",
  };
}

export async function verifyEmailService(
  data: VerifyEmailInput,
  ipAddress?: string,
  userAgent?: string,
) {
  const email = data.email.toLowerCase().trim();
  const code = data.code.trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // If already verified, issue tokens directly
  if (user.emailVerified) {
    const primaryBusinessUser = user.businessUsers[0];
    const { accessToken, refreshToken } = await issueAuthTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: primaryBusinessUser?.businessId,
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
        emailVerified: true,
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

  if (!user.verificationToken || user.verificationToken !== code) {
    throw new ValidationError(
      "Invalid verification code. Please check your code or request a new one.",
    );
  }

  if (!user.verificationExpires || user.verificationExpires < new Date()) {
    throw new ValidationError(
      "Verification code has expired. Please request a new code.",
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  const primaryBusinessUser = updatedUser.businessUsers[0];
  const primaryBusiness = primaryBusinessUser?.business;

  const { accessToken, refreshToken } = await issueAuthTokens({
    userId: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
    businessId: primaryBusiness?.id,
    ipAddress,
    userAgent,
  });

  // Async welcome email now that user is verified
  if (primaryBusiness) {
    sendWelcomeEmail(
      updatedUser.email,
      updatedUser.firstName,
      primaryBusiness.name,
    ).catch((err) => {
      logger.error(
        { err, email: updatedUser.email },
        "Failed to dispatch welcome email after verification",
      );
    });
  }

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
      emailVerified: true,
      studioId: primaryBusiness?.id,
      studioName: primaryBusiness?.name,
      studioSlug: primaryBusiness?.slug,
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

export async function resendVerificationService(data: ResendVerificationInput) {
  const email = data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  // Prevent user enumeration: return success even if user not found
  if (!user) {
    return {
      message:
        "If this email is registered, a new verification code has been sent.",
    };
  }

  if (user.emailVerified) {
    return {
      message: "Email is already verified. You can log in directly.",
    };
  }

  const otp = generateOtp(6);
  const verificationExpires = getDateTime().plus({ minutes: 15 }).toJSDate();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationToken: otp,
      verificationExpires,
    },
  });

  const studioName = user.businessUsers[0]?.business.name;

  sendVerificationOtpEmail(user.email, user.firstName, otp, studioName).catch(
    (err) => {
      logger.error(
        { err, email: user.email },
        "Failed to dispatch verification OTP email on resend",
      );
    },
  );

  return {
    message: "A new verification code has been sent to your email.",
  };
}
