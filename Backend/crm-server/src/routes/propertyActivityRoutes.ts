import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import {
  create,
  list,
  remove,
} from "../controllers/propertyActivityController";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/:propertyId", list);

router.post("/:propertyId", create);

router.delete("/:propertyId", remove);

export default router;