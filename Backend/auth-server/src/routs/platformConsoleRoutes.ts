import crypto from "crypto";
import { Router, Response } from "express";
import { z } from "zod";
import sequelize from "../config/database";
import { rotateAuthKeys, getAuthKeys } from "../auth/keys";
import { AuthenticatedRequest, requireAuth } from "../middleWear/authmidillwear";
import { requireRole } from "../middleWear/roleMiddleware";
import { SecurityEvent, Tenant, TenantProfile, User } from "../models/Index";
import { hashPassword } from "../utils/password";
import { createInvite } from "../invite/inviteService";
import {
  createUniqueTenantSlug,
  isTenantSlugTaken,
  listPlatformTenants,
  listSecurityEvents,
  slugifyTenantName,
} from "../service/platformConsoleService";

const router = Router();

const createTenantSchema = z.object({
  companyName: z.string().trim().min(2).max(150),
  slug: z.string().trim().toLowerCase().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  adminName: z.string().trim().min(2).max(150),
  adminEmail: z.string().trim().email().max(255).toLowerCase(),
});

router.use(requireAuth, requireRole("SUPER_ADMIN"));

router.get("/tenants", async (_req, res) => {
  try {
    return res.json(await listPlatformTenants());
  } catch (error) {
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
    return res.json({ available: !(await isTenantSlugTaken(slug)) });
  } catch (error) {
    console.error("Tenant slug check failed:", error);
    return res.status(503).json({ available: false, message: "Slug availability is temporarily unavailable." });
  }
});

router.post("/tenants", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Check the company, slug, and first admin details.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  const { companyName, slug, adminName, adminEmail } = parsed.data;
  try {
    const result = await sequelize.transaction(async (transaction) => {
      if (await isTenantSlugTaken(slug, transaction)) {
        const error = new Error("This slug is already taken.");
        error.name = "TenantSlugConflictError";
        throw error;
      }

      if (await User.findOne({ where: { email: adminEmail }, transaction })) {
        const error = new Error("This email is already registered.");
        error.name = "AdminEmailConflictError";
        throw error;
      }

      const tenant = await Tenant.create({ name: companyName }, { transaction });
      await TenantProfile.create({
        tenantId: tenant.id,
        crmTenantId: crypto.randomUUID(),
        slug,
        status: "ACTIVE",
        isPlatform: false,
      }, { transaction });

      const unusablePassword = crypto.randomBytes(48).toString("base64url");
      const admin = await User.create({
        tenantId: tenant.id,
        name: adminName,
        email: adminEmail,
        passwordHash: await hashPassword(unusablePassword),
        role: "ADMIN",
      }, { transaction });

      const invite = await createInvite({
        email: adminEmail,
        role: "ADMIN",
        tenantId: tenant.id,
        inviterId: req.user!.userId,
        transaction,
        allowExistingUser: true,
      });

      await SecurityEvent.create({
        actorId: req.user!.userId,
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
  } catch (error) {
    const typedError = error as Error;
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

router.patch("/tenants/:id/status", async (req: AuthenticatedRequest, res: Response) => {
  const tenantId = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(tenantId) || tenantId < 1 || !["ACTIVE", "SUSPENDED"].includes(status)) {
    return res.status(400).json({ message: "Invalid tenant status." });
  }

  try {
    const profile = await TenantProfile.findByPk(tenantId);
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ message: "Tenant not found." });

    if (profile) await profile.update({ status });
    else {
      await TenantProfile.create({ tenantId, slug: await createUniqueTenantSlug(tenant.name), status, isPlatform: false });
    }

    await SecurityEvent.create({
      actorId: req.user!.userId,
      action: status === "SUSPENDED" ? "TENANT_SUSPENDED" : "TENANT_ACTIVATED",
      resourceType: "TENANT",
      resourceId: String(tenantId),
    });

    return res.json({ id: tenantId, status });
  } catch (error) {
    console.error("Tenant status update failed:", error);
    return res.status(500).json({ message: "Could not update tenant status." });
  }
});

router.get("/signing-key", async (_req, res) => {
  try {
    const { publicJwk, createdAt } = await getAuthKeys();
    return res.json({ keyId: publicJwk.kid, algorithm: publicJwk.alg, use: publicJwk.use, createdAt });
  } catch (error) {
    console.error("Signing key metadata failed:", error);
    return res.status(500).json({ message: "Could not load signing key metadata." });
  }
});

router.post("/signing-key/rotate", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { publicJwk, createdAt } = await rotateAuthKeys();
    await SecurityEvent.create({
      actorId: req.user!.userId,
      action: "SIGNING_KEY_ROTATED",
      resourceType: "SIGNING_KEY",
      resourceId: String(publicJwk.kid),
    });
    return res.json({ keyId: publicJwk.kid, algorithm: publicJwk.alg, use: publicJwk.use, createdAt });
  } catch (error) {
    console.error("Signing key rotation failed:", error);
    return res.status(500).json({ message: "Could not rotate signing key." });
  }
});

router.get("/security-events", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const events = await listSecurityEvents(Number.isFinite(limit) ? limit : 50);
    return res.json({ events });
  } catch (error) {
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
    const slug = await createUniqueTenantSlug(companyName);
    return res.json({ slug: slug || slugifyTenantName(companyName) });
  } catch (error) {
    console.error("Tenant slug suggestion failed:", error);
    return res.status(500).json({ message: "Could not suggest a slug." });
  }
});

export default router;