import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authMiddleware";

const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user?.tenantId) {
    res.status(403).json({
      success: false,
      message: "Tenant information is missing",
    });
    return;
  }

  req.headers["x-tenant-id"] = req.user.tenantId;

  next();
};

export default tenantMiddleware;