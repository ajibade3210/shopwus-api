import argon2 from "argon2";
import { EmailTemplateNames } from "../../../config/constants/emailTemplateInputs";
import { env } from "../../../config/env";
import { NotFoundError, UnauthorizedError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { generateOtp, getDateTime, sendEmailHandler } from "../../../utils";
import type {
  ForgotPasswordInput,
  ResetPasswordInput,
} from "../schema/auth.schema";

export async function forgotPasswordService(data: ForgotPasswordInput) {
  const email = data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  const response = {
    message: "If this email exists, a password reset code has been sent",
  };

  if (!user) return response;

  const resetToken = generateOtp(6);
  const resetExpiringAt = getDateTime().plus({ minutes: 15 }).toJSDate();

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken, resetExpiringAt },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?code=${resetToken}&email=${encodeURIComponent(email)}`;

  await sendEmailHandler({
    to: user.email,
    subject: "Reset Your Shopwus Password",
    template: EmailTemplateNames.PASSWORD_RESET,
    context: {
      name: user.firstName,
      otp: resetToken,
      resetUrl,
      expiryMinutes: 15,
      title: "Password Reset Code",
      purpose: "reset your Shopwus password",
    },
  }).catch(() => {});

  return response;
}

export async function resetPasswordService(data: ResetPasswordInput) {
  const email = data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || user.resetToken !== data.resetCode) {
    throw new UnauthorizedError("Invalid or expired reset code");
  }

  if (user.resetExpiringAt && new Date() > user.resetExpiringAt) {
    throw new UnauthorizedError("Reset code has expired");
  }

  const passwordHash = await argon2.hash(data.newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetExpiringAt: null,
    },
  });

  return { message: "Password reset successfully. You can now log in." };
}

export async function meService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      businessUsers: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!user) throw new NotFoundError("User not found");

  const primaryBusinessUser = user.businessUsers[0];

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      name: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      studioId: primaryBusinessUser?.business.id,
      studioName: primaryBusinessUser?.business.name,
      studioSlug: primaryBusinessUser?.business.slug,
      createdAt: user.createdAt,
    },
    studio: primaryBusinessUser
      ? {
          id: primaryBusinessUser.business.id,
          slug: primaryBusinessUser.business.slug,
          name: primaryBusinessUser.business.name,
          tagline: primaryBusinessUser.business.tagline,
          logoUrl: primaryBusinessUser.business.logoUrl,
          currency: primaryBusinessUser.business.currency,
          isPublished: primaryBusinessUser.business.isPublished,
          role: primaryBusinessUser.role,
        }
      : null,
    studios: user.businessUsers.map((bu) => ({
      id: bu.business.id,
      slug: bu.business.slug,
      name: bu.business.name,
      role: bu.role,
    })),
  };
}
