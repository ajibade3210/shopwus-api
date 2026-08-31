import type { FastifyReply, FastifyRequest } from "fastify";
import type { ReqHeaders, TypedRequest } from "../../utils";
import { clearAuthCookies, setAuthCookies } from "../../utils/cookie.utils";
import type {
  ForgotPasswordInput,
  LoginInput,
  LogoutInput,
  RefreshInput,
  ResetPasswordInput,
  SignupInput,
  SocialSignInInput,
} from "./schema/auth.schema";
import * as authService from "./services";

export async function signup(
  req: TypedRequest<SignupInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.signupService(
    req.body,
    req.ip,
    req.headers["user-agent"],
  );

  setAuthCookies(reply, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  // Omit raw tokens from JSON payload — they are delivered via HttpOnly cookies
  const { accessToken: _at, refreshToken: _rt, token: _t, ...payload } = result;
  return reply.success(payload, "Studio director registered successfully", 201);
}

export async function login(
  req: TypedRequest<LoginInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.loginService(
    req.body,
    req.ip,
    req.headers["user-agent"],
  );

  setAuthCookies(reply, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    rememberMe: req.body.rememberMe,
  });

  const { accessToken: _at, refreshToken: _rt, token: _t, ...payload } = result;
  return reply.success(payload, "Logged in successfully");
}

export async function googleAuth(
  req: TypedRequest<SocialSignInInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.socialSignInService(
    req.body,
    req.ip,
    req.headers["user-agent"],
  );

  setAuthCookies(reply, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    rememberMe: req.body.rememberMe,
  });

  const { accessToken: _at, refreshToken: _rt, token: _t, ...payload } = result;
  return reply.success(
    payload,
    result.isNewUser ? "Studio created successfully" : "Signed in successfully",
    result.isNewUser ? 201 : 200,
  );
}

export async function refresh(
  req: TypedRequest<RefreshInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  // Prefer body token (API clients / Postman), fall back to HttpOnly cookie
  const refreshToken =
    req.body?.refreshToken ||
    (req as unknown as FastifyRequest).cookies?.shopwus_refresh_token;

  if (!refreshToken) {
    return reply.status(401).send({
      success: false,
      message: "Refresh token missing — please log in again",
    });
  }

  const result = await authService.refreshService(
    { refreshToken },
    req.ip,
    req.headers["user-agent"],
  );

  setAuthCookies(reply, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  // Return minimal payload; tokens delivered via cookies
  const { accessToken: _at, refreshToken: _rt, token: _t, ...payload } = result;
  return reply.success(payload, "Token refreshed successfully");
}

export async function logout(
  req: TypedRequest<LogoutInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  // Accept token from body or cookie
  const refreshToken =
    req.body?.refreshToken ||
    (req as unknown as FastifyRequest).cookies?.shopwus_refresh_token;

  if (refreshToken) {
    await authService.logoutService({ refreshToken });
  }

  clearAuthCookies(reply);
  return reply.success([], "Logged out successfully");
}

export async function logoutAll(
  req: TypedRequest<unknown, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.logoutAllService(req.user.userId);
  clearAuthCookies(reply);
  return reply.success([], result.message);
}

export async function forgotPassword(
  req: TypedRequest<ForgotPasswordInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.forgotPasswordService(req.body);
  return reply.success([], result.message);
}

export async function resetPassword(
  req: TypedRequest<ResetPasswordInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.resetPasswordService(req.body);
  return reply.success([], result.message);
}

export async function me(
  req: TypedRequest<unknown, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await authService.meService(req.user.userId);
  return reply.success(result, "User details retrieved successfully");
}
