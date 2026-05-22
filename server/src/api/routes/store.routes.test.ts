import { describe, expect, it, vi } from "vitest";
import { getStoreHandler } from "./store.routes";
import { getDB } from "../../db/mongo";

vi.mock("../../db/mongo", () => ({
  getDB: vi.fn(),
}));

const createRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("store routes", () => {
  it("returns 404 when store is missing", async () => {
    const collection = { findOne: vi.fn().mockResolvedValue(null) };
    vi.mocked(getDB).mockReturnValue({
      collection: () => collection,
    } as any);

    const req: any = { params: { storeId: "507f1f77bcf86cd799439011" } };
    const res = createRes();

    await getStoreHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns store when found", async () => {
    const collection = { findOne: vi.fn().mockResolvedValue({ _id: "store" }) };
    vi.mocked(getDB).mockReturnValue({
      collection: () => collection,
    } as any);

    const req: any = { params: { storeId: "507f1f77bcf86cd799439011" } };
    const res = createRes();

    await getStoreHandler(req, res);

    expect(res.json).toHaveBeenCalledWith({ _id: "store" });
  });
});
