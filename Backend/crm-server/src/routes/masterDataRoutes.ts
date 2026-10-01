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
  reorder,
} from "../controllers/masterDataController";
import {
  createMasterDataSchema,
  updateMasterDataSchema,
  reorderMasterDataSchema,
} from "../validators/masterDataValidator";

const router = Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

router.get("/", list);

router.post(
  "/",
  validationMiddleware(createMasterDataSchema),
  create
);

router.patch(
  "/reorder",
  validationMiddleware(reorderMasterDataSchema),
  reorder
);

router.get("/:id", getById);

router.put(
  "/:id",
  validationMiddleware(updateMasterDataSchema),
  update
);

router.delete("/:id", remove);

export default router;