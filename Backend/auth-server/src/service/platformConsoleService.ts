import mysql from "mysql2/promise";
import { Op, Transaction } from "sequelize";
import { SecurityEvent, Tenant, TenantProfile, User } from "../models/Index";

const crmPool = mysql.createPool({
  host: process.env.CRM_DB_HOST || process.env.DB_HOST || "localhost",
  port: Number(process.env.CRM_DB_PORT || process.env.DB_PORT || 3306),
  database: process.env.CRM_DB_NAME || "crm",
  user: process.env.CRM_DB_USER || process.env.DB_USER || "root",
  password: process.env.CRM_DB_PASSWORD ?? process.env.DB_PASSWORD ?? "",
  waitForConnections: true,
  connectionLimit: 3,
});

export const slugifyTenantName = (value: string) => {
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

export const isTenantSlugTaken = async (
  slug: string,
  transaction?: Transaction
) => {
  const profile = await TenantProfile.findOne({
    where: { slug },
    transaction,
  });
  if (profile) return true;

  const [tenants, profiles] = await Promise.all([
    Tenant.findAll({ attributes: ["id", "name"], transaction }),
    TenantProfile.findAll({ attributes: ["tenantId"], transaction }),
  ]);
  const profiledIds = new Set(profiles.map((item) => item.tenantId));

  return tenants.some(
    (tenant) =>
      !profiledIds.has(tenant.id) && slugifyTenantName(tenant.name) === slug
  );
};

export const createUniqueTenantSlug = async (
  name: string,
  transaction?: Transaction
) => {
  const base = slugifyTenantName(name).slice(0, 80);
  let slug = base;
  let suffix = 2;

  while (await isTenantSlugTaken(slug, transaction)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

const getPropertyCounts = async (crmTenantIds: string[]) => {
  if (!crmTenantIds.length) return new Map<string, number>();

  const placeholders = crmTenantIds.map(() => "?").join(", ");
  const [rows] = await crmPool.execute(
    `SELECT tenant_id AS tenantId, COUNT(*) AS propertyCount
     FROM properties
     WHERE tenant_id IN (${placeholders}) AND deleted_at IS NULL
     GROUP BY tenant_id`,
    crmTenantIds
  );

  return new Map(
    (rows as Array<{ tenantId: string; propertyCount: number | string }>).map(
      (row) => [row.tenantId, Number(row.propertyCount)]
    )
  );
};

export const listPlatformTenants = async () => {
  const allTenants = await Tenant.findAll({
    attributes: ["id", "name", "createdAt"],
    order: [["createdAt", "DESC"]],
  });
  const platformProfiles = await TenantProfile.findAll({
    where: { isPlatform: true },
    attributes: ["tenantId"],
  });
  const platformTenantIds = new Set(platformProfiles.map((profile) => profile.tenantId));
  const tenants = allTenants.filter((tenant) => !platformTenantIds.has(tenant.id));
  const tenantIds = tenants.map((tenant) => tenant.id);
  const profiles = await (tenantIds.length
    ? TenantProfile.findAll({ where: { tenantId: { [Op.in]: tenantIds } } })
    : Promise.resolve([]));
  const propertyCounts = await getPropertyCounts(
    profiles.map((profile) => profile.crmTenantId).filter((id): id is string => Boolean(id))
  );
  const profileByTenantId = new Map(profiles.map((profile) => [profile.tenantId, profile]));

  const rows = await Promise.all(tenants.map(async (tenant) => {
    const [userCount, firstAdmin] = await Promise.all([
      User.count({ where: { tenantId: tenant.id } }),
      User.findOne({
        where: { tenantId: tenant.id, role: "ADMIN" },
        attributes: ["email"],
        order: [["createdAt", "ASC"]],
      }),
    ]);
    const profile = profileByTenantId.get(tenant.id);

    return {
      id: tenant.id,
      name: tenant.name,
      slug: profile?.slug || `${slugifyTenantName(tenant.name).slice(0, 84)}-${tenant.id}`,
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

export const listSecurityEvents = async (limit = 50) =>
  SecurityEvent.findAll({
    attributes: ["id", "action", "resourceType", "createdAt"],
    order: [["createdAt", "DESC"]],
    limit: Math.min(100, Math.max(1, Math.floor(limit))),
  });