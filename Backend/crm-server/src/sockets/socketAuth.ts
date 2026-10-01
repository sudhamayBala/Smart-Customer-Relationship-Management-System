import { Socket } from "socket.io";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

const jwks = createRemoteJWKSet(
  new URL(env.jwksUrl)
);

export interface SocketUser {
  id: string;
  tenantId: string;
  role: string;
  email?: string;
}

const socketAuth = async (
  socket: Socket,
  next: (error?: Error) => void
) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.replace(
        "Bearer ",
        ""
      );

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }

    const { payload } = await jwtVerify(
      token,
      jwks,
      {
        algorithms: ["RS256"],
      }
    );

    if (
      typeof payload.sub !== "string" ||
      (typeof payload.crmTenantId !== "string" &&
        typeof payload.tenantId !== "string" &&
        typeof payload.tenantId !== "number") ||
      typeof payload.role !== "string"
    ) {
      next(new Error("Invalid authentication token"));
      return;
    }

    socket.data.user = {
      id: payload.sub,
      tenantId: typeof payload.crmTenantId === "string"
        ? payload.crmTenantId
        : String(payload.tenantId),
      role: payload.role,
      email:
        typeof payload.email === "string"
          ? payload.email
          : undefined,
    };

    next();
  } catch {
    next(new Error("Invalid or expired authentication token"));
  }
};

export default socketAuth;