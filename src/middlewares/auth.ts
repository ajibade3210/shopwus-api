import type { Role } from "@prisma/client";
import type {
  FastifyReply,
  FastifyRequest,
  RouteGenericInterface,
} from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { requestContext } from "../utils/requestContext";

export interface JwtPayload {
  userId: string;
  email?: string;
  role: Role;
  businessId?: string;
  jti?: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: JwtPayload;
    businessId: string;
  }
}

const verifyToken = (request: FastifyRequest): JwtPayload | null => {
  let token: string | undefined;

  // Prefer Authorization header (used by API clients, Postman, cURL, etc.)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Fall back to HttpOnly cookie (used by browser requests)
  if (!token) {
    token = request.cookies?.shopwus_access_token;
  }

  if (!token) {
    return null;
  }

  try {
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
  } catch {
    throw new UnauthorizedError("Invalid or expired access token");
  }
};

export const authenticate = async <RouteGeneric extends RouteGenericInterface>(
  request: FastifyRequest<RouteGeneric>,
  _reply: FastifyReply,
): Promise<void> => {
  const decoded = verifyToken(request);

  if (!decoded) {
    throw new UnauthorizedError("Invalid or missing access token");
  }

  request.user = decoded;
  if (decoded.businessId) {
    request.businessId = decoded.businessId;
  }

  const context = requestContext.getStore();
  if (context) {
    context.userId = decoded.userId;
    context.businessId = decoded.businessId;
    context.role = decoded.role;
  }
};

export const optionalAuthenticate = async <
  RouteGeneric extends RouteGenericInterface,
>(
  request: FastifyRequest<RouteGeneric>,
  _reply: FastifyReply,
): Promise<void> => {
  const decoded = verifyToken(request);

  if (decoded) {
    request.user = decoded;
    const context = requestContext.getStore();
    if (context) {
      context.userId = decoded.userId;
      context.businessId = decoded.businessId;
      context.role = decoded.role;
    }
  }
};

export const requireRole = (...roles: Role[]) => {
  return async <RouteGeneric extends RouteGenericInterface>(
    request: FastifyRequest<RouteGeneric>,
    _reply: FastifyReply,
  ) => {
    if (!request.user || !roles.includes(request.user.role)) {
      throw new ForbiddenError(
        "You do not have permission to access this resource",
      );
    }
  };
};

export const requireStudioOwner = async <
  RouteGeneric extends RouteGenericInterface,
>(
  request: FastifyRequest<RouteGeneric>,
  _reply: FastifyReply,
) => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }

  const allowedRoles: Role[] = ["OWNER", "DIRECTOR", "SUPER_ADMIN"];
  if (!allowedRoles.includes(request.user.role)) {
    throw new ForbiddenError(
      "Only studio directors and owners can perform this action",
    );
  }
};

export const requireBusiness = async <
  RouteGeneric extends RouteGenericInterface,
>(
  request: FastifyRequest<RouteGeneric>,
  _reply: FastifyReply,
): Promise<void> => {
  if (!request.user) {
    throw new UnauthorizedError("Authentication required");
  }
  if (!request.user.businessId) {
    throw new ForbiddenError("Account is not linked to a business");
  }
  request.businessId = request.user.businessId;
};

export const authenticateBusiness = [authenticate, requireBusiness];

export function getBusinessId(request: FastifyRequest): string {
  const businessId = request.user?.businessId;
  if (!businessId) {
    throw new ForbiddenError("Account is not linked to a business");
  }
  return businessId;
}

