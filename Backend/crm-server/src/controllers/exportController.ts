import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import exportProperties from "../services/exportService";

const exportPropertiesController = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const query = req.query || {};
  res.status(200);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    'attachment; filename="properties.xlsx"'
  );

  await exportProperties(
    {
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      role: req.user!.role,
      search: (query.search || query.q) as string | undefined,
      listingType: query.listingType as "SALE" | "RENT" | undefined,
      assigneeId: query.assigneeId as string | undefined,
      type: query.type as string | undefined,
      bhk: typeof query.bhk === "string"
        ? query.bhk.split(",").map(Number).filter(Number.isFinite)
        : undefined,
      minPrice: query.minPrice === undefined ? undefined : Number(query.minPrice),
      maxPrice: query.maxPrice === undefined ? undefined : Number(query.maxPrice),
      locality: query.locality as string | undefined,
      status: query.status as string | undefined,
      sortBy: query.sortBy as string | undefined,
      sortOrder: query.sortOrder === "asc" ? "asc" : "desc",
    },
    res
  );
};

export default exportPropertiesController;