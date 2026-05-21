import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../../src/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { _id: "507f1f77bcf86cd799439012" };
    next();
  },
}));

vi.mock("../../src/services/dashboard.service", () => ({
  getDashboardFeed: vi.fn(),
  getDashboardChart: vi.fn(),
}));

import { app } from "../../src/app";
import { getDashboardFeed, getDashboardChart } from "../../src/services/dashboard.service";

describe("dashboard routes integration tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/dashboard/feed", () => {
    it("returns 200 and calls getDashboardFeed with correct arguments", async () => {
      const mockFeed = [
        {
          visitId: "v1",
          repName: "Rep A",
          storeName: "Store A",
          checkInTime: "2026-05-21T11:00:00.000Z",
          status: "completed",
        },
      ];
      vi.mocked(getDashboardFeed).mockResolvedValue(mockFeed as any);

      const response = await request(app)
        .get("/api/dashboard/feed")
        .query({ date: "2026-05-21" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockFeed);
      expect(getDashboardFeed).toHaveBeenCalledWith("2026-05-21");
    });

    it("returns 400 validation error for an invalid date", async () => {
      const response = await request(app)
        .get("/api/dashboard/feed")
        .query({ date: "invalid-date" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation error");
      expect(getDashboardFeed).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/dashboard/chart", () => {
    it("returns 200 and calls getDashboardChart with correct arguments", async () => {
      const mockChart = [
        {
          visitId: "v1",
          storeName: "Store A",
          complianceScore: 85,
          checkInTime: "2026-05-20T11:00:00.000Z",
        },
      ];
      vi.mocked(getDashboardChart).mockResolvedValue(mockChart as any);

      const response = await request(app)
        .get("/api/dashboard/chart")
        .query({ startDate: "2026-05-19", endDate: "2026-05-22" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockChart);
      expect(getDashboardChart).toHaveBeenCalledWith("2026-05-19", "2026-05-22");
    });

    it("returns 400 validation error for an invalid startDate or endDate", async () => {
      const response = await request(app)
        .get("/api/dashboard/chart")
        .query({ startDate: "invalid", endDate: "2026-05-22" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Validation error");
      expect(getDashboardChart).not.toHaveBeenCalled();
    });
  });
});
