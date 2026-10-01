import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createActivity,
  getPropertyActivities,
  deletePropertyActivities,
} from "../services/propertyActivityService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const activity = await createActivity({
    tenantId: req.user!.tenantId,
    propertyId: req.params.propertyId,
    userId: req.user!.id,
    action: req.body.action,
    details: req.body.details,
  });

  res.status(201).json({
    success: true,
    data: activity,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const activities = await getPropertyActivities(
    req.user!.tenantId,
    req.params.propertyId,
    req.user!.id,
    req.user!.role
  );

  if (!activities) {
    res.status(404).json({
      success: false,
      message: "Property not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: activities,
  });
};

const remove = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const deleted = await deletePropertyActivities(
    req.user!.tenantId,
    req.params.propertyId
  );

  res.status(200).json({
    success: true,
    message: "Property activities deleted successfully",
    deleted,
  });
};

export {
  create,
  list,
  remove,
};