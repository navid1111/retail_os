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
