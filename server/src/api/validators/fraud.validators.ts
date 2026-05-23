import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const numericQuerySchema = (defaultValue: number, maxValue: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return defaultValue;
      }

      const parsed = Number(value);
      return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), maxValue) : defaultValue;
    });

export const fraudVisitParamsSchema = z.object({
  visitId: objectIdSchema,
});

export const fraudVisitListQuerySchema = z.object({
  resolution: z.enum(["pending", "confirmed", "dismissed"]).optional(),
  repId: objectIdSchema.optional(),
  limit: numericQuerySchema(50, 100),
});

export const resolveFraudVisitBodySchema = z.object({
  resolution: z.enum(["confirmed", "dismissed"]),
  notes: z.string().trim().max(500).optional(),
});
