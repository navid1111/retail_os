import { describe, expect, it } from "vitest";
import { storeParamsSchema, storeQuerySchema } from "./store.validators";

describe("store validators", () => {
  it("accepts a valid store id", () => {
    const result = storeParamsSchema.safeParse({
      storeId: "507f1f77bcf86cd799439011",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid store id", () => {
    const result = storeParamsSchema.safeParse({
      storeId: "bad-id",
    });

    expect(result.success).toBe(false);
  });

  it("parses store filters", () => {
    const result = storeQuerySchema.safeParse({
      region: "Dhaka",
      storeCode: "dhk-001",
      search: "outlet",
      isActive: "false",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      region: "Dhaka",
      storeCode: "dhk-001",
      search: "outlet",
      isActive: false,
    });
  });
});
