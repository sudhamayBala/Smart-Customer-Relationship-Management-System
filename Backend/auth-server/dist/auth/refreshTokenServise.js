"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.revokeUserSessions = exports.listUserSessions = exports.revokeTokenFamily = exports.deleteRefreshToken = exports.getRefreshTokenData = exports.createRefreshToken = void 0;
const radish_1 = __importDefault(require("../config/radish"));
const Refresh_token_1 = require("../auth/Refresh_token");
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const getTokenKey = (tokenHash) => `refresh:${tokenHash}`;
const getUsedTokenKey = (tokenHash) => `refresh-used:${tokenHash}`;
const getFamilyKey = (tokenFamily) => `refresh-family:${tokenFamily}`;
const createRefreshToken = async (data) => {
    const token = (0, Refresh_token_1.generateRefreshToken)();
    const tokenHash = (0, Refresh_token_1.hashRefreshToken)(token);
    const tokenFamily = data.tokenFamily ?? (0, Refresh_token_1.generateTokenFamily)();
    const tokenData = {
        userId: data.userId,
        tenantId: data.tenantId,
        role: data.role,
        tokenFamily,
        createdAt: data.createdAt ?? Date.now(),
        lastUsedAt: data.lastUsedAt ?? Date.now(),
    };
    await radish_1.default.set(getTokenKey(tokenHash), JSON.stringify(tokenData), "EX", REFRESH_TOKEN_TTL);
    await radish_1.default.set(getFamilyKey(tokenFamily), tokenHash, "EX", REFRESH_TOKEN_TTL);
    return {
        token,
        tokenFamily,
    };
};
exports.createRefreshToken = createRefreshToken;
const getRefreshTokenData = async (token) => {
    const tokenHash = (0, Refresh_token_1.hashRefreshToken)(token);
    const data = await radish_1.default.get(getTokenKey(tokenHash));
    if (data) {
        return {
            tokenHash,
            data: JSON.parse(data),
            reused: false,
        };
    }
    // Token was already used previously
    const usedData = await radish_1.default.get(getUsedTokenKey(tokenHash));
    if (usedData) {
        return {
            tokenHash,
            data: JSON.parse(usedData),
            reused: true,
        };
    }
    return null;
};
exports.getRefreshTokenData = getRefreshTokenData;
const deleteRefreshToken = async (token) => {
    const tokenHash = (0, Refresh_token_1.hashRefreshToken)(token);
    const data = await radish_1.default.get(getTokenKey(tokenHash));
    if (data) {
        // Keep a record so reuse can be detected
        await radish_1.default.set(getUsedTokenKey(tokenHash), data, "EX", REFRESH_TOKEN_TTL);
    }
    await radish_1.default.del(getTokenKey(tokenHash));
};
exports.deleteRefreshToken = deleteRefreshToken;
const revokeTokenFamily = async (tokenFamily) => {
    const familyKey = getFamilyKey(tokenFamily);
    const currentTokenHash = await radish_1.default.get(familyKey);
    if (currentTokenHash) {
        await radish_1.default.del(getTokenKey(currentTokenHash));
        await radish_1.default.del(getUsedTokenKey(currentTokenHash));
    }
    await radish_1.default.del(familyKey);
};
exports.revokeTokenFamily = revokeTokenFamily;
const listUserSessions = async (tenantId, userId) => {
    const sessions = [];
    let cursor = "0";
    do {
        const [nextCursor, keys] = await radish_1.default.scan(cursor, "MATCH", "refresh-family:*", "COUNT", 100);
        cursor = String(nextCursor);
        for (const familyKey of keys) {
            const tokenFamily = familyKey.slice("refresh-family:".length);
            const tokenHash = await radish_1.default.get(familyKey);
            if (!tokenHash)
                continue;
            const rawData = await radish_1.default.get(getTokenKey(tokenHash));
            if (!rawData)
                continue;
            const data = JSON.parse(rawData);
            if (data.tenantId !== tenantId || data.userId !== userId)
                continue;
            sessions.push({
                id: tokenFamily,
                createdAt: data.createdAt ?? null,
                lastUsedAt: data.lastUsedAt ?? data.createdAt ?? null,
            });
        }
    } while (cursor !== "0");
    return sessions.sort((left, right) => (right.lastUsedAt || 0) - (left.lastUsedAt || 0));
};
exports.listUserSessions = listUserSessions;
const revokeUserSessions = async (tenantId, userId) => {
    const sessions = await (0, exports.listUserSessions)(tenantId, userId);
    await Promise.all(sessions.map((session) => (0, exports.revokeTokenFamily)(session.id)));
    return sessions.length;
};
exports.revokeUserSessions = revokeUserSessions;
