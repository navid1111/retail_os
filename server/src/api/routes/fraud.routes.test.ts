import { describe, expect, it, vi } from "vitest";
import {
  getAdminFraudVisitHandler,
  getMyFraudVisitHandler,
  listAdminFraudVisitsHandler,
  listMyFraudVisitsHandler,
  resolveAdminFraudVisitHandler,
} from "./fraud.routes";
import {
  getFraudVisit,
  listFraudVisits,
  resolveFraudVisit,
} from "../../services/fraudReview.service";

vi.mock("../../services/fraudReview.service", () => ({
  getFraudVisit: vi.fn(),
  listFraudVisits: vi.fn(),
  resolveFraudVisit: vi.fn(),
}));

const createRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("fraud routes", () => {
  it("lists fraud visits for the authenticated rep", async () => {
    vi.mocked(listFraudVisits).mockResolvedValue([{ _id: "visit" }] as any);

    const req: any = {
      query: { resolution: "pending", limit: "10" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await listMyFraudVisitsHandler(req, res);

    expect(listFraudVisits).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      resolution: "pending",
      limit: 10,
    });
    expect(res.json).toHaveBeenCalledWith([{ _id: "visit" }]);
  });

  it("returns 401 when rep user is missing", async () => {
    const req: any = { query: {} };
    const res = createRes();

    await listMyFraudVisitsHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns a rep fraud visit detail", async () => {
    vi.mocked(getFraudVisit).mockResolvedValue({ _id: "visit" } as any);

    const req: any = {
      params: { visitId: "507f1f77bcf86cd799439011" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await getMyFraudVisitHandler(req, res);

    expect(getFraudVisit).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
      "507f1f77bcf86cd799439012"
    );
    expect(res.json).toHaveBeenCalledWith({ _id: "visit" });
  });

  it("lists fraud visits for admin", async () => {
    vi.mocked(listFraudVisits).mockResolvedValue([{ _id: "visit" }] as any);

    const req: any = {
      query: {
        repId: "507f1f77bcf86cd799439012",
        resolution: "confirmed",
      },
    };
    const res = createRes();

    await listAdminFraudVisitsHandler(req, res);

    expect(listFraudVisits).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      resolution: "confirmed",
      limit: 50,
    });
  });

  it("returns an admin fraud visit detail", async () => {
    vi.mocked(getFraudVisit).mockResolvedValue({ _id: "visit" } as any);

    const req: any = { params: { visitId: "507f1f77bcf86cd799439011" } };
    const res = createRes();

    await getAdminFraudVisitHandler(req, res);

    expect(getFraudVisit).toHaveBeenCalledWith("507f1f77bcf86cd799439011");
  });

  it("resolves fraud visits for admin", async () => {
    vi.mocked(resolveFraudVisit).mockResolvedValue({ _id: "visit" } as any);

    const req: any = {
      params: { visitId: "507f1f77bcf86cd799439011" },
      body: { resolution: "dismissed", notes: "Legitimate visit" },
      user: { _id: "507f1f77bcf86cd799439099" },
    };
    const res = createRes();

    await resolveAdminFraudVisitHandler(req, res);

    expect(resolveFraudVisit).toHaveBeenCalledWith({
      visitId: "507f1f77bcf86cd799439011",
      resolution: "dismissed",
      notes: "Legitimate visit",
      actorId: "507f1f77bcf86cd799439099",
    });
    expect(res.json).toHaveBeenCalledWith({ _id: "visit" });
  });
});
