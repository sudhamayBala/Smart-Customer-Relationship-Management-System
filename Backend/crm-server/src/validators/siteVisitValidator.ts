import { z } from "zod";

const createSiteVisitSchema = z.object({
  body: z.object({
    propertyId: z.string().uuid(),
    agentId: z.string().min(1).optional(),
    clientName: z.string().trim().min(1).max(150),
    clientPhone: z.string().min(5).max(30).optional().nullable(),
    scheduledAt: z.string().datetime(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
    notes: z.string().max(5000).optional().nullable(),
  }),
  params: z.object({}),
  query: z.object({}),
});

const updateSiteVisitSchema = z.object({
  body: z.object({
    agentId: z.string().min(1).optional(),
    clientName: z.string().trim().min(1).max(150).optional(),
    clientPhone: z.string().min(5).max(30).optional().nullable(),
    scheduledAt: z.string().datetime().optional(),
    status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
    notes: z.string().max(5000).optional().nullable(),
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({}),
});

export {
  createSiteVisitSchema,
  updateSiteVisitSchema,
};