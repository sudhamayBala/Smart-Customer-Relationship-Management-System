import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

const jwks = createRemoteJWKSet(new URL(env.jwksUrl));

export interface AuthenticatedRequest extends Request<Record<string, string>> {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email?: string;
  };
}

const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const token = authorization.substring(7);

    const { payload } = await jwtVerify(token, jwks, {
      algorithms: ["RS256"],
    });

    const userId =
      typeof payload.sub === "string"
        ? payload.sub
        : typeof payload.userId === "number"
          ? String(payload.userId)
          : undefined;

    const tenantId =
      typeof payload.crmTenantId === "string"
        ? payload.crmTenantId
        : typeof payload.tenantId === "string"
          ? payload.tenantId
          : typeof payload.tenantId === "number"
            ? String(payload.tenantId)
            : undefined;

    if (!userId || !tenantId || typeof payload.role !== "string") {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    req.user = {
      id: userId,
      tenantId,
      role: payload.role,
      ...(typeof payload.email === "string"
        ? { email: payload.email }
        : {}),
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

export default authMiddleware;