import { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";
import { getAuthKeys } from "../auth/keys";



export type AuthenticatedRequest = Request & {
  user?: {
    userId: number;
    tenantId: number;
    role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";
  };
};

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: "Authorization header is required",
      });
    }

    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({
        message: "Invalid authorization format",
      });
    }

    const { publicKey } = await getAuthKeys();

    const { payload } = await jwtVerify(token, publicKey, {
      issuer: "propflow-auth",
      audience: "propflow-api",
    });

    if (
      typeof payload.userId !== "number" ||
      typeof payload.tenantId !== "number" ||
      typeof payload.role !== "string"
    ) {
      return res.status(401).json({
        message: "Invalid token payload",
      });
    }

    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role as
        | "SUPER_ADMIN"
        | "ADMIN"
        | "MANAGER"
        | "AGENT",
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    return res.status(401).json({
      message: "Invalid or expired access token",
    });
  }
};
