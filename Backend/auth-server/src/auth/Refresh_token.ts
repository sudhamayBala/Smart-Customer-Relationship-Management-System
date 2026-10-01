import crypto from "crypto";

export type RefreshTokenData = {
  userId: number;
  tenantId: number;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";
  tokenFamily: string;
  createdAt?: number;
  lastUsedAt?: number;
};

export const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashRefreshToken = (token: string): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateTokenFamily = (): string => {
  return crypto.randomUUID();
};
