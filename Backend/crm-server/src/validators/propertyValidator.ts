import { z } from "zod";

export const createPropertySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255),
    type: z.string().min(1).max(80).optional(),
    listingType: z.enum(["SALE", "RENT"]),
    locality: z.string().max(150).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    address: z.string().max(5000).nullable().optional(),
    bhk: z.number().int().positive().nullable().optional(),
    area: z.number().positive().nullable().optional(),
    floor: z.number().int().nonnegative().nullable().optional(),
    totalFloors: z.number().int().positive().nullable().optional(),
    furnishing: z.string().max(60).nullable().optional(),
    facing: z.string().max(40).nullable().optional(),
    price: z.number().positive(),
    status: z.string().min(1).max(40).optional(),
    amenities: z.array(z.string().min(1).max(80)).optional(),
    buildingName: z.string().min(1).max(255),
    unitNo: z.string().min(1).max(100),
    ownerName: z.string().max(150).nullable().optional(),
    ownerPhone: z.string().max(30).nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updatePropertySchema = z.object({
  body: z.object({
    title: z.string().min(1).max(255).optional(),
    type: z.string().min(1).max(80).optional(),
    listingType: z.enum(["SALE", "RENT"]).optional(),
    locality: z.string().max(150).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    address: z.string().max(5000).nullable().optional(),
    bhk: z.number().int().positive().nullable().optional(),
    area: z.number().positive().nullable().optional(),
    floor: z.number().int().nonnegative().nullable().optional(),
    totalFloors: z.number().int().positive().nullable().optional(),
    furnishing: z.string().max(60).nullable().optional(),
    facing: z.string().max(40).nullable().optional(),
    price: z.number().positive().optional(),
    status: z.string().min(1).max(40).optional(),
    amenities: z.array(z.string().min(1).max(80)).optional(),
    buildingName: z.string().min(1).max(255).optional(),
    unitNo: z.string().min(1).max(100).optional(),
    ownerName: z.string().max(150).nullable().optional(),
    ownerPhone: z.string().max(30).nullable().optional(),
    assigneeId: z.string().uuid().nullable().optional(),
    version: z.number().int().positive(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}),
});

export const propertyIdSchema = z.object({
  body: z.object({}),
  params: z.object({
    id: z.string().uuid(),
  }),
  query: z.object({}),
});

export const propertyListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
    listingType: z.enum(["SALE", "RENT"]).optional(),
    assigneeId: z.string().uuid().optional(),
  }),
});

export const bulkPropertySchema = z.object({
  body: z.object({
    ids: z.array(z.string().uuid()).min(1).max(100),
    assigneeId: z.string().uuid().nullable().optional(),
    status: z.string().min(1).max(40).optional(),
    amenity: z.string().trim().min(1).max(80).optional(),
  }).refine(
    (body) => [
      body.assigneeId !== undefined,
      Boolean(body.status),
      Boolean(body.amenity),
    ].filter(Boolean).length === 1,
    "Provide exactly one bulk action."
  ),
  params: z.object({}),
  query: z.object({}),
});