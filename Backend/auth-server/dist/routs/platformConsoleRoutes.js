"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const express_1 = require("express");
const zod_1 = require("zod");
const database_1 = __importDefault(require("../config/database"));
const keys_1 = require("../auth/keys");
const authmidillwear_1 = require("../middleWear/authmidillwear");
const roleMiddleware_1 = require("../middleWear/roleMiddleware");
const Index_1 = require("../models/Index");
const password_1 = require("../utils/password");
const inviteService_1 = require("../invite/inviteService");
const platformConsoleService_1 = require("../service/platformConsoleService");
const router = (0, express_1.Router)();
const createTenantSchema = zod_1.z.object({
    companyName: zod_1.z.string().trim().min(2).max(150),
    slug: zod_1.z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    adminName: zod_1.z.string().trim().min(2).max(150),
    adminEmail: zod_1.z.string().trim().email().max(255).toLowerCase(),
});
router.use(authmidillwear_1.requireAuth, (0, roleMiddleware_1.requireRole)("SUPER_ADMIN"));
router.get("/tenants", async (_req, res) => {
    try {
        return res.json(await (0, platformConsoleService_1.listPlatformTenants)());
    }
    catch (error) {
        console.error("Platform tenant list failed:", error);
        return res.status(503).json({ message: "Tenant counts are temporarily unavailable." });
    }
});
router.get("/tenants/slug-availability", async (req, res) => {
    const slug = String(req.query.slug || "").trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2 || slug.length > 100) {
        return res.status(400).json({ available: false, message: "Use lowercase letters, numbers, and single hyphens." });
    }
    try {
        return res.json({ available: !(await (0, platformConsoleService_1.isTenantSlugTaken)(slug)) });
    }
    catch (error) {
        console.error("Tenant slug check failed:", error);
        return res.status(503).json({ available: false, message: "Slug availability is temporarily unavailable." });
    }
});
router.post("/tenants", async (req, res) => {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Check the company, slug, and first admin details.",
            errors: parsed.error.flatten().fieldErrors,
        });
    }
    const { companyName, slug, adminName, adminEmail } = parsed.data;
    try {
        const result = await database_1.default.transaction(async (transaction) => {
            if (await (0, platformConsoleService_1.isTenantSlugTaken)(slug, transaction)) {
                const error = new Error("This slug is already taken.");
                error.name = "TenantSlugConflictError";
                throw error;
            }
            if (await Index_1.User.findOne({ where: { email: adminEmail }, transaction })) {
                const error = new Error("This email is already registered.");
                error.name = "AdminEmailConflictError";
                throw error;
            }
            const tenant = await Index_1.Tenant.create({ name: companyName }, { transaction });
            await Index_1.TenantProfile.create({
                tenantId: tenant.id,
                crmTenantId: crypto_1.default.randomUUID(),
                slug,
                status: "ACTIVE",
                isPlatform: false,
            }, { transaction });
            const unusablePassword = crypto_1.default.randomBytes(48).toString("base64url");
            const admin = await Index_1.User.create({
                tenantId: tenant.id,
                name: adminName,
                email: adminEmail,
                passwordHash: await (0, password_1.hashPassword)(unusablePassword),
                role: "ADMIN",
            }, { transaction });
            const invite = await (0, inviteService_1.createInvite)({
                email: adminEmail,
                role: "ADMIN",
                tenantId: tenant.id,
                inviterId: req.user.userId,
                transaction,
                allowExistingUser: true,
            });
            await Index_1.SecurityEvent.create({
                actorId: req.user.userId,
                action: "TENANT_CREATED",
                resourceType: "TENANT",
                resourceId: String(tenant.id),
            }, { transaction });
            return {
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    slug,
                    status: "ACTIVE",
                    firstAdminEmail: admin.email,
                    userCount: 1,
                    propertyCount: 0,
                    createdAt: tenant.createdAt,
                },
                inviteUrl: `${process.env.FRONTEND_URL || "http://localhost:9430"}/accept-invite?token=${encodeURIComponent(invite.token)}`,
                inviteExpiresAt: invite.expiresAt,
            };
        });
        return res.status(201).json(result);
    }
    catch (error) {
        const typedError = error;
        if (typedError.name === "TenantSlugConflictError" || typedError.name === "SequelizeUniqueConstraintError") {
            return res.status(409).json({ message: "This slug is already taken." });
        }
        if (typedError.name === "AdminEmailConflictError") {
            return res.status(409).json({ message: "This email is already registered." });
        }
        console.error("Platform tenant creation failed:", error);
        return res.status(500).json({ message: "Could not create tenant and invite." });
    }
});
router.patch("/tenants/:id/status", async (req, res) => {
    const tenantId = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(tenantId) || tenantId < 1 || !["ACTIVE", "SUSPENDED"].includes(status)) {
        return res.status(400).json({ message: "Invalid tenant status." });
    }
    try {
        const profile = await Index_1.TenantProfile.findByPk(tenantId);
        const tenant = await Index_1.Tenant.findByPk(tenantId);
        if (!tenant)
            return res.status(404).json({ message: "Tenant not found." });
        if (profile)
            await profile.update({ status });
        else {
            await Index_1.TenantProfile.create({ tenantId, slug: await (0, platformConsoleService_1.createUniqueTenantSlug)(tenant.name), status, isPlatform: false });
        }
        await Index_1.SecurityEvent.create({
            actorId: req.user.userId,
            action: status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_ACTIVATED",
            resourceType: "TENANT",
            resourceId: String(tenantId),
        });
        return res.json({ id: tenantId, status });
    }
    catch (error) {
        console.error("Tenant status update failed:", error);
        return res.status(500).json({ message: "Could not update tenant status." });
    }
});
router.get("/signing-key", async (_req, res) => {
    try {
        const { publicJwk, createdAt } = await (0, keys_1.getAuthKeys)();
        return res.json({ keyId: publicJwk.kid, algorithm: publicJwk.alg, use: publicJwk.use, createdAt });
    }
    catch (error) {
        console.error("Signing key metadata failed:", error);
        return res.status(500).json({ message: "Could not load signing key metadata." });
    }
});
router.post("/signing-key/rotate", async (req, res) => {
    try {
        const { publicJwk, createdAt } = await (0, keys_1.rotateAuthKeys)();
        await Index_1.SecurityEvent.create({
            actorId: req.user.userId,
            action: "SIGNING_KEY_ROTATED",
            resourceType: "SIGNING_KEY",
            resourceId: String(publicJwk.kid),
        });
        return res.json({ keyId: publicJwk.kid, algorithm: publicJwk.alg, use: publicJwk.use, createdAt });
    }
    catch (error) {
        console.error("Signing key rotation failed:", error);
        return res.status(500).json({ message: "Could not rotate signing key." });
    }
});
router.get("/security-events", async (req, res) => {
    try {
        const limit = Number(req.query.limit || 50);
        const events = await (0, platformConsoleService_1.listSecurityEvents)(Number.isFinite(limit) ? limit : 50);
        return res.json({ events });
    }
    catch (error) {
        console.error("Security event listing failed:", error);
        return res.status(500).json({ message: "Could not load security events." });
    }
});
router.get("/suggest-slug", async (req, res) => {
    const companyName = String(req.query.companyName || "").trim();
    if (companyName.length < 2 || companyName.length > 150) {
        return res.status(400).json({ message: "Enter a company name first." });
    }
    try {
        const slug = await (0, platformConsoleService_1.createUniqueTenantSlug)(companyName);
        return res.json({ slug: slug || (0, platformConsoleService_1.slugifyTenantName)(companyName) });
    }
    catch (error) {
        console.error("Tenant slug suggestion failed:", error);
        return res.status(500).json({ message: "Could not suggest a slug." });
    }
});
exports.default = router;
