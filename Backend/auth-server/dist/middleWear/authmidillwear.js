"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jose_1 = require("jose");
const keys_1 = require("../auth/keys");
const requireAuth = async (req, res, next) => {
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
        const { publicKey } = await (0, keys_1.getAuthKeys)();
        const { payload } = await (0, jose_1.jwtVerify)(token, publicKey, {
            issuer: "propflow-auth",
            audience: "propflow-api",
        });
        if (typeof payload.userId !== "number" ||
            typeof payload.tenantId !== "number" ||
            typeof payload.role !== "string") {
            return res.status(401).json({
                message: "Invalid token payload",
            });
        }
        req.user = {
            userId: payload.userId,
            tenantId: payload.tenantId,
            role: payload.role,
        };
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        return res.status(401).json({
            message: "Invalid or expired access token",
        });
    }
};
exports.requireAuth = requireAuth;
