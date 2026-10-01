import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import exportPropertiesController from "../controllers/exportController";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/properties", exportPropertiesController);

export default router;