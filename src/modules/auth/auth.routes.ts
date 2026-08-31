import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import { rateLimit } from "../../utils";
import * as authController from "./auth.controller";
import * as authSchema from "./schema/auth.schema";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  typedApp.post(
    "/signup",
    {
      schema: authSchema.signupRouteSchema,
      ...rateLimit(10, "30 minutes"),
    },
    authController.signup,
  );

  typedApp.post(
    "/login",
    {
      schema: authSchema.loginRouteSchema,
      ...rateLimit(10, "15 minutes"),
    },
    authController.login,
  );

  typedApp.post(
    "/google",
    {
      schema: authSchema.socialSignInRouteSchema,
      ...rateLimit(15, "15 minutes"),
    },
    authController.googleAuth,
  );

  typedApp.post(
    "/refresh",
    {
      schema: authSchema.refreshRouteSchema,
      ...rateLimit(30, "1 minute"),
    },
    authController.refresh,
  );

  typedApp.post(
    "/logout",
    {
      schema: authSchema.logoutRouteSchema,
    },
    authController.logout,
  );

  typedApp.post(
    "/logout-all",
    {
      preHandler: [authenticate],
    },
    authController.logoutAll,
  );

  typedApp.post(
    "/forgot-password",
    {
      schema: authSchema.forgotPasswordRouteSchema,
      ...rateLimit(10, "15 minutes"),
    },
    authController.forgotPassword,
  );

  typedApp.post(
    "/reset-password",
    {
      schema: authSchema.resetPasswordRouteSchema,
      ...rateLimit(10, "15 minutes"),
    },
    authController.resetPassword,
  );

  typedApp.get(
    "/me",
    {
      preHandler: [authenticate],
      schema: authSchema.meRouteSchema,
    },
    authController.me,
  );

  typedApp.patch(
    "/me",
    {
      preHandler: [authenticate],
      schema: authSchema.updateMeRouteSchema,
    },
    authController.updateMe,
  );
}

