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
import {
  DomainErrorCode,
  ForbiddenError,
  NotFoundError,
} from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";
import { verifySocialToken } from "../../../lib/socialAuth";
import { sendWelcomeEmail, slugify } from "../../../utils";
import type { SocialSignInInput } from "../schema/auth.schema";
import { issueAuthTokens } from "./session.service";

export async function socialSignInService(
  data: SocialSignInInput,
  ipAddress?: string,
  userAgent?: string,
) {
  let firstName = data.firstName;
  let lastName = data.lastName;

  if (!firstName && data.fullName) {
    const parts = data.fullName.trim().split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ") || undefined;
  }

  const tokenOrCode = (data.code || data.idToken || data.token || "").trim();
  const profile = await verifySocialToken(tokenOrCode, firstName, lastName);

  const email = profile.email?.toLowerCase().trim();
  if (!email) {
    throw new ForbiddenError("Email is required for Google sign-in.");
  }

  // Look up by googleId or email
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ googleId: profile.providerId }, { email }],
    },
    include: {
      businessUsers: {
        include: { business: true },
      },
    },
  });

  let isNewUser = false;

  if (!user) {
    if (data.mode === "signin") {
      throw new NotFoundError(
        "No account found with this Google email.",
        DomainErrorCode.NOT_FOUND,
      );
    }

    isNewUser = true;
    const effectiveFirstName = profile.firstName || firstName || "Studio";
    const effectiveLastName = profile.lastName || lastName || "Director";
    const studioName = data.studioName || `${effectiveFirstName}'s Studio`;

    const rawSlug =
      data.claimSlug || data.slug || data.studioSlug || studioName;
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

    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          firstName: effectiveFirstName,
          lastName: effectiveLastName,
          googleId: profile.providerId,
          role: "OWNER",
          isActive: true,
        },
      });

      const newBusiness = await tx.business.create({
        data: {
          name: studioName,
          slug: resolvedSlug,
          email,
          businessType: DEFAULT_BUSINESS_TYPE,
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
          businessId: newBusiness.id,
          type: ch.type,
          label: ch.label,
          connected: false,
          handle: ch.handle,
          url: ch.url,
        })),
      });

      await tx.businessUser.create({
        data: {
          businessId: newBusiness.id,
          userId: newUser.id,
          role: "OWNER",
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        include: {
          businessUsers: {
            include: { business: true },
          },
        },
      });
    });

    const primaryBusinessId = user.businessUsers[0]?.businessId;
    if (primaryBusinessId) {
      queueBannerGeneration(primaryBusinessId).catch((err) => {
        logger.warn(
          { err, businessId: primaryBusinessId },
          "Failed to trigger banner generation on Google signup",
        );
      });
    }

    const userEmail = user.email;
    sendWelcomeEmail(
      userEmail,
      user.firstName,
      data.studioName || user.businessUsers[0]?.business.name,
    ).catch((err) => {
      logger.error(
        { err, email: userEmail },
        "Failed to dispatch Google sign-in welcome email",
      );
    });
  } else if (!user.googleId) {
    // Link googleId to existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.providerId },
      include: {
        businessUsers: {
          include: { business: true },
        },
      },
    });
  }

  if (!user.isActive) {
    throw new ForbiddenError(
      "Your account has been deactivated. Please contact support.",
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
    isNewUser,
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
