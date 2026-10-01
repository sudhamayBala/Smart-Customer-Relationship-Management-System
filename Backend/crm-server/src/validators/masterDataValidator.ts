import { z } from "zod";

const createMasterDataSchema = z.object({
  type: z.enum(["STATUS", "PROPERTY_TYPE", "LOCALITY", "AMENITY"]),
  value: z.string().trim().min(1).max(150),
  label: z.string().trim().min(1).max(150),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isTerminal: z.boolean().optional(),
});

const updateMasterDataSchema = z.object({
  value: z.string().trim().min(1).max(150).optional(),
  label: z.string().trim().min(1).max(150).optional(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isTerminal: z.boolean().optional(),
});

const reorderMasterDataSchema = z.object({
  type: z.enum(["STATUS", "PROPERTY_TYPE", "LOCALITY", "AMENITY"]),
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int().min(0),
  })).min(1),
});

export {
  createMasterDataSchema,
  updateMasterDataSchema,
  reorderMasterDataSchema,
};