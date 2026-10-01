import redis from "../config/radish";

import {
  generateRefreshToken,
  hashRefreshToken,
  generateTokenFamily,
  RefreshTokenData,
} from "../auth/Refresh_token";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

const getTokenKey = (tokenHash: string) =>
  `refresh:${tokenHash}`;

const getUsedTokenKey = (tokenHash: string) =>
  `refresh-used:${tokenHash}`;

const getFamilyKey = (tokenFamily: string) =>
  `refresh-family:${tokenFamily}`;

export const createRefreshToken = async (
  data: Omit<RefreshTokenData, "tokenFamily"> & {
    tokenFamily?: string;
    createdAt?: number;
    lastUsedAt?: number;
  }
) => {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);

  const tokenFamily =
    data.tokenFamily ?? generateTokenFamily();

  const tokenData: RefreshTokenData = {
    userId: data.userId,
    tenantId: data.tenantId,
    role: data.role,
    tokenFamily,
    createdAt: data.createdAt ?? Date.now(),
    lastUsedAt: data.lastUsedAt ?? Date.now(),
  };

  await redis.set(
    getTokenKey(tokenHash),
    JSON.stringify(tokenData),
    "EX",
    REFRESH_TOKEN_TTL
  );

  await redis.set(
    getFamilyKey(tokenFamily),
    tokenHash,
    "EX",
    REFRESH_TOKEN_TTL
  );

  return {
    token,
    tokenFamily,
  };
};

export const getRefreshTokenData = async (
  token: string
) => {
  const tokenHash = hashRefreshToken(token);

  const data = await redis.get(
    getTokenKey(tokenHash)
  );

  if (data) {
    return {
      tokenHash,
      data: JSON.parse(data) as RefreshTokenData,
      reused: false,
    };
  }

  // Token was already used previously
  const usedData = await redis.get(
    getUsedTokenKey(tokenHash)
  );

  if (usedData) {
    return {
      tokenHash,
      data: JSON.parse(usedData) as RefreshTokenData,
      reused: true,
    };
  }

  return null;
};

export const deleteRefreshToken = async (
  token: string
) => {
  const tokenHash = hashRefreshToken(token);

  const data = await redis.get(
    getTokenKey(tokenHash)
  );

  if (data) {
    // Keep a record so reuse can be detected
    await redis.set(
      getUsedTokenKey(tokenHash),
      data,
      "EX",
      REFRESH_TOKEN_TTL
    );
  }

  await redis.del(getTokenKey(tokenHash));
};

export const revokeTokenFamily = async (
  tokenFamily: string
): Promise<void> => {
  const familyKey = getFamilyKey(tokenFamily);

  const currentTokenHash = await redis.get(
    familyKey
  );

  if (currentTokenHash) {
    await redis.del(
      getTokenKey(currentTokenHash)
    );

    await redis.del(
      getUsedTokenKey(currentTokenHash)
    );
  }

  await redis.del(familyKey);
};

export const listUserSessions = async (tenantId: number, userId: number) => {
  const sessions: Array<{ id: string; createdAt: number | null; lastUsedAt: number | null }> = [];
  let cursor = "0";

  do {
    const [nextCursor, keys] = await redis.scan(cursor, "MATCH", "refresh-family:*", "COUNT", 100);
    cursor = String(nextCursor);

    for (const familyKey of keys) {
      const tokenFamily = familyKey.slice("refresh-family:".length);
      const tokenHash = await redis.get(familyKey);
      if (!tokenHash) continue;

      const rawData = await redis.get(getTokenKey(tokenHash));
      if (!rawData) continue;

      const data = JSON.parse(rawData) as RefreshTokenData;
      if (data.tenantId !== tenantId || data.userId !== userId) continue;
      sessions.push({
        id: tokenFamily,
        createdAt: data.createdAt ?? null,
        lastUsedAt: data.lastUsedAt ?? data.createdAt ?? null,
      });
    }
  } while (cursor !== "0");

  return sessions.sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0));
};

export const revokeUserSessions = async (tenantId: number, userId: number) => {
  const sessions = await listUserSessions(tenantId, userId);
  await Promise.all(sessions.map((session) => revokeTokenFamily(session.id)));
  return sessions.length;
};
