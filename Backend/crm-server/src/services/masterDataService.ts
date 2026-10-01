import MasterData from "../models/MasterData";
import Property from "../models/Property";
import sequelize from "../config/database";
import { getCachedData, setCachedData, invalidateMasterDataCache, invalidatePropertyCache } from "./cacheService";

interface CreateMasterData {
  tenantId: string;
  type: string;
  value: string;
  label: string;
  sortOrder?: number;
  isActive?: boolean;
  isTerminal?: boolean;
}

interface UpdateMasterData {
  value?: string;
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
  isTerminal?: boolean;
}

const createMasterData = async (data: CreateMasterData) => {
  const lastSortOrder = await MasterData.max("sortOrder", {
    where: { tenantId: data.tenantId, type: data.type },
  });
  const item = await MasterData.create({
    tenantId: data.tenantId,
    type: data.type,
    value: data.value,
    label: data.label,
    sortOrder: data.sortOrder ?? (Number(lastSortOrder) || 0) + 1,
    isActive: data.isActive ?? true,
    isTerminal: data.type === "STATUS" ? data.isTerminal ?? false : false,
  });
  await invalidateMasterDataCache(data.tenantId);
  return item;
};

const getUsageCount = async (tenantId: string, type: string, value: string) => {
  if (type === "STATUS") return Property.count({ where: { tenantId, status: value } });
  if (type === "PROPERTY_TYPE") return Property.count({ where: { tenantId, type: value } });
  if (type === "LOCALITY") return Property.count({ where: { tenantId, locality: value } });
  if (type === "AMENITY") {
    const [rows] = await sequelize.query(
      "SELECT COUNT(*) AS count FROM properties WHERE tenant_id = :tenantId AND deleted_at IS NULL AND JSON_CONTAINS(COALESCE(amenities, JSON_ARRAY()), JSON_QUOTE(:value))",
      { replacements: { tenantId, value } }
    );
    return Number((rows as Array<{ count: number | string }>)[0]?.count || 0);
  }
  return 0;
};

const seedDefaultsForType = async (tenantId: string, type?: string) => {
  const defaults: Record<string, string[]> = {
    STATUS: ["Draft", "Listed", "Site visit", "Negotiation", "Token received", "Closed", "Withdrawn", "Available", "Contacted", "Visit Scheduled"],
    PROPERTY_TYPE: ["Apartment", "Villa", "Plot", "Commercial"],
    AMENITY: ["Parking", "Lift", "Security", "Swimming Pool", "Gym", "Club House", "Power Backup", "Garden", "CCTV"],
  };
  const types = type ? [type] : ["STATUS", "PROPERTY_TYPE", "LOCALITY", "AMENITY"];

  for (const currentType of types) {
    const existing = await MasterData.count({ where: { tenantId, type: currentType } });
    if (existing) continue;

    let values = defaults[currentType] || [];
    if (currentType === "STATUS" || currentType === "PROPERTY_TYPE") {
      const column = currentType === "STATUS" ? "status" : "type";
      const [rows] = await sequelize.query(
        `SELECT DISTINCT \`${column}\` AS value FROM properties WHERE tenant_id = :tenantId AND deleted_at IS NULL AND \`${column}\` IS NOT NULL`,
        { replacements: { tenantId } }
      );
      values = [...new Set([...values, ...(rows as Array<{ value: string }>).map((row) => row.value)])];
    } else if (currentType === "LOCALITY") {
      const [rows] = await sequelize.query(
        "SELECT DISTINCT locality AS value FROM properties WHERE tenant_id = :tenantId AND deleted_at IS NULL AND locality IS NOT NULL AND locality <> '' ORDER BY locality LIMIT 200",
        { replacements: { tenantId } }
      );
      values = (rows as Array<{ value: string }>).map((row) => row.value);
    }

    const orderedValues = [...new Set(values)].sort((left, right) => left.localeCompare(right));
    await MasterData.bulkCreate(orderedValues.map((value, index) => ({
      tenantId,
      type: currentType,
      value,
      label: value,
      sortOrder: index,
      isActive: true,
      isTerminal: currentType === "STATUS" && ["Closed", "Withdrawn"].includes(value),
    })), { ignoreDuplicates: true });
  }
};

const getMasterData = async (
  tenantId: string,
  type?: string
) => {
  await seedDefaultsForType(tenantId, type);
  const cacheKey = `md:${tenantId}:${type || "all"}`;
  const cached = await getCachedData<Array<Record<string, unknown>>>(cacheKey);
  if (cached) return cached;

  const where: Record<string, unknown> = {
    tenantId,
  };

  if (type) {
    where.type = type;
  }

  const records = await MasterData.findAll({
    where,
    order: [
      ["type", "ASC"],
      ["sortOrder", "ASC"],
      ["label", "ASC"],
    ],
  });

  const result = await Promise.all(records.map(async (record) => ({
    ...record.toJSON(),
    usageCount: await getUsageCount(tenantId, record.type, record.value),
  })));
  await setCachedData(cacheKey, result, 60);
  return result;
};

const getMasterDataById = async (
  tenantId: string,
  id: string
) => {
  return MasterData.findOne({
    where: {
      id,
      tenantId,
    },
  });
};

const updateMasterData = async (
  tenantId: string,
  id: string,
  data: UpdateMasterData
) => {
  const masterData = await sequelize.transaction(async (transaction) => {
    const record = await MasterData.findOne({ where: { id, tenantId }, transaction, lock: transaction.LOCK.UPDATE });
    if (!record) return null;

    const previousValue = record.value;
    const nextValue = data.value?.trim() || previousValue;
    const updates = {
      ...data,
      ...(data.value !== undefined ? { value: nextValue, label: data.label?.trim() || nextValue } : {}),
      ...(data.isTerminal !== undefined ? { isTerminal: record.type === "STATUS" && data.isTerminal } : {}),
    };
    await record.update(updates, { transaction });

    if (nextValue !== previousValue) {
      if (record.type === "STATUS") {
        await Property.update({ status: nextValue }, { where: { tenantId, status: previousValue }, transaction });
      } else if (record.type === "PROPERTY_TYPE") {
        await Property.update({ type: nextValue }, { where: { tenantId, type: previousValue }, transaction });
      } else if (record.type === "LOCALITY") {
        await Property.update({ locality: nextValue }, { where: { tenantId, locality: previousValue }, transaction });
      } else if (record.type === "AMENITY") {
        const properties = await Property.findAll({ where: { tenantId }, attributes: ["id", "amenities"], transaction });
        for (const property of properties) {
          const amenities = Array.isArray(property.amenities) ? property.amenities : [];
          if (amenities.includes(previousValue)) {
            await property.update({ amenities: amenities.map((amenity) => amenity === previousValue ? nextValue : amenity) }, { transaction });
          }
        }
      }
    }

    return record;
  });

  await invalidateMasterDataCache(tenantId);
  if (masterData && data.value !== undefined) await invalidatePropertyCache(tenantId);
  return masterData;
};

const deleteMasterData = async (
  tenantId: string,
  id: string
) => {
  const masterData = await MasterData.findOne({
    where: {
      id,
      tenantId,
    },
  });

  if (!masterData) {
    return false;
  }

  const usageCount = await getUsageCount(tenantId, masterData.type, masterData.value);
  if (usageCount > 0) {
    const error = new Error("This value is in use and cannot be deleted. Deactivate it instead.");
    error.name = "MasterDataInUseError";
    Object.assign(error, { usageCount });
    throw error;
  }

  await masterData.destroy();
  await invalidateMasterDataCache(tenantId);

  return true;
};

const reorderMasterData = async (
  tenantId: string,
  type: string,
  items: Array<{ id: string; sortOrder: number }>
) => {
  await sequelize.transaction(async (transaction) => {
    const records = await MasterData.findAll({ where: { tenantId, type }, transaction, lock: transaction.LOCK.UPDATE });
    if (records.length !== items.length || items.some((item) => !records.some((record) => record.id === item.id))) {
      const error = new Error("Reorder payload must include every value in this category.");
      error.name = "InvalidReorderError";
      throw error;
    }

    const orderById = new Map(items.map((item) => [item.id, item.sortOrder]));
    await Promise.all(records.map((record) => record.update({ sortOrder: orderById.get(record.id)! }, { transaction })));
  });
  await invalidateMasterDataCache(tenantId);
};

export {
  createMasterData,
  getMasterData,
  getMasterDataById,
  updateMasterData,
  deleteMasterData,
  reorderMasterData,
};