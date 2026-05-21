import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const uploadImageParamsSchema = z.object({
  visitId: objectIdSchema,
});

export const uploadImageBodySchema = z
  .object({
    filePath: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
    publicId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.filePath || value.sourceUrl), {
    message: "Either filePath or sourceUrl is required",
  });
