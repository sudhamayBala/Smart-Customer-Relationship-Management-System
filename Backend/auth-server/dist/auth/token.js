"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccessToken = void 0;
const jose_1 = require("jose");
const keys_1 = require("./keys");
const TenantProfile_1 = __importDefault(require("../models/TenantProfile"));
const createAccessToken = async (payload) => {
    const { privateKey, publicJwk } = await (0, keys_1.getAuthKeys)();
    const tenantProfile = await TenantProfile_1.default.findByPk(payload.tenantId);
    return new jose_1.SignJWT({
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
exports.createAccessToken = createAccessToken;
