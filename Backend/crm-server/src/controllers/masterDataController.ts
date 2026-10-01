import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createMasterData,
  getMasterData,
  getMasterDataById,
  updateMasterData,
  deleteMasterData,
  reorderMasterData,
} from "../services/masterDataService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const masterData = await createMasterData({
    tenantId: req.user!.tenantId,
    type: req.body.type,
    value: req.body.value,
    label: req.body.label,
    sortOrder: req.body.sortOrder,
    isActive: req.body.isActive,
    isTerminal: req.body.isTerminal,
  });

  res.status(201).json({
    success: true,
    data: masterData,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const masterData = await getMasterData(
    req.user!.tenantId,
    req.query.type as string | undefined
  );

  res.status(200).json({
    success: true,
    data: masterData,
  });
};

const reorder = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    await reorderMasterData(req.user!.tenantId, req.body.type, req.body.items);
    res.status(200).json({ success: true });
  } catch (error) {
    const typedError = error as Error;
    if (typedError.name === "InvalidReorderError") {
      res.status(400).json({ success: false, message: typedError.message });
      return;
    }
    throw error;
  }
};

const getById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const masterData = await getMasterDataById(
    req.user!.tenantId,
    req.params.id
  );

  if (!masterData) {
    res.status(404).json({
      success: false,
      message: "Master data not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: masterData,
  });
};

const update = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const masterData = await updateMasterData(
    req.user!.tenantId,
    req.params.id,
    req.body
  );

  if (!masterData) {
    res.status(404).json({
      success: false,
      message: "Master data not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: masterData,
  });
};

const remove = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  let deleted: boolean;
  try {
    deleted = await deleteMasterData(req.user!.tenantId, req.params.id);
  } catch (error) {
    const typedError = error as Error & { usageCount?: number };
    if (typedError.name === "MasterDataInUseError") {
      res.status(409).json({
        success: false,
        message: typedError.message,
        usageCount: typedError.usageCount,
      });
      return;
    }
    throw error;
  }

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "Master data not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Master data deleted successfully",
  });
};

export {
  create,
  list,
  getById,
  update,
  remove,
  reorder,
};