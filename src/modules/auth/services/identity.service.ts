import argon2 from "argon2";
import { EmailTemplateNames } from "../../../config/constants/emailTemplateInputs";
import { env } from "../../../config/env";
import { NotFoundError, UnauthorizedError, ValidationError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { prisma } from "../../../lib/prisma";
import { generateOtp, getDateTime, sendEmailHandler } from "../../../utils";
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  UpdateMeInput,
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
  }).catch((err) => {
    logger.error(
      { err, email: user.email },
      "Failed to dispatch password reset email",
    );
  });

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
      emailVerified: true,
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
      emailVerified: user.emailVerified,
      hasPassword: Boolean(user.passwordHash),
      isGoogleConnected: Boolean(user.googleId),
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

export async function updateMeService(userId: string, data: UpdateMeInput) {
  let firstName = data.firstName?.trim();
  let lastName = data.lastName?.trim();

  if (data.name && !firstName) {
    const parts = data.name.trim().split(" ");
    firstName = parts[0];
    lastName = parts.slice(1).join(" ") || lastName;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
      ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
    },
    include: {
      businessUsers: {
        include: {
          business: true,
        },
      },
    },
  });

  const primaryBusinessUser = updatedUser.businessUsers[0];

  return {
    user: {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      name: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
      phone: updatedUser.phone,
      role: updatedUser.role,
      avatarUrl: updatedUser.avatarUrl,
      isActive: updatedUser.isActive,
      emailVerified: updatedUser.emailVerified,
      hasPassword: Boolean(updatedUser.passwordHash),
      isGoogleConnected: Boolean(updatedUser.googleId),
      studioId: primaryBusinessUser?.business.id,
      studioName: primaryBusinessUser?.business.name,
      studioSlug: primaryBusinessUser?.business.slug,
      createdAt: updatedUser.createdAt,
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
  };
}

export async function changePasswordService(
  userId: string,
  data: ChangePasswordInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new NotFoundError("User not found");

  // If user already has a password set, verify current password
  if (user.passwordHash) {
    if (!data.currentPassword) {
      throw new ValidationError(
        "Current password is required to change your password.",
      );
    }

    const isMatch = await argon2.verify(
      user.passwordHash,
      data.currentPassword,
    );
    if (!isMatch) {
      throw new ValidationError("Current password does not match.");
    }
  }

  // Hash new password and update
  const newHash = await argon2.hash(data.newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
    },
  });

  return { message: "Password updated successfully." };
}
