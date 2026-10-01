import { z } from "zod";

const createNoteSchema = z.object({
  propertyId: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).max(5000),
});

export {
  createNoteSchema,
  updateNoteSchema,
};