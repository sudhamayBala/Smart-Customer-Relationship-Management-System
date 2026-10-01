import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import getDashboardStats from "../services/dashboardService";

const getStats = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const from = typeof req.query.from === "string" ? req.query.from : undefined;
  const to = typeof req.query.to === "string" ? req.query.to : undefined;

  if (
    (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) ||
    (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))
  ) {
    res.status(400).json({
      success: false,
      message: "Dashboard dates must use YYYY-MM-DD format",
    });
    return;
  }

  const stats = await getDashboardStats(
    req.user!.tenantId,
    req.user!.id,
    req.user!.role,
    from,
    to
  );

  res.status(200).json({
    success: true,
    data: stats,
  });
};

export default getStats;