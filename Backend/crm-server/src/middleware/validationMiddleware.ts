import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

const validationMiddleware = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.issues,
      });
      return;
    }

    req.body = (result.data as { body: unknown }).body;
    next();
  };
};

export default validationMiddleware;