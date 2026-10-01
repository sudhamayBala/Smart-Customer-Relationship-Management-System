"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const database_1 = __importDefault(require("../config/database"));
const Index_1 = require("../models/Index");
const password_1 = require("../utils/password");
const tenantProfileSchema_1 = require("../service/tenantProfileSchema");
const bootstrapSuperAdmin = async () => {
    const name = process.env.BOOTSTRAP_SUPER_ADMIN_NAME?.trim();
    const email = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
    if (!name || name.length < 2 || name.length > 150) {
        throw new Error("Set BOOTSTRAP_SUPER_ADMIN_NAME to a valid full name.");
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Set BOOTSTRAP_SUPER_ADMIN_EMAIL to a valid email address.");
    }
    if (!password || password.length < 16 || password.length > 100 ||
        !/[a-z]/.test(password) || !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        throw new Error("Use a 16-100 character password with uppercase, lowercase, number, and symbol.");
    }
    await database_1.default.authenticate();
    await database_1.default.sync();
    await (0, tenantProfileSchema_1.ensureTenantProfileSchema)();
    const existingSuperAdmin = await Index_1.User.findOne({ where: { role: "SUPER_ADMIN" } });
    if (existingSuperAdmin) {
        throw new Error("A SUPER_ADMIN already exists; bootstrap is one-time only.");
    }
    const existingUser = await Index_1.User.findOne({ where: { email } });
    if (existingUser) {
        throw new Error("That email is already registered. Choose a new platform-admin email.");
    }
    await database_1.default.transaction(async (transaction) => {
        const tenant = await Index_1.Tenant.create({ name: "PropFlow Platform" }, { transaction });
        await Index_1.TenantProfile.create({
            tenantId: tenant.id,
            crmTenantId: null,
            slug: `platform-${crypto_1.default.randomUUID()}`,
            status: "ACTIVE",
            isPlatform: true,
        }, { transaction });
        const user = await Index_1.User.create({
            tenantId: tenant.id,
            name,
            email,
            passwordHash: await (0, password_1.hashPassword)(password),
            role: "SUPER_ADMIN",
        }, { transaction });
        await Index_1.SecurityEvent.create({
            actorId: user.id,
            action: "SUPER_ADMIN_BOOTSTRAPPED",
            resourceType: "PLATFORM",
            resourceId: String(tenant.id),
        }, { transaction });
    });
    console.log(`Initial SUPER_ADMIN account created for ${email}.`);
};
bootstrapSuperAdmin()
    .catch((error) => {
    console.error(error instanceof Error ? error.message : "Super-admin bootstrap failed.");
    process.exitCode = 1;
})
    .finally(async () => {
    await database_1.default.close();
});
