import { describe, expect, it, vi, beforeEach } from "vitest";
import { getDashboardFeedHandler, getDashboardChartHandler } from "./dashboard.routes";
import { getDashboardFeed, getDashboardChart } from "../../services/dashboard.service";

vi.mock("../../services/dashboard.service", () => ({
  getDashboardFeed: vi.fn(),
  getDashboardChart: vi.fn(),
}));

const createRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("dashboard routes unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardFeedHandler", () => {
    it("returns 200 and feed data for valid query parameter", async () => {
      const mockFeed = [
        {
          visitId: "v1",
          repName: "Rep A",
          storeName: "Store A",
          checkInTime: new Date(),
          status: "completed",
        },
      ];
      vi.mocked(getDashboardFeed).mockResolvedValue(mockFeed as any);

      const req: any = {
        query: { date: "2026-05-21" },
      };
      const res = createRes();

      await getDashboardFeedHandler(req, res);

      expect(getDashboardFeed).toHaveBeenCalledWith("2026-05-21");
      expect(res.json).toHaveBeenCalledWith(mockFeed);
    });

    it("returns 400 validation error for invalid date", async () => {
      const req: any = {
        query: { date: "not-a-date" },
      };
      const res = createRes();

      await getDashboardFeedHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Validation error" })
      );
      expect(getDashboardFeed).not.toHaveBeenCalled();
    });

    it("returns 500 when service throws an error", async () => {
      vi.mocked(getDashboardFeed).mockRejectedValue(new Error("Service failure"));

      const req: any = {
        query: {},
      };
      const res = createRes();

      await getDashboardFeedHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Service failure" });
    });
  });

  describe("getDashboardChartHandler", () => {
    it("returns 200 and chart data for valid query parameters", async () => {
      const mockChart = [
        {
          visitId: "v1",
          storeName: "Store A",
          complianceScore: 90,
          checkInTime: new Date(),
        },
      ];
      vi.mocked(getDashboardChart).mockResolvedValue(mockChart as any);

      const req: any = {
        query: { startDate: "2026-05-19", endDate: "2026-05-22" },
      };
      const res = createRes();

      await getDashboardChartHandler(req, res);

      expect(getDashboardChart).toHaveBeenCalledWith("2026-05-19", "2026-05-22");
      expect(res.json).toHaveBeenCalledWith(mockChart);
    });

    it("returns 400 validation error for invalid startDate", async () => {
      const req: any = {
        query: { startDate: "bad-date" },
      };
      const res = createRes();

      await getDashboardChartHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Validation error" })
      );
      expect(getDashboardChart).not.toHaveBeenCalled();
    });

    it("returns 500 when service throws an error", async () => {
      vi.mocked(getDashboardChart).mockRejectedValue(new Error("Service failure"));

      const req: any = {
        query: {},
      };
      const res = createRes();

      await getDashboardChartHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Service failure" });
    });
  });
});
