import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardFeed, getDashboardChart } from "./dashboard.service";
import { Visit } from "../models/Visit.model";

vi.mock("../models/Visit.model", () => {
  return {
    Visit: {
      find: vi.fn(),
    },
  };
});

describe("dashboard.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDashboardFeed", () => {
    it("should return formatted chronological feed of visits for a given date", async () => {
      const mockVisits = [
        {
          _id: "v1",
          repId: { _id: "r1", fullName: "Rep One" },
          storeId: { _id: "s1", storeName: "Store One", storeCode: "S1" },
          checkInTime: new Date("2026-05-21T11:00:00Z"),
          checkOutTime: new Date("2026-05-21T11:15:00Z"),
          overallScore: 85,
          status: "completed",
          fraudFlags: ["f1"],
        },
        {
          _id: "v2",
          repId: { _id: "r2", fullName: "Rep Two" },
          storeId: { _id: "s2", storeName: "Store Two", storeCode: "S2" },
          checkInTime: new Date("2026-05-21T10:00:00Z"),
          overallScore: undefined,
          status: "pending",
          fraudFlags: [],
        },
      ];

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockVisits),
      };

      vi.mocked(Visit.find).mockReturnValue(mockQuery as any);

      const feed = await getDashboardFeed("2026-05-21");

      // Verify Mongoose query target parameters
      expect(Visit.find).toHaveBeenCalledWith({
        checkInTime: {
          $gte: new Date("2026-05-21T00:00:00.000Z"),
          $lte: new Date("2026-05-21T23:59:59.999Z"),
        },
        deletedAt: null,
      });

      expect(mockQuery.populate).toHaveBeenCalledWith("repId", "fullName");
      expect(mockQuery.populate).toHaveBeenCalledWith("storeId", "storeName storeCode");
      expect(mockQuery.sort).toHaveBeenCalledWith({ checkInTime: -1 });

      // Verify formatted response
      expect(feed).toHaveLength(2);
      expect(feed[0]).toEqual({
        visitId: "v1",
        repId: "r1",
        repName: "Rep One",
        storeId: "s1",
        storeName: "Store One",
        storeCode: "S1",
        checkInTime: mockVisits[0].checkInTime,
        checkOutTime: mockVisits[0].checkOutTime,
        complianceScore: 85,
        status: "completed",
        hasFraudFlags: true,
        fraudFlagCount: 1,
      });
      expect(feed[1]).toEqual({
        visitId: "v2",
        repId: "r2",
        repName: "Rep Two",
        storeId: "s2",
        storeName: "Store Two",
        storeCode: "S2",
        checkInTime: mockVisits[1].checkInTime,
        checkOutTime: undefined,
        complianceScore: undefined,
        status: "pending",
        hasFraudFlags: false,
        fraudFlagCount: 0,
      });
    });
  });

  describe("getDashboardChart", () => {
    it("should query scored visits in range and return mapped items", async () => {
      const mockVisits = [
        {
          _id: "v1",
          storeId: { _id: "s1", storeName: "Store One", storeCode: "S1" },
          overallScore: 85,
          checkInTime: new Date("2026-05-20T11:00:00Z"),
        },
        {
          _id: "v2",
          storeId: { _id: "s2", storeName: "Store Two", storeCode: "S2" },
          overallScore: 40,
          checkInTime: new Date("2026-05-21T10:00:00Z"),
        },
      ];

      const mockQuery = {
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockResolvedValue(mockVisits),
      };

      vi.mocked(Visit.find).mockReturnValue(mockQuery as any);

      const chart = await getDashboardChart("2026-05-19", "2026-05-22");

      expect(Visit.find).toHaveBeenCalledWith({
        deletedAt: null,
        overallScore: { $exists: true, $ne: null },
        checkInTime: {
          $gte: new Date("2026-05-19"),
          $lte: new Date("2026-05-22"),
        },
      });

      expect(mockQuery.populate).toHaveBeenCalledWith("storeId", "storeName storeCode");
      expect(mockQuery.sort).toHaveBeenCalledWith({ checkInTime: 1 });

      expect(chart).toHaveLength(2);
      expect(chart[0]).toEqual({
        visitId: "v1",
        storeId: "s1",
        storeName: "Store One",
        storeCode: "S1",
        complianceScore: 85,
        checkInTime: mockVisits[0].checkInTime,
      });
    });
  });
});
