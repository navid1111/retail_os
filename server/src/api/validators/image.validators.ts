import { z } from "zod";

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const booleanQuerySchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === "true"));

export const uploadImageParamsSchema = z.object({
  visitId: objectIdSchema,
});

export const imageParamsSchema = z.object({
  imageId: objectIdSchema,
});

export const listImagesQuerySchema = z
  .object({
    visitId: objectIdSchema.optional(),
    publicId: z.string().min(1).optional(),
    rejectionReason: z.enum(["blurry", "duplicate", "exif_old"]).optional(),
    fraud: booleanQuerySchema,
    fraude: booleanQuerySchema,
    isRejected: booleanQuerySchema,
  })
  .transform(({ fraude, ...query }) => ({
    ...query,
    fraud: query.fraud ?? fraude,
  }));

export const uploadImageBodySchema = z
  .object({
    filePath: z.string().min(1).optional(),
    sourceUrl: z.string().url().optional(),
    publicId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.filePath || value.sourceUrl), {
    message: "Either filePath or sourceUrl is required",
  });
