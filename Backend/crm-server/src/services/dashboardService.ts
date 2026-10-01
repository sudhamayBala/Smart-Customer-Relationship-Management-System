import { Op, QueryTypes } from "sequelize";
import database from "../config/database";
import Property from "../models/Property";
import SiteVisit from "../models/SiteVisit";
import { getCachedData, setCachedData } from "./cacheService";

const normalizeStatus = (status: string) => {
  const value = status.toLowerCase();

  if (["available", "contacted", "listed"].includes(value)) {
    return "Listed";
  }

  if (["visit scheduled", "site visit", "site_visit"].includes(value)) {
    return "Site visit";
  }

  if (value === "token received" || value === "token_received") {
    return "Token received";
  }

  if (value === "closed") {
    return "Closed";
  }

  return value === "negotiation" ? "Negotiation" : "Other";
};

const getDashboardStats = async (
  tenantId: string,
  userId: string,
  role: string,
  fromValue?: string,
  toValue?: string
) => {
  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const from = fromValue || defaultFrom;
  const to = toValue || today;

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);
  const rangeDuration = toDate.getTime() - fromDate.getTime() + 1;
  const previousFrom = new Date(fromDate.getTime() - rangeDuration);
  const previousTo = new Date(fromDate.getTime() - 1);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    fromDate > toDate ||
    toDate.getTime() - fromDate.getTime() > 366 * 86400000
  ) {
    throw new Error("Invalid dashboard date range");
  }

  const cacheKey = `crm:dashboard:${tenantId}:${role === "AGENT" ? userId : "tenant"}:${from}:${to}`;
  const cached = await getCachedData(cacheKey);

  if (cached) {
    return cached as typeof cached;
  }

  const propertyWhere: Record<string, unknown> = {
    tenantId,
    createdAt: { [Op.between]: [fromDate, toDate] },
  };

  const closedWhere: Record<string, unknown> = {
    tenantId,
    status: "Closed",
    updatedAt: { [Op.between]: [fromDate, toDate] },
  };

  const previousPropertyWhere: Record<string, unknown> = {
    tenantId,
    createdAt: { [Op.between]: [previousFrom, previousTo] },
  };

  const previousClosedWhere: Record<string, unknown> = {
    tenantId,
    status: "Closed",
    updatedAt: { [Op.between]: [previousFrom, previousTo] },
  };

  const overdueWhere: Record<string, unknown> = {
    tenantId,
    status: "SCHEDULED",
    scheduledAt: {
      [Op.between]: [fromDate, new Date(Math.min(toDate.getTime(), Date.now()))],
    },
  };

  if (role === "AGENT") {
    propertyWhere.assigneeId = userId;
    closedWhere.assigneeId = userId;
    previousPropertyWhere.assigneeId = userId;
    previousClosedWhere.assigneeId = userId;
    overdueWhere.agentId = userId;
  }

  const roleSql = role === "AGENT" ? " AND assignee_id = :userId" : "";
  const closedRoleSql = role === "AGENT" ? " AND p.assignee_id = :userId" : "";
  const replacements = { tenantId, userId, fromDate, toDate };

  const [
    newListings,
    previousListings,
    closedValue,
    previousClosedValue,
    closedDeals,
    previousClosedDeals,
    overdueVisits,
    overdueAgents,
    listingTrendRows,
    funnelRows,
    typeRows,
    leaderboardRows,
  ] = await Promise.all([
    Property.count({ where: propertyWhere }),
    Property.count({ where: previousPropertyWhere }),
    Property.sum("price", { where: closedWhere }),
    Property.sum("price", { where: previousClosedWhere }),
    Property.count({ where: closedWhere }),
    Property.count({ where: previousClosedWhere }),
    Date.now() < fromDate.getTime()
      ? Promise.resolve(0)
      : SiteVisit.count({ where: overdueWhere }),
    Date.now() < fromDate.getTime()
      ? Promise.resolve(0)
      : SiteVisit.count({ where: overdueWhere, distinct: true, col: "agentId" }),
    database.query(
      `SELECT DATE_FORMAT(DATE_SUB(DATE(created_at), INTERVAL WEEKDAY(created_at) DAY), '%Y-%m-%d') AS weekStart, COUNT(*) AS count FROM properties WHERE tenant_id = :tenantId AND created_at BETWEEN :fromDate AND :toDate${roleSql} GROUP BY weekStart ORDER BY weekStart`,
      { replacements, type: QueryTypes.SELECT }
    ) as Promise<Array<{ weekStart: string; count: number }>>,
    database.query(
      `SELECT status, COUNT(*) AS count FROM properties WHERE tenant_id = :tenantId${role === "AGENT" ? " AND assignee_id = :userId" : ""} GROUP BY status`,
      { replacements, type: QueryTypes.SELECT }
    ) as Promise<Array<{ status: string; count: number }>>,
    database.query(
      `SELECT type, COUNT(*) AS count FROM properties WHERE tenant_id = :tenantId AND created_at BETWEEN :fromDate AND :toDate${roleSql} GROUP BY type ORDER BY count DESC`,
      { replacements, type: QueryTypes.SELECT }
    ) as Promise<Array<{ type: string; count: number }>>,
    database.query(
      `SELECT COALESCE(u.name, 'Unassigned') AS agentName, COUNT(p.id) AS closedDeals, COALESCE(SUM(p.price), 0) AS closedValue FROM properties p LEFT JOIN users u ON u.id = p.assignee_id AND u.tenant_id = p.tenant_id WHERE p.tenant_id = :tenantId AND p.status = 'Closed' AND p.updated_at BETWEEN :fromDate AND :toDate${closedRoleSql} GROUP BY p.assignee_id, u.name ORDER BY closedValue DESC LIMIT 10`,
      { replacements, type: QueryTypes.SELECT }
    ) as Promise<Array<{ agentName: string; closedDeals: number; closedValue: number }>>,
  ]);

  const funnelStatuses = [
    "Listed",
    "Site visit",
    "Negotiation",
    "Token received",
    "Closed",
  ];

  const funnelCounts = new Map<string, number>();

  for (const row of funnelRows) {
    const key = normalizeStatus(row.status);
    funnelCounts.set(key, (funnelCounts.get(key) || 0) + Number(row.count));
  }

  const closedCount = Number(closedDeals || 0);
  const previousConversion = Number(previousListings)
    ? (Number(previousClosedDeals || 0) / Number(previousListings)) * 100
    : 0;
  const conversionRate = Number(newListings)
    ? (closedCount / Number(newListings)) * 100
    : 0;

  const percentageChange = (current: number, previous: number) => {
    if (previous > 0) {
      return Number((((current - previous) / previous) * 100).toFixed(1));
    }

    if (current > 0) {
      return 100;
    }

    return 0;
  };

  const report = {
    range: { from, to },
    kpis: {
      newListings: Number(newListings || 0),
      newListingsChangePercent: percentageChange(Number(newListings || 0), Number(previousListings || 0)),
      closedValue: Number(closedValue || 0),
      closedValueChangePercent: percentageChange(Number(closedValue || 0), Number(previousClosedValue || 0)),
      conversionRate: Number(conversionRate.toFixed(1)),
      conversionChangePoints: Number((conversionRate - previousConversion).toFixed(1)),
      overdueVisits: Number(overdueVisits || 0),
      overdueAgents: Number(overdueAgents || 0),
    },
    listingTrend: listingTrendRows.map((row) => ({
      weekStart: row.weekStart,
      count: Number(row.count),
    })),
    funnel: funnelStatuses.map((status) => ({
      status,
      count: funnelCounts.get(status) || 0,
    })),
    propertyTypes: typeRows.map((row) => ({
      type: row.type || "Other",
      count: Number(row.count),
    })),
    agentLeaderboard: leaderboardRows.map((row) => ({
      agentName: row.agentName,
      closedDeals: Number(row.closedDeals),
      closedValue: Number(row.closedValue),
    })),
    hasRangeData: Number(newListings || 0) > 0 || closedCount > 0 || Number(overdueVisits || 0) > 0,
  };

  await setCachedData(cacheKey, report, 60);

  return report;
};

export default getDashboardStats;