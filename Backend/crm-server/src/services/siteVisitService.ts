import { Op } from "sequelize";
import Property from "../models/Property";
import SiteVisit from "../models/SiteVisit";
import User from "../models/User";

interface SiteVisitFilters {
  page?: number;
  limit?: number;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  propertyId?: string;
  agentId?: string;
  userId?: string;
  role?: string;
  from?: Date;
  to?: Date;
}

interface CreateSiteVisitData {
  tenantId: string;
  userId?: string;
  role?: string;
  propertyId: string;
  agentId: string;
  clientName: string;
  clientPhone?: string | null;
  scheduledAt: Date;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
}

interface UpdateSiteVisitData {
  clientName?: string;
  clientPhone?: string | null;
  scheduledAt?: Date;
  status?: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  notes?: string | null;
}

const createSiteVisit = async (data: CreateSiteVisitData) => {
  const propertyWhere: Record<string, unknown> = {
    id: data.propertyId,
    tenantId: data.tenantId,
  };
  if (data.role === "AGENT" && data.userId) {
    propertyWhere.assigneeId = data.userId;
  }
  const property = await Property.findOne({ where: propertyWhere });

  if (!property) {
    const error = new Error("Property not found for this tenant.");
    error.name = data.role === "AGENT" ? "ForbiddenError" : "NotFoundError";
    throw error;
  }

  return SiteVisit.create({
    tenantId: data.tenantId,
    propertyId: data.propertyId,
    agentId: data.agentId,
    clientName: data.clientName,
    clientPhone: data.clientPhone || null,
    scheduledAt: data.scheduledAt,
    status: data.status || "SCHEDULED",
    notes: data.notes || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const getSiteVisits = async (
  tenantId: string,
  filters: SiteVisitFilters = {}
) => {
  const where: Record<string, unknown> = {
    tenantId,
  };
  const page = Number.isInteger(filters.page) && Number(filters.page) > 0
    ? Number(filters.page)
    : 1;
  const requestedLimit = Number.isInteger(filters.limit) ? Number(filters.limit) : 25;
  const limit = Math.min(100, Math.max(1, requestedLimit));

  if (filters.propertyId) {
    where.propertyId = filters.propertyId;
  }

  if (filters.role === "AGENT" && filters.userId) {
    where.agentId = filters.userId;
  } else if (filters.agentId) {
    where.agentId = filters.agentId;
  }

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.from || filters.to) {
    where.scheduledAt = {
      ...(filters.from ? { [Op.gte]: filters.from } : {}),
      ...(filters.to ? { [Op.lt]: filters.to } : {}),
    };
  }

  const result = await SiteVisit.findAndCountAll({
    where,
    order: [["scheduledAt", "ASC"]],
    limit,
    offset: (page - 1) * limit,
  });

  const propertyIds = [...new Set(result.rows.map((visit) => visit.propertyId))];
  const agentIds = [...new Set(result.rows.map((visit) => visit.agentId))];
  const [properties, agents] = await Promise.all([
    propertyIds.length
      ? Property.findAll({
          where: { tenantId, id: { [Op.in]: propertyIds } },
          attributes: ["id", "title", "locality", "buildingName", "unitNo"],
        })
      : [],
    agentIds.length
      ? User.findAll({
          where: { tenantId, id: { [Op.in]: agentIds } },
          attributes: ["id", "name"],
        })
      : [],
  ]);
  const propertyById = new Map(properties.map((property) => [property.id, property]));
  const agentById = new Map(agents.map((agent) => [agent.id, agent.name]));

  return {
    data: result.rows.map((visit) => {
      const property = propertyById.get(visit.propertyId);
      return {
        ...visit.toJSON(),
        propertyTitle: property?.title || "Property",
        locality: property?.locality || "",
        buildingName: property?.buildingName || "",
        unitNo: property?.unitNo || "",
        agentName: agentById.get(visit.agentId) || "Assigned agent",
      };
    }),
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(result.count / limit),
  };
};

const getSiteVisitById = async (
  tenantId: string,
  id: string
) => {
  return SiteVisit.findOne({
    where: {
      id,
      tenantId,
    },
  });
};

const updateSiteVisit = async (
  tenantId: string,
  id: string,
  data: UpdateSiteVisitData
) => {
  const siteVisit = await SiteVisit.findOne({
    where: {
      id,
      tenantId,
    },
  });

  if (!siteVisit) {
    return null;
  }

  await siteVisit.update(data);

  return siteVisit;
};

const deleteSiteVisit = async (
  tenantId: string,
  id: string
) => {
  const siteVisit = await SiteVisit.findOne({
    where: {
      id,
      tenantId,
    },
  });

  if (!siteVisit) {
    return false;
  }

  await siteVisit.destroy();

  return true;
};

export {
  createSiteVisit,
  getSiteVisits,
  getSiteVisitById,
  updateSiteVisit,
  deleteSiteVisit,
};