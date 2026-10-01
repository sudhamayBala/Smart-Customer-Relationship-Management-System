import { SignJWT } from "jose";
import { getAuthKeys } from "./keys";
import TenantProfile from "../models/TenantProfile";

export type AccessTokenPayload = {
  userId: number;
  tenantId: number;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";
};

export const createAccessToken = async (
  payload: AccessTokenPayload
): Promise<string> => {
  const { privateKey, publicJwk } = await getAuthKeys();
  const tenantProfile = await TenantProfile.findByPk(payload.tenantId);

  return new SignJWT({
    sub: String(payload.userId),
    userId: payload.userId,
    tenantId: payload.tenantId,
    ...(tenantProfile?.crmTenantId ? { crmTenantId: tenantProfile.crmTenantId } : {}),
    role: payload.role,
  })
    .setProtectedHeader({
      alg: "RS256",
      kid: publicJwk.kid ?? "propflow-key-1",
    })
    .setIssuedAt()
    .setExpirationTime("60s")
    .setIssuer("propflow-auth")
    .setAudience("propflow-api")
    .sign(privateKey);
};
