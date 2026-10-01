import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import getStats from "../controllers/dashboardController";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", getStats);

export default router;