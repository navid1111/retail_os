import { describe, expect, it } from "vitest";
import { dashboardFeedQuerySchema, dashboardChartQuerySchema } from "./dashboard.validators";

describe("dashboard validators", () => {
  describe("dashboardFeedQuerySchema", () => {
    it("accepts a valid date string", () => {
      const result = dashboardFeedQuerySchema.safeParse({
        date: "2026-05-21",
      });
      expect(result.success).toBe(true);
    });

    it("accepts a valid ISO timestamp", () => {
      const result = dashboardFeedQuerySchema.safeParse({
        date: "2026-05-21T11:00:00Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty/missing date", () => {
      const result = dashboardFeedQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects an invalid date format", () => {
      const result = dashboardFeedQuerySchema.safeParse({
        date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("dashboardChartQuerySchema", () => {
    it("accepts valid start and end dates", () => {
      const result = dashboardChartQuerySchema.safeParse({
        startDate: "2026-05-19",
        endDate: "2026-05-22T23:59:59Z",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty query parameters", () => {
      const result = dashboardChartQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects invalid startDate", () => {
      const result = dashboardChartQuerySchema.safeParse({
        startDate: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid endDate", () => {
      const result = dashboardChartQuerySchema.safeParse({
        endDate: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });
});
