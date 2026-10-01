import { Router } from "express";
import authMiddleware from "../middleware/authMiddleware";
import tenantMiddleware from "../middleware/tenantMiddleware";
import validationMiddleware from "../middleware/validationMiddleware";
import {
  create,
  list,
} from "../controllers/chatController";
import {
  createChatMessageSchema,
} from "../validators/chatValidator";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", list);

router.post(
  "/",
  validationMiddleware(createChatMessageSchema),
  create
);

export default router;