import Note from "../models/Note";

interface CreateNoteData {
  tenantId: string;
  propertyId: string;
  userId: string;
  content: string;
}

const createNote = async (data: CreateNoteData) => {
  return Note.create({
    tenantId: data.tenantId,
    propertyId: data.propertyId,
    userId: data.userId,
    content: data.content,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};

const getPropertyNotes = async (
  tenantId: string,
  propertyId: string
) => {
  return Note.findAll({
    where: {
      tenantId,
      propertyId,
    },
    order: [["createdAt", "DESC"]],
  });
};

const getNoteById = async (
  tenantId: string,
  noteId: string
) => {
  return Note.findOne({
    where: {
      id: noteId,
      tenantId,
    },
  });
};

const updateNote = async (
  tenantId: string,
  noteId: string,
  userId: string,
  content: string
) => {
  const note = await Note.findOne({
    where: {
      id: noteId,
      tenantId,
      userId,
    },
  });

  if (!note) {
    return null;
  }

  await note.update({
    content,
  });

  return note;
};

const deleteNote = async (
  tenantId: string,
  noteId: string,
  userId: string
) => {
  const note = await Note.findOne({
    where: {
      id: noteId,
      tenantId,
      userId,
    },
  });

  if (!note) {
    return false;
  }

  await note.destroy();

  return true;
};

export {
  createNote,
  getPropertyNotes,
  getNoteById,
  updateNote,
  deleteNote,
};