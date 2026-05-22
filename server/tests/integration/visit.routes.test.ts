import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { _id: "507f1f77bcf86cd799439012" };
    next();
  },
}));

vi.mock("../../src/services/visit.service", () => ({
  checkInVisit: vi.fn(),
  submitVisit: vi.fn(),
}));

import { app } from "../../src/app";
import { checkInVisit, submitVisit } from "../../src/services/visit.service";

describe("visit routes integration", () => {
  it("checks in a visit", async () => {
    vi.mocked(checkInVisit).mockResolvedValue({ _id: "visit-1" } as any);

    const response = await request(app).post("/api/visits/check-in").send({
      storeId: "507f1f77bcf86cd799439011",
      gpsLat: 23.7,
      gpsLng: 90.4,
    });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ _id: "visit-1" });
  });

  it("submits a visit", async () => {
    vi.mocked(submitVisit).mockResolvedValue({ _id: "visit-2" } as any);

    const response = await request(app)
      .post("/api/visits/507f1f77bcf86cd799439011/submit")
      .send({});

    expect(response.status).toBe(200);
    expect(submitVisit).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      visitId: "507f1f77bcf86cd799439011",
    });
  });
});
