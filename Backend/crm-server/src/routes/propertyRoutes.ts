import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import {
  create,
  list,
  filterOptions,
  bulkUpdate,
  getById,
  update,
  remove,
} from "../controllers/propertyController";
import validationMiddleware from "../middleware/validationMiddleware";
import {
  createPropertySchema,
  updatePropertySchema,
  bulkPropertySchema,
} from "../validators/propertyValidator";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", list);
router.get("/filters", filterOptions);
router.patch(
  "/bulk",
  validationMiddleware(bulkPropertySchema),
  bulkUpdate
);

router.get("/:id", getById);

router.post(
  "/",
  validationMiddleware(createPropertySchema),
  create
);

router.put(
  "/:id",
  validationMiddleware(updatePropertySchema),
  update
);

router.delete("/:id", remove);

export default router;