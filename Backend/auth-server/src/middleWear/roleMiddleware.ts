import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./authmidillwear";

type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "AGENT";

export const requireRole = (...allowedRoles: Role[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
};
