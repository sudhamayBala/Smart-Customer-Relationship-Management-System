"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const sequelize_1 = require("sequelize");
const Index_1 = require("../models/Index");
const password_1 = require("../utils/password");
const authValidator_1 = require("../validators/authValidator");
const Token_1 = require("../auth/Token");
const keys_1 = require("../auth/keys");
const database_1 = __importDefault(require("../config/database"));
const authmidillwear_1 = require("../middleWear/authmidillwear");
const roleMiddleware_1 = require("../middleWear/roleMiddleware");
const platformConsoleRoutes_1 = __importDefault(require("./platformConsoleRoutes"));
const platformConsoleService_1 = require("../service/platformConsoleService");
const refreshTokenServise_1 = require("../auth/refreshTokenServise");
const Invite_1 = __importDefault(require("../invite/Invite"));
const LoginLogoutService_1 = require("../service/LoginLogoutService");
const inviteService_1 = require("../invite/inviteService");
const router = (0, express_1.Router)();
const withTenantAdminLock = async (tenantId, operation) => database_1.default.transaction(async (transaction) => {
    await Index_1.Tenant.findByPk(tenantId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    });
    return operation(transaction);
});
router.use("/platform", platformConsoleRoutes_1.default);
/**
 * POST /api/auth/signup
 */
router.post("/signup", async (req, res) => {
    try {
        const result = authValidator_1.signupSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }
        const { companyName, name, email, password } = result.data;
        const existingUser = await Index_1.User.findOne({
            where: { email },
        });
        if (existingUser) {
            return res.status(409).json({
                message: "Email is already registered",
            });
        }
        const passwordHash = await (0, password_1.hashPassword)(password);
        const user = await database_1.default.transaction(async (transaction) => {
            const slug = await (0, platformConsoleService_1.createUniqueTenantSlug)(companyName, transaction);
            const tenant = await Index_1.Tenant.create({ name: companyName }, { transaction });
            await Index_1.TenantProfile.create({
                tenantId: tenant.id,
                crmTenantId: crypto_1.default.randomUUID(),
                slug,
                status: "ACTIVE",
                isPlatform: false,
            }, { transaction });
            return Index_1.User.create({
                tenantId: tenant.id,
                name,
                email,
                passwordHash,
                role: "ADMIN",
            }, { transaction });
        });
        return res.status(201).json({
            message: "Signup successful",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
            },
        });
    }
    catch (error) {
        console.error("Signup error:", error);
        return res.status(500).json({
            message: "Unable to create account",
        });
    }
});
/**
 * POST /api/auth/login
 */
router.post("/login", async (req, res) => {
    try {
        const result = authValidator_1.loginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: result.error.flatten().fieldErrors,
            });
        }
        const { email, password } = result.data;
        // Check whether this email is currently locked
        const locked = await (0, LoginLogoutService_1.isLoginLocked)(email);
        if (locked) {
            const retryAfter = await (0, LoginLogoutService_1.getRetryAfterSeconds)(email);
            return res
                .set("Retry-After", String(Math.max(retryAfter, 0)))
                .status(429)
                .json({
                message: "Too many attempts. Please try again later.",
                remainingAttempts: 0,
                retryAfter: Math.max(retryAfter, 0),
            });
        }
        const user = await Index_1.User.findOne({
            where: { email },
        });
        // User does not exist
        if (!user) {
            const attempts = await (0, LoginLogoutService_1.recordFailedLogin)(email);
            const remainingAttempts = Math.max(0, 5 - attempts);
            if (attempts >= 5) {
                const retryAfter = await (0, LoginLogoutService_1.getRetryAfterSeconds)(email);
                return res
                    .set("Retry-After", String(Math.max(retryAfter, 0)))
                    .status(429)
                    .json({
                    message: "Too many attempts. Please try again later.",
                    remainingAttempts: 0,
                    retryAfter: Math.max(retryAfter, 0),
                });
            }
            return res.status(401).json({
                message: "Wrong email or password.",
                remainingAttempts,
            });
        }
        const tenantProfile = await Index_1.TenantProfile.findByPk(user.tenantId);
        if (tenantProfile?.status === "SUSPENDED") {
            return res.status(403).json({ message: "This workspace is suspended." });
        }
        if (user.status === "DEACTIVATED") {
            return res.status(403).json({ message: "This account is deactivated." });
        }
        const passwordValid = await (0, password_1.comparePassword)(password, user.passwordHash);
        // Wrong password
        if (!passwordValid) {
            const attempts = await (0, LoginLogoutService_1.recordFailedLogin)(email);
            const remainingAttempts = Math.max(0, 5 - attempts);
            if (attempts >= 5) {
                const retryAfter = await (0, LoginLogoutService_1.getRetryAfterSeconds)(email);
                return res
                    .set("Retry-After", String(Math.max(retryAfter, 0)))
                    .status(429)
                    .json({
                    message: "Too many attempts. Please try again later.",
                    remainingAttempts: 0,
                    retryAfter: Math.max(retryAfter, 0),
                });
            }
            return res.status(401).json({
                message: "Wrong email or password.",
                remainingAttempts,
            });
        }
        // Successful login - clear failed attempts
        await (0, LoginLogoutService_1.clearFailedLogins)(email);
        await user.update({ lastLoginAt: new Date() });
        // Create short-lived access token
        const accessToken = await (0, Token_1.createAccessToken)({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        });
        // Create refresh token
        const refreshToken = await (0, refreshTokenServise_1.createRefreshToken)({
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
        });
        return res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken: refreshToken.token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
            message: "Unable to login",
        });
    }
});
/**
 * GET /api/auth/me
 */
router.get("/me", authmidillwear_1.requireAuth, async (req, res) => {
    try {
        const user = await Index_1.User.findByPk(req.user.userId, {
            attributes: [
                "id",
                "tenantId",
                "name",
                "email",
                "role",
                "createdAt",
            ],
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.json({
            user,
        });
    }
    catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            message: "Unable to get current user",
        });
    }
});
/**
 * GET /api/auth/admin-test
 */
router.get("/admin-test", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN", "SUPER_ADMIN"), (_req, res) => {
    return res.json({
        message: "Admin authorization successful",
    });
});
/**
 * GET /api/auth/health
 */
router.get("/health", (_req, res) => {
    return res.status(200).json({
        status: "ok",
        service: "auth-server",
        timestamp: new Date().toISOString(),
    });
});
/**
 * POST /api/auth/keys/rotate
 */
router.post("/keys/rotate", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN", "SUPER_ADMIN"), async (_req, res) => {
    try {
        const keySet = await (0, keys_1.rotateAuthKeys)();
        return res.status(200).json({
            message: "RSA signing key rotated",
            keyId: keySet.publicJwk.kid,
        });
    }
    catch (error) {
        console.error("Key rotation error:", error);
        return res.status(500).json({
            message: "Unable to rotate signing key",
        });
    }
});
/**
 * POST /api/auth/logout
 */
router.post("/logout", authmidillwear_1.requireAuth, async (req, res) => {
    try {
        const refreshToken = req.body?.refreshToken;
        if (typeof refreshToken === "string") {
            await (0, refreshTokenServise_1.deleteRefreshToken)(refreshToken);
        }
        return res.status(200).json({
            message: "Logout successful",
        });
    }
    catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({
            message: "Unable to logout",
        });
    }
});
/**
 * POST /api/auth/logout-all
 */
router.post("/logout-all", authmidillwear_1.requireAuth, async (req, res) => {
    try {
        const refreshToken = req.body?.refreshToken;
        if (typeof refreshToken !== "string") {
            return res.status(400).json({
                message: "Refresh token is required",
            });
        }
        const storedToken = await (0, refreshTokenServise_1.getRefreshTokenData)(refreshToken);
        if (!storedToken) {
            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }
        await (0, refreshTokenServise_1.revokeTokenFamily)(storedToken.data.tokenFamily);
        return res.status(200).json({
            message: "All sessions for this token family were revoked",
        });
    }
    catch (error) {
        console.error("Logout all error:", error);
        return res.status(500).json({
            message: "Unable to revoke all sessions",
        });
    }
});
router.get("/users", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const users = await Index_1.User.findAll({
        where: { tenantId: req.user.tenantId },
        attributes: ["id", "name", "email", "role", "status", "lastLoginAt", "createdAt"],
        order: [["createdAt", "ASC"]],
    });
    const activeCount = users.filter((user) => user.status === "ACTIVE").length;
    const pendingInvites = await Invite_1.default.count({
        where: {
            tenantId: req.user.tenantId,
            status: "PENDING",
            expiresAt: { [sequelize_1.Op.gt]: new Date() },
        },
    });
    return res.json({
        users,
        totals: {
            users: users.length,
            active: activeCount,
            pendingInvites,
            deactivated: users.length - activeCount,
        },
    });
});
router.get("/invites", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const invites = await Invite_1.default.findAll({
        where: { tenantId: req.user.tenantId, status: "PENDING" },
        attributes: ["id", "email", "role", "token", "expiresAt", "createdAt"],
        order: [["createdAt", "DESC"]],
    });
    const now = Date.now();
    const activeInvites = [];
    for (const invite of invites) {
        if (invite.expiresAt.getTime() <= now) {
            await invite.update({ status: "EXPIRED" });
        }
        else {
            activeInvites.push(invite);
        }
    }
    return res.json({
        invites: activeInvites.map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            token: invite.token,
            expiresAt: invite.expiresAt,
        })),
    });
});
router.patch("/users/:id/role", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const userId = Number(req.params.id);
    const role = req.body?.role;
    if (!Number.isInteger(userId) || userId < 1 || !["ADMIN", "MANAGER", "AGENT"].includes(role)) {
        return res.status(400).json({ message: "Invalid user or role." });
    }
    const tenantId = req.user.tenantId;
    const result = await withTenantAdminLock(tenantId, async (transaction) => {
        const target = await Index_1.User.findOne({
            where: { id: userId, tenantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!target || target.role === "SUPER_ADMIN")
            return { status: 404 };
        if (target.role === "ADMIN" && target.status === "ACTIVE" && role !== "ADMIN") {
            const activeAdmins = await Index_1.User.count({
                where: { tenantId, role: "ADMIN", status: "ACTIVE" },
                transaction,
            });
            if (activeAdmins <= 1)
                return { status: 422 };
        }
        const changed = target.role !== role;
        if (changed) {
            await target.update({ role }, { transaction });
            await Index_1.SecurityEvent.create({
                actorId: req.user.userId,
                action: "USER_ROLE_CHANGED",
                resourceType: "USER",
                resourceId: String(target.id),
            }, { transaction });
        }
        return { status: 200, changed, id: target.id, role: target.role, userStatus: target.status };
    });
    if (result.status !== 200) {
        return res.status(result.status).json({
            message: result.status === 422 ? "The last active Admin cannot be demoted." : "User not found.",
        });
    }
    if (result.changed)
        await (0, refreshTokenServise_1.revokeUserSessions)(tenantId, result.id);
    return res.json({ user: { id: result.id, role: result.role, status: result.userStatus } });
});
router.patch("/users/:id/status", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const userId = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(userId) || userId < 1 || !["ACTIVE", "DEACTIVATED"].includes(status)) {
        return res.status(400).json({ message: "Invalid user or status." });
    }
    const tenantId = req.user.tenantId;
    const result = await withTenantAdminLock(tenantId, async (transaction) => {
        const target = await Index_1.User.findOne({
            where: { id: userId, tenantId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!target || target.role === "SUPER_ADMIN")
            return { status: 404 };
        if (target.role === "ADMIN" && target.status === "ACTIVE" && status === "DEACTIVATED") {
            const activeAdmins = await Index_1.User.count({
                where: { tenantId, role: "ADMIN", status: "ACTIVE" },
                transaction,
            });
            if (activeAdmins <= 1)
                return { status: 422 };
        }
        const changed = target.status !== status;
        if (changed) {
            await target.update({ status }, { transaction });
            await Index_1.SecurityEvent.create({
                actorId: req.user.userId,
                action: status === "DEACTIVATED" ? "USER_DEACTIVATED" : "USER_REACTIVATED",
                resourceType: "USER",
                resourceId: String(target.id),
            }, { transaction });
        }
        return { status: 200, changed, id: target.id, role: target.role, userStatus: target.status };
    });
    if (result.status !== 200) {
        return res.status(result.status).json({
            message: result.status === 422 ? "The last active Admin cannot be deactivated." : "User not found.",
        });
    }
    if (result.changed && status === "DEACTIVATED")
        await (0, refreshTokenServise_1.revokeUserSessions)(tenantId, result.id);
    return res.json({ user: { id: result.id, role: result.role, status: result.userStatus } });
});
router.get("/users/:id/sessions", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const userId = Number(req.params.id);
    const target = await Index_1.User.findOne({
        where: { id: userId, tenantId: req.user.tenantId },
        attributes: ["id"],
    });
    if (!target)
        return res.status(404).json({ message: "User not found." });
    return res.json({ sessions: await (0, refreshTokenServise_1.listUserSessions)(req.user.tenantId, target.id) });
});
router.post("/users/:id/sessions/revoke", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    const userId = Number(req.params.id);
    const target = await Index_1.User.findOne({
        where: { id: userId, tenantId: req.user.tenantId },
        attributes: ["id"],
    });
    if (!target)
        return res.status(404).json({ message: "User not found." });
    const revoked = await (0, refreshTokenServise_1.revokeUserSessions)(req.user.tenantId, target.id);
    return res.json({ revoked });
});
/**
 * POST /api/auth/invite
 */
router.post("/invite", authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("ADMIN"), async (req, res) => {
    try {
        const { email, role } = req.body ?? {};
        if (!email || typeof email !== "string") {
            return res.status(400).json({
                message: "Invite email is required",
            });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({ message: "Invite email is invalid." });
        }
        const inviteRole = role ?? "AGENT";
        if (!["ADMIN", "MANAGER", "AGENT"].includes(inviteRole)) {
            return res.status(400).json({ message: "Invite role is invalid." });
        }
        const invite = await (0, inviteService_1.createInvite)({
            email,
            role: inviteRole,
            tenantId: req.user.tenantId,
            inviterId: req.user.userId,
        });
        return res.status(201).json({
            message: "Invite created successfully",
            invite,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes("already exists")) {
            return res.status(409).json({ message: error.message });
        }
        console.error("Invite creation error:", error);
        return res.status(500).json({
            message: "Unable to create invite",
        });
    }
});
/**
 * POST /api/auth/invite/accept
 */
router.post("/invite/accept", async (req, res) => {
    try {
        const { token, name, password } = req.body ?? {};
        if (!token || typeof token !== "string") {
            return res.status(400).json({
                message: "Invite token is required",
            });
        }
        const invite = await (0, inviteService_1.validateInviteToken)(token);
        if (!invite) {
            return res.status(401).json({
                message: "Invalid or expired invite token",
            });
        }
        if ((name !== undefined && (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150)) ||
            (password !== undefined && (typeof password !== "string" || password.length < 8 || password.length > 100))) {
            return res.status(400).json({ message: "Name or password is invalid." });
        }
        const result = await (0, inviteService_1.acceptInvite)(token, { name, password });
        if (!result) {
            return res.status(400).json({
                message: "Unable to accept invite",
            });
        }
        return res.status(200).json({
            message: "Invite accepted successfully",
            invite: result,
        });
    }
    catch (error) {
        console.error("Invite acceptance error:", error);
        return res.status(500).json({
            message: "Unable to accept invite",
        });
    }
});
router.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken || typeof refreshToken !== "string") {
            return res.status(400).json({
                message: "Refresh token is required",
            });
        }
        const storedToken = await (0, refreshTokenServise_1.getRefreshTokenData)(refreshToken);
        if (!storedToken) {
            return res.status(401).json({
                message: "Invalid or expired refresh token",
            });
        }
        if (storedToken.reused) {
            await (0, refreshTokenServise_1.revokeTokenFamily)(storedToken.data.tokenFamily);
            return res.status(401).json({
                message: "Refresh token reuse detected. Session revoked.",
            });
        }
        const { data } = storedToken;
        const user = await Index_1.User.findOne({
            where: { id: data.userId, tenantId: data.tenantId },
        });
        const tenantProfile = await Index_1.TenantProfile.findByPk(data.tenantId);
        if (!user || user.status === "DEACTIVATED" || tenantProfile?.status === "SUSPENDED") {
            await (0, refreshTokenServise_1.revokeTokenFamily)(data.tokenFamily);
            return res.status(401).json({ message: "This account can no longer refresh sessions." });
        }
        await (0, refreshTokenServise_1.deleteRefreshToken)(refreshToken);
        const accessToken = await (0, Token_1.createAccessToken)({
            userId: data.userId,
            tenantId: data.tenantId,
            role: data.role,
        });
        const newRefreshToken = await (0, refreshTokenServise_1.createRefreshToken)({
            userId: data.userId,
            tenantId: data.tenantId,
            role: user.role,
            tokenFamily: data.tokenFamily,
            createdAt: data.createdAt,
            lastUsedAt: Date.now(),
        });
        return res.status(200).json({
            message: "Token refreshed successfully",
            accessToken,
            refreshToken: newRefreshToken.token,
        });
    }
    catch (error) {
        console.error("Refresh token error:", error);
        return res.status(500).json({
            message: "Unable to refresh token",
        });
    }
});
exports.default = router;
