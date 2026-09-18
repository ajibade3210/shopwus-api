import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const signupSchema = z
  .object({
    email: z.email("A valid email address is required"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    studioName: z.string().min(1, "Studio name is required"),
    studioSlug: z.string().optional(),
    slug: z.string().optional(),
    businessType: z.string().optional(),
  })
  .refine((data) => data.firstName || data.fullName, {
    message: "First name or full name is required",
    path: ["firstName"],
  });

export const loginSchema = z.object({
  email: z.email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
  deviceId: z.string().optional(),
  deviceName: z.string().optional(),
});

export const verifyEmailSchema = z.object({
  email: z.email("A valid email address is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
});

export const resendVerificationSchema = z.object({
  email: z.email("A valid email address is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const socialSignInSchema = z
  .object({
    code: z.string().optional(),
    idToken: z.string().optional(),
    token: z.string().optional(),
    mode: z.enum(["signin", "signup"]).optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    studioName: z.string().optional(),
    studioSlug: z.string().optional(),
    claimSlug: z.string().optional(),
    slug: z.string().optional(),
    rememberMe: z.boolean().optional().default(false),
    deviceId: z.string().optional(),
    deviceName: z.string().optional(),
  })
  .refine((data) => data.code || data.idToken || data.token, {
    message: "Google authorization code or ID token is required",
    path: ["code"],
  });

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.email("A valid email address is required"),
});

export const resetPasswordSchema = z.object({
  email: z.email("A valid email address is required"),
  resetCode: z.string().length(6, "Reset code must be 6 digits"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const updateMeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SocialSignInInput = z.infer<typeof socialSignInSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

const withHeaders = <T extends z.ZodTypeAny>(body: T) => ({
  headers: ReqHeaderSchema,
  body,
});

export const signupRouteSchema = withHeaders(signupSchema);
export const loginRouteSchema = withHeaders(loginSchema);
export const verifyEmailRouteSchema = withHeaders(verifyEmailSchema);
export const resendVerificationRouteSchema = withHeaders(
  resendVerificationSchema,
);
export const changePasswordRouteSchema = withHeaders(changePasswordSchema);
export const socialSignInRouteSchema = withHeaders(socialSignInSchema);
export const refreshRouteSchema = withHeaders(refreshSchema);
export const logoutRouteSchema = withHeaders(logoutSchema);
export const forgotPasswordRouteSchema = withHeaders(forgotPasswordSchema);
export const resetPasswordRouteSchema = withHeaders(resetPasswordSchema);
export const meRouteSchema = { headers: ReqHeaderSchema };
export const updateMeRouteSchema = withHeaders(updateMeSchema);
