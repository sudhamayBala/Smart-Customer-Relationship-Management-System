import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createSiteVisit,
  getSiteVisits,
  getSiteVisitById,
  updateSiteVisit,
  deleteSiteVisit,
} from "../services/siteVisitService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const siteVisit = await createSiteVisit({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    role: req.user!.role,
    propertyId: req.body.propertyId,
    agentId: req.body.agentId || req.user!.id,
    clientName: req.body.clientName,
    clientPhone: req.body.clientPhone,
    scheduledAt: new Date(req.body.scheduledAt),
    status: req.body.status,
    notes: req.body.notes,
  });

  res.status(201).json({
    success: true,
    data: siteVisit,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const from = req.query.from ? new Date(String(req.query.from)) : undefined;
  const to = req.query.to ? new Date(String(req.query.to)) : undefined;

  if (
    (from && Number.isNaN(from.getTime())) ||
    (to && Number.isNaN(to.getTime())) ||
    (from && to && from >= to)
  ) {
    res.status(400).json({
      success: false,
      message: "Invalid site visit date range",
    });
    return;
  }

  const result = await getSiteVisits(
    req.user!.tenantId,
    {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      propertyId: req.query.propertyId as string | undefined,
      agentId: req.query.agentId as string | undefined,
      status: req.query.status as "SCHEDULED" | "COMPLETED" | "CANCELLED" | undefined,
      from,
      to,
      userId: req.user!.id,
      role: req.user!.role,
    }
  );

  res.status(200).json({
    success: true,
    ...result,
  });
};

const getById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const siteVisit = await getSiteVisitById(
    req.user!.tenantId,
    req.params.id
  );

  if (!siteVisit) {
    res.status(404).json({
      success: false,
      message: "Site visit not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: siteVisit,
  });
};

const update = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const data = {
    ...req.body,
    scheduledAt: req.body.scheduledAt
      ? new Date(req.body.scheduledAt)
      : undefined,
  };

  const siteVisit = await updateSiteVisit(
    req.user!.tenantId,
    req.params.id,
    data
  );

  if (!siteVisit) {
    res.status(404).json({
      success: false,
      message: "Site visit not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: siteVisit,
  });
};

const remove = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const deleted = await deleteSiteVisit(
    req.user!.tenantId,
    req.params.id
  );

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "Site visit not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Site visit deleted successfully",
  });
};

export {
  create,
  list,
  getById,
  update,
  remove,
};