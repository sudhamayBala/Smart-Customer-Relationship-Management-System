import { Op } from "sequelize";
import sequelize from "../config/database";
import Property from "../models/Property";
import MasterData from "../models/MasterData";
import { createActivity } from "./propertyActivityService";
import User from "../models/User";
import {
  getPropertyCacheKey,
  getCachedData,
  setCachedData,
  invalidatePropertyCache,
} from "./cacheService";

export interface PropertyFilters {
  tenantId: string;
  userId: string;
  role: string;
  page?: number;
  limit?: number;
  search?: string;
  listingType?: "SALE" | "RENT";
  assigneeId?: string;
  type?: string;
  bhk?: number[];
  minPrice?: number;
  maxPrice?: number;
  locality?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface CreatePropertyData {
  tenantId: string;
  userId?: string;
  title: string;
  type?: string;
  listingType: "SALE" | "RENT";
  locality?: string | null;
  city?: string | null;
  address?: string | null;
  bhk?: number | null;
  area?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  furnishing?: string | null;
  facing?: string | null;
  price: number;
  status?: string;
  amenities?: string[];
  buildingName: string;
  unitNo: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  assigneeId?: string | null;
}

interface UpdatePropertyData {
  title?: string;
  type?: string;
  listingType?: "SALE" | "RENT";
  locality?: string | null;
  city?: string | null;
  address?: string | null;
  bhk?: number | null;
  area?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  furnishing?: string | null;
  facing?: string | null;
  price?: number;
  status?: string;
  amenities?: string[];
  buildingName?: string;
  unitNo?: string;
  ownerName?: string | null;
  ownerPhone?: string | null;
  assigneeId?: string | null;
  version: number;
}

const sortableFields = new Set([
  "title",
  "type",
  "locality",
  "bhk",
  "area",
  "price",
  "status",
  "createdAt",
  "updatedAt",
]);

const buildPropertyWhere = (filters: PropertyFilters) => {
  const where: Record<string | symbol, unknown> = {
    tenantId: filters.tenantId,
  };
  const and: unknown[] = [];

  if (filters.role === "AGENT") {
    where.assigneeId = filters.userId;
  } else if (filters.assigneeId) {
    where.assigneeId = filters.assigneeId;
  }

  if (filters.listingType) {
    where.listingType = filters.listingType.toUpperCase();
  }
  if (filters.type) where.type = filters.type;
  if (filters.locality) where.locality = filters.locality;
  if (filters.status) where.status = filters.status;

  if (filters.search?.trim()) {
    const search = `%${filters.search.trim()}%`;
    and.push({
      [Op.or]: [
        { title: { [Op.like]: search } },
        { type: { [Op.like]: search } },
        { locality: { [Op.like]: search } },
        { buildingName: { [Op.like]: search } },
        { unitNo: { [Op.like]: search } },
      ],
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const price: Record<symbol, number> = {};
    if (filters.minPrice !== undefined) price[Op.gte] = filters.minPrice;
    if (filters.maxPrice !== undefined) price[Op.lte] = filters.maxPrice;
    where.price = price;
  }

  if (filters.bhk?.length) {
    const exactBhk = filters.bhk.filter((value) => value < 4);
    const choices = [
      ...(exactBhk.length ? [{ bhk: { [Op.in]: exactBhk } }] : []),
      ...(filters.bhk.includes(4) ? [{ bhk: { [Op.gte]: 4 } }] : []),
    ];
    and.push(choices.length === 1 ? choices[0] : { [Op.or]: choices });
  }

  if (and.length) where[Op.and] = and;
  return where;
};

const createProperty = async (
  data: CreatePropertyData
) => {
  const property = await Property.create({
    ...data,
    listedPrice: data.price,
    version: 1,
  });

  await createActivity({
    tenantId: data.tenantId,
    propertyId: property.id,
    userId: data.userId,
    action: "created",
    details: "created this property",
  });

  await invalidatePropertyCache(data.tenantId);

  return property;
};

const getProperties = async (
  filters: PropertyFilters
) => {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 20));
  const offset = (page - 1) * limit;
  const where = buildPropertyWhere(filters);
  const sortBy = filters.sortBy && sortableFields.has(filters.sortBy)
    ? filters.sortBy
    : "createdAt";
  const sortOrder = filters.sortOrder === "asc" ? "ASC" : "DESC";
  const filterKey = JSON.stringify({
    type: filters.type,
    bhk: filters.bhk,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    locality: filters.locality,
    status: filters.status,
    sortBy,
    sortOrder,
  });

  const cacheKey = getPropertyCacheKey(
    filters.tenantId,
    page,
    limit,
    filters.search,
    filters.listingType,
    filters.role === "AGENT" ? filters.userId : filters.assigneeId,
    filterKey
  );

  const cached = await getCachedData<{
    data: Property[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  const result = await Property.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortBy, sortOrder]],
  });

  const assigneeIds = [...new Set(
    result.rows.map((property) => property.assigneeId).filter(Boolean)
  )] as string[];
  const assignees = assigneeIds.length
    ? await User.findAll({
        where: { id: { [Op.in]: assigneeIds } },
        attributes: ["id", "name"],
      })
    : [];
  const assigneeNames = new Map(assignees.map((user) => [user.id, user.name]));

  const response = {
    data: result.rows.map((property) => ({
      ...property.toJSON(),
      assigneeName: property.assigneeId
        ? assigneeNames.get(property.assigneeId) || ""
        : "",
    })),
    total: result.count,
    page,
    limit,
    totalPages: Math.ceil(
      result.count / limit
    ),
  };

  await setCachedData(
    cacheKey,
    response,
    60
  );

  return response;
};

const getPropertyById = async (
  tenantId: string,
  userId: string,
  role: string,
  id: string
) => {
  const where: Record<string, unknown> = {
    id,
    tenantId,
  };

  if (role === "AGENT") {
    where.assigneeId = userId;
  }

  return Property.findOne({
    where,
  });
};

const updateProperty = async (
  tenantId: string,
  userId: string,
  role: string,
  id: string,
  data: UpdatePropertyData
) => {
  const { version, ...updates } = data;
  const currentProperty = await Property.findOne({
    where: { id, tenantId },
  });

  if (!currentProperty) return null;
  if (role === "AGENT" && currentProperty.assigneeId !== userId) {
    const error = new Error("You are not allowed to modify this property");
    error.name = "ForbiddenError";
    throw error;
  }

  const where: Record<string, unknown> = {
    id,
    tenantId,
    version,
  };

  if (role === "AGENT") {
    where.assigneeId = userId;
  }

  const [affectedRows] = await Property.update(
    {
      ...updates,
      version: version + 1,
    },
    {
      where,
    }
  );

  if (affectedRows === 0) {
    const error = new Error(
      "Property was modified by another user"
    );

    error.name = "OptimisticLockError";

    throw error;
  }

  await invalidatePropertyCache(tenantId);

  const events: Array<{ action: string; details: string }> = [];
  if (updates.status && updates.status !== currentProperty.status) {
    events.push({
      action: "status",
      details: `changed status ${currentProperty.status} → ${updates.status}`,
    });
  }
  if (updates.price !== undefined && Number(updates.price) !== Number(currentProperty.price)) {
    events.push({
      action: "price",
      details: `changed price ${Number(currentProperty.price).toLocaleString("en-IN")} → ${Number(updates.price).toLocaleString("en-IN")}`,
    });
  }
  if (updates.assigneeId !== undefined && updates.assigneeId !== currentProperty.assigneeId) {
    const [previousAgent, nextAgent] = await Promise.all([
      currentProperty.assigneeId ? User.findByPk(currentProperty.assigneeId) : null,
      updates.assigneeId ? User.findByPk(updates.assigneeId) : null,
    ]);
    events.push({
      action: "assignment",
      details: updates.assigneeId
        ? `assigned to ${nextAgent?.name || "a team member"}${currentProperty.assigneeId ? ` from ${previousAgent?.name || "a team member"}` : ""}`
        : `unassigned ${previousAgent?.name || "the current agent"}`,
    });
  }

  if (!events.length) {
    events.push({ action: "updated", details: "updated property details" });
  }

  await Promise.all(events.map((event) => createActivity({
    tenantId,
    propertyId: id,
    userId,
    action: event.action,
    details: event.details,
  })));

  return Property.findOne({
    where: {
      id,
      tenantId,
    },
  });
};

const deleteProperty = async (
  tenantId: string,
  userId: string,
  role: string,
  id: string
) => {
  const where: Record<string, unknown> = {
    id,
    tenantId,
  };

  if (role === "AGENT") {
    where.assigneeId = userId;
  }

  const property = await Property.findOne({
    where,
  });

  if (!property) {
    return null;
  }

  await property.destroy();

  await invalidatePropertyCache(tenantId);

  return true;
};

const getPropertyFilterOptions = async (tenantId: string) => {
  const [masterLocalities, masterTypes, masterStatuses, masterAmenities, propertyLocalities, propertyTypes, propertyStatuses, agents] = await Promise.all([
    MasterData.findAll({ where: { tenantId, type: "LOCALITY", isActive: true }, attributes: ["value"], order: [["sortOrder", "ASC"]] }),
    MasterData.findAll({ where: { tenantId, type: "PROPERTY_TYPE", isActive: true }, attributes: ["value"], order: [["sortOrder", "ASC"]] }),
    MasterData.findAll({ where: { tenantId, type: "STATUS", isActive: true }, attributes: ["value"], order: [["sortOrder", "ASC"]] }),
    MasterData.findAll({ where: { tenantId, type: "AMENITY", isActive: true }, attributes: ["value"], order: [["sortOrder", "ASC"]] }),
    Property.findAll({ where: { tenantId, locality: { [Op.ne]: null } }, attributes: ["locality"], group: ["locality"], order: [["locality", "ASC"]], raw: true }) as unknown as Promise<Array<{ locality: string }>>,
    Property.findAll({ where: { tenantId }, attributes: ["type"], group: ["type"], order: [["type", "ASC"]], raw: true }) as unknown as Promise<Array<{ type: string }>>,
    Property.findAll({ where: { tenantId }, attributes: ["status"], group: ["status"], order: [["status", "ASC"]], raw: true }) as unknown as Promise<Array<{ status: string }>>,
    User.findAll({ where: { tenantId, role: "AGENT" }, attributes: ["id", "name"], order: [["name", "ASC"]] }),
  ]);

  return {
    localities: masterLocalities.length ? masterLocalities.map((item) => item.value) : propertyLocalities.map((item) => item.locality),
    propertyTypes: masterTypes.length ? masterTypes.map((item) => item.value) : propertyTypes.map((item) => item.type),
    statuses: masterStatuses.length ? masterStatuses.map((item) => item.value) : propertyStatuses.map((item) => item.status),
    amenities: masterAmenities.map((item) => item.value),
    agents: agents.map((agent) => ({ id: agent.id, name: agent.name })),
  };
};

const bulkUpdateProperties = async (
  tenantId: string,
  userId: string,
  role: string,
  ids: string[],
  updates: { assigneeId?: string | null; status?: string; amenity?: string }
) => {
  const transaction = await sequelize.transaction();

  try {
    const where: Record<string | symbol, unknown> = {
      tenantId,
      id: { [Op.in]: ids },
    };

    if (role === "AGENT") where.assigneeId = userId;

    const properties = await Property.findAll({
      where,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (properties.length !== new Set(ids).size) {
      const error = new Error("One or more selected properties are unavailable.");
      error.name = role === "AGENT" ? "ForbiddenError" : "NotFoundError";
      throw error;
    }

    for (const property of properties) {
      const changes: Record<string, unknown> = {
        version: property.version + 1,
      };

      if (updates.assigneeId !== undefined) changes.assigneeId = updates.assigneeId;
      if (updates.status !== undefined) changes.status = updates.status;
      if (updates.amenity) {
        changes.amenities = [...new Set([
          ...(property.amenities || []),
          updates.amenity,
        ])];
      }

      await property.update(changes, { transaction });
    }

    await transaction.commit();
    await invalidatePropertyCache(tenantId);
    return properties.length;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

export {
  buildPropertyWhere,
  bulkUpdateProperties,
  createProperty,
  getProperties,
  getPropertyFilterOptions,
  getPropertyById,
  updateProperty,
  deleteProperty,
};