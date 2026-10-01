import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/authMiddleware";
import {
  createNote,
  getPropertyNotes,
  getNoteById,
  updateNote,
  deleteNote,
} from "../services/noteService";

const create = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const note = await createNote({
    tenantId: req.user!.tenantId,
    propertyId: req.params.propertyId,
    userId: req.user!.id,
    content: req.body.content,
  });

  res.status(201).json({
    success: true,
    data: note,
  });
};

const list = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const notes = await getPropertyNotes(
    req.user!.tenantId,
    req.params.propertyId
  );

  res.status(200).json({
    success: true,
    data: notes,
  });
};

const getById = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const note = await getNoteById(
    req.user!.tenantId,
    req.params.id
  );

  if (!note) {
    res.status(404).json({
      success: false,
      message: "Note not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: note,
  });
};

const update = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const note = await updateNote(
    req.user!.tenantId,
    req.params.id,
    req.user!.id,
    req.body.content
  );

  if (!note) {
    res.status(404).json({
      success: false,
      message: "Note not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: note,
  });
};

const remove = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const deleted = await deleteNote(
    req.user!.tenantId,
    req.params.id,
    req.user!.id
  );

  if (!deleted) {
    res.status(404).json({
      success: false,
      message: "Note not found",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Note deleted successfully",
  });
};

export {
  create,
  list,
  getById,
  update,
  remove,
};