"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSecurityEvents = exports.listPlatformTenants = exports.createUniqueTenantSlug = exports.isTenantSlugTaken = exports.slugifyTenantName = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const sequelize_1 = require("sequelize");
const Index_1 = require("../models/Index");
const crmPool = promise_1.default.createPool({
    host: process.env.CRM_DB_HOST || process.env.DB_HOST || "localhost",
    port: Number(process.env.CRM_DB_PORT || process.env.DB_PORT || 3306),
    database: process.env.CRM_DB_NAME || "crm",
    user: process.env.CRM_DB_USER || process.env.DB_USER || "root",
    password: process.env.CRM_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
    waitForConnections: true,
    connectionLimit: 3,
});
const slugifyTenantName = (value) => {
    const slug = value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 90)
        .replace(/-+$/g, "");
    return slug || "tenant";
};
exports.slugifyTenantName = slugifyTenantName;
const isTenantSlugTaken = async (slug, transaction) => {
    const profile = await Index_1.TenantProfile.findOne({
        where: { slug },
        transaction,
    });
    if (profile)
        return true;
    const [tenants, profiles] = await Promise.all([
        Index_1.Tenant.findAll({ attributes: ["id", "name"], transaction }),
        Index_1.TenantProfile.findAll({ attributes: ["tenantId"], transaction }),
    ]);
    const profiledIds = new Set(profiles.map((item) => item.tenantId));
    return tenants.some((tenant) => !profiledIds.has(tenant.id) && (0, exports.slugifyTenantName)(tenant.name) === slug);
};
exports.isTenantSlugTaken = isTenantSlugTaken;
const createUniqueTenantSlug = async (name, transaction) => {
    const base = (0, exports.slugifyTenantName)(name).slice(0, 80);
    let slug = base;
    let suffix = 2;
    while (await (0, exports.isTenantSlugTaken)(slug, transaction)) {
        slug = `${base}-${suffix}`;
        suffix += 1;
    }
    return slug;
};
exports.createUniqueTenantSlug = createUniqueTenantSlug;
const getPropertyCounts = async (crmTenantIds) => {
    if (!crmTenantIds.length)
        return new Map();
    const placeholders = crmTenantIds.map(() => "?").join(", ");
    const [rows] = await crmPool.execute(`SELECT tenant_id AS tenantId, COUNT(*) AS propertyCount
     FROM properties
     WHERE tenant_id IN (${placeholders}) AND deleted_at IS NULL
     GROUP BY tenant_id`, crmTenantIds);
    return new Map(rows.map((row) => [row.tenantId, Number(row.propertyCount)]));
};
const listPlatformTenants = async () => {
    const allTenants = await Index_1.Tenant.findAll({
        attributes: ["id", "name", "createdAt"],
        order: [["createdAt", "DESC"]],
    });
    const platformProfiles = await Index_1.TenantProfile.findAll({
        where: { isPlatform: true },
        attributes: ["tenantId"],
    });
    const platformTenantIds = new Set(platformProfiles.map((profile) => profile.tenantId));
    const tenants = allTenants.filter((tenant) => !platformTenantIds.has(tenant.id));
    const tenantIds = tenants.map((tenant) => tenant.id);
    const profiles = await (tenantIds.length
        ? Index_1.TenantProfile.findAll({ where: { tenantId: { [sequelize_1.Op.in]: tenantIds } } })
        : Promise.resolve([]));
    const propertyCounts = await getPropertyCounts(profiles.map((profile) => profile.crmTenantId).filter((id) => Boolean(id)));
    const profileByTenantId = new Map(profiles.map((profile) => [profile.tenantId, profile]));
    const rows = await Promise.all(tenants.map(async (tenant) => {
        const [userCount, firstAdmin] = await Promise.all([
            Index_1.User.count({ where: { tenantId: tenant.id } }),
            Index_1.User.findOne({
                where: { tenantId: tenant.id, role: "ADMIN" },
                attributes: ["email"],
                order: [["createdAt", "ASC"]],
            }),
        ]);
        const profile = profileByTenantId.get(tenant.id);
        return {
            id: tenant.id,
            name: tenant.name,
            slug: profile?.slug || `${(0, exports.slugifyTenantName)(tenant.name).slice(0, 84)}-${tenant.id}`,
            status: profile?.status || "ACTIVE",
            firstAdminEmail: firstAdmin?.email || "—",
            userCount,
            propertyCount: profile?.crmTenantId ? propertyCounts.get(profile.crmTenantId) || 0 : null,
            createdAt: tenant.createdAt,
        };
    }));
    return {
        tenants: rows,
        totals: {
            tenants: rows.length,
            active: rows.filter((tenant) => tenant.status === "ACTIVE").length,
            suspended: rows.filter((tenant) => tenant.status === "SUSPENDED").length,
            users: rows.reduce((total, tenant) => total + tenant.userCount, 0),
            properties: rows.every((tenant) => tenant.propertyCount !== null)
                ? rows.reduce((total, tenant) => total + (tenant.propertyCount || 0), 0)
                : null,
            mappedPropertyTenants: rows.filter((tenant) => tenant.propertyCount !== null).length,
        },
    };
};
exports.listPlatformTenants = listPlatformTenants;
const listSecurityEvents = async (limit = 50) => Index_1.SecurityEvent.findAll({
    attributes: ["id", "action", "resourceType", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: Math.min(100, Math.max(1, Math.floor(limit))),
});
exports.listSecurityEvents = listSecurityEvents;
