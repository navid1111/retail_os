import { describe, expect, it, vi } from "vitest";
import { checkInHandler, submitVisitHandler } from "./visit.routes";
import { checkInVisit, submitVisit } from "../../services/visit.service";

vi.mock("../../services/visit.service", () => ({
  checkInVisit: vi.fn(),
  submitVisit: vi.fn(),
}));

const createRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("visit routes", () => {
  it("returns 401 when user is missing", async () => {
    const req: any = { body: {} };
    const res = createRes();

    await checkInHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("creates a visit on check-in", async () => {
    vi.mocked(checkInVisit).mockResolvedValue({ _id: "visit" } as any);

    const req: any = {
      body: { storeId: "507f1f77bcf86cd799439011" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await checkInHandler(req, res);

    expect(checkInVisit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("submits a visit", async () => {
    vi.mocked(submitVisit).mockResolvedValue({ _id: "visit" } as any);

    const req: any = {
      params: { visitId: "507f1f77bcf86cd799439011" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await submitVisitHandler(req, res);

    expect(submitVisit).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      visitId: "507f1f77bcf86cd799439011",
    });
  });
});
