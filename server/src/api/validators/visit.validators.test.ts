import { describe, expect, it } from "vitest";
import { checkInVisitBodySchema, submitVisitParamsSchema } from "./visit.validators";

describe("visit validators", () => {
  it("accepts a valid check-in payload", () => {
    const result = checkInVisitBodySchema.safeParse({
      storeId: "507f1f77bcf86cd799439011",
      gpsLat: 23.7,
      gpsLng: 90.4,
      repNotes: "hello",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing storeId", () => {
    const result = checkInVisitBodySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts valid submit params", () => {
    const result = submitVisitParamsSchema.safeParse({
      visitId: "507f1f77bcf86cd799439011",
    });

    expect(result.success).toBe(true);
  });
});
