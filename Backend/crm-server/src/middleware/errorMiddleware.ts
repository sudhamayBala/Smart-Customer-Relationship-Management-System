import { Request, Response, NextFunction } from "express";

const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error.name === "ForbiddenError") {
    res.status(403).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error.name === "NotFoundError") {
    res.status(404).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (error.name === "OptimisticLockError") {
    res.status(409).json({
      success: false,
      message: error.message,
    });
    return;
  }

  if (
    error.name === "SequelizeUniqueConstraintError"
  ) {
    res.status(409).json({
      success: false,
      message: "Duplicate resource",
    });
    return;
  }

  console.error(error);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorMiddleware;