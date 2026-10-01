import redis from "../config/redis";

const PROPERTY_CACHE_PREFIX = "crm:properties:";
const MASTER_DATA_CACHE_PREFIX = "md:";

const getPropertyCacheKey = (
  tenantId: string,
  page: number,
  limit: number,
  search?: string,
  listingType?: string,
  assigneeId?: string,
  filterKey = ""
) => {
  return `${PROPERTY_CACHE_PREFIX}${tenantId}:${page}:${limit}:${search || ""}:${listingType || ""}:${assigneeId || ""}:${filterKey}`;
};

const getCachedData = async <T>(
  key: string
): Promise<T | null> => {
  const cached = await redis.get(key);

  if (!cached) {
    return null;
  }

  return JSON.parse(cached) as T;
};

const setCachedData = async (
  key: string,
  data: unknown,
  ttlSeconds = 60
) => {
  await redis.set(
    key,
    JSON.stringify(data),
    "EX",
    ttlSeconds
  );
};

const invalidatePropertyCache = async (
  tenantId: string
) => {
  const pattern = `${PROPERTY_CACHE_PREFIX}${tenantId}:*`;

  let cursor = "0";

  do {
    const result = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    ) as [string, string[]];

    cursor = String(result[0]);

    const keys = Array.isArray(result[1]) ? result[1] : [];

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== "0");
};

const invalidateMasterDataCache = async (tenantId: string) => {
  const pattern = `${MASTER_DATA_CACHE_PREFIX}${tenantId}:*`;
  let cursor = "0";

  do {
    const result = await redis.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100
    ) as [string, string[]];
    cursor = String(result[0]);
    const keys = Array.isArray(result[1]) ? result[1] : [];
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== "0");
};

export {
  getPropertyCacheKey,
  getCachedData,
  setCachedData,
  invalidatePropertyCache,
  invalidateMasterDataCache,
};