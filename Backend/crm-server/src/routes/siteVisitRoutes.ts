import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import validationMiddleware from "../middleware/validationMiddleware";
import {
  create,
  list,
  getById,
  update,
  remove,
} from "../controllers/siteVisitController";
import {
  createSiteVisitSchema,
  updateSiteVisitSchema,
} from "../validators/siteVisitValidator";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", list);

router.post(
  "/",
  validationMiddleware(createSiteVisitSchema),
  create
);

router.get("/:id", getById);

router.put(
  "/:id",
  validationMiddleware(updateSiteVisitSchema),
  update
);

router.delete("/:id", remove);

export default router;