import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createProperty,
  getProperties,
  getPropertyFilterOptions,
  getPropertyById,
  updateProperty,
  deleteProperty,
  bulkUpdateProperties,
} from "../services/propertyService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const property = await createProperty({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    title: req.body.title,
    type: req.body.type,
    listingType: req.body.listingType,
    locality: req.body.locality,
    city: req.body.city,
    address: req.body.address,
    bhk: req.body.bhk,
    area: req.body.area,
    floor: req.body.floor,
    totalFloors: req.body.totalFloors,
    furnishing: req.body.furnishing,
    facing: req.body.facing,
    price: req.body.price,
    status: req.body.status,
    amenities: req.body.amenities,
    buildingName: req.body.buildingName,
    unitNo: req.body.unitNo,
    ownerName: req.body.ownerName,
    ownerPhone: req.body.ownerPhone,
    assigneeId: req.body.assigneeId,
  });

  res.status(201).json({
    success: true,
    data: property,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const result = await getProperties({
    tenantId: req.user!.tenantId,
    userId: req.user!.id,
    role: req.user!.role,
    page: req.query.page
      ? Number(req.query.page)
      : undefined,
    limit: req.query.limit
      ? Number(req.query.limit)
      : undefined,
    search: (req.query.search || req.query.q) as string | undefined,
    listingType: req.query.listingType as
      | "SALE"
      | "RENT"
      | undefined,
    assigneeId: req.query.assigneeId as
      | string
      | undefined,
    type: req.query.type as string | undefined,
    bhk: typeof req.query.bhk === "string"
      ? req.query.bhk.split(",").map(Number).filter(Number.isFinite)
      : undefined,
    minPrice: req.query.minPrice === undefined
      ? undefined
      : Number(req.query.minPrice),
    maxPrice: req.query.maxPrice === undefined
      ? undefined
      : Number(req.query.maxPrice),
    locality: req.query.locality as string | undefined,
    status: req.query.status as string | undefined,
    sortBy: req.query.sortBy as string | undefined,
    sortOrder: req.query.sortOrder === "asc" ? "asc" : "desc",
  });

  res.status(200).json({
    success: true,
    ...result,
  });
};

const filterOptions = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const options = await getPropertyFilterOptions(req.user!.tenantId);
  res.status(200).json({ success: true, data: options });
};

const bulkUpdate = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const updatedCount = await bulkUpdateProperties(
    req.user!.tenantId,
    req.user!.id,
    req.user!.role,
    req.body.ids,
    {
      assigneeId: req.body.assigneeId,
      status: req.body.status,
      amenity: req.body.amenity,
    }
  );

  res.status(200).json({ success: true, updatedCount });
};

const getById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const property = await getPropertyById(
    req.user!.tenantId,
    req.user!.id,
    req.user!.role,
    req.params.id
  );

  if (!property) {
    res.status(404).json({
      success: false,
      message: "Property not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: property,
  });
};

const update = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const property = await updateProperty(
    req.user!.tenantId,
    req.user!.id,
    req.user!.role,
    req.params.id,
    {
      ...req.body,
      version: req.body.version,
    }
  );

  if (!property) {
    res.status(404).json({
      success: false,
      message: "Property not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: property,
  });
};

const remove = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const deleted = await deleteProperty(
    req.user!.tenantId,
    req.user!.id,
    req.user!.role,
    req.params.id
  );

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "Property not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Property deleted successfully",
  });
};

export {
  create,
  list,
  filterOptions,
  bulkUpdate,
  getById,
  update,
  remove,
};