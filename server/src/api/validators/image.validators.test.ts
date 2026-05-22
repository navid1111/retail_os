import { describe, expect, it } from "vitest";
import { uploadImageBodySchema, uploadImageParamsSchema } from "./image.validators";

describe("image validators", () => {
  it("accepts params with a valid visit id", () => {
    const result = uploadImageParamsSchema.safeParse({
      visitId: "507f1f77bcf86cd799439011",
    });

    expect(result.success).toBe(true);
  });

  it("rejects body without a source", () => {
    const result = uploadImageBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts filePath upload", () => {
    const result = uploadImageBodySchema.safeParse({
      filePath: "/tmp/photo.jpg",
    });

    expect(result.success).toBe(true);
  });

  it("accepts sourceUrl upload", () => {
    const result = uploadImageBodySchema.safeParse({
      sourceUrl: "https://example.com/photo.jpg",
    });

    expect(result.success).toBe(true);
  });
});
