import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const checkInVisitBodySchema = z.object({
  storeId: objectIdSchema,
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  gpsAccuracyM: z.number().optional(),
  repNotes: z.string().max(1000).optional(),
});

export const submitVisitParamsSchema = z.object({
  visitId: objectIdSchema,
});

export const repVisitsParamsSchema = z.object({
  repId: objectIdSchema,
});

export const visitListQuerySchema = z.object({
  status: z.enum(["pending", "processing", "completed", "flagged"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
