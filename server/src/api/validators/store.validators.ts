import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

export const storeParamsSchema = z.object({
  storeId: objectIdSchema,
});

export const storeQuerySchema = z.object({
  region: z.string().trim().min(1).optional(),
  storeCode: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});
