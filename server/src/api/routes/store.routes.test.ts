import { describe, expect, it, vi } from "vitest";
import { getStoreHandler, getStoresHandler } from "./store.routes";
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
  it("returns active stores by default", async () => {
    const toArray = vi.fn().mockResolvedValue([{ _id: "store-1" }]);
    const sort = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ sort });
    vi.mocked(getDB).mockReturnValue({
      collection: () => ({ find }),
    } as any);

    const req: any = { query: {} };
    const res = createRes();

    await getStoresHandler(req, res);

    expect(find).toHaveBeenCalledWith({ isActive: true });
    expect(sort).toHaveBeenCalledWith({ storeName: 1 });
    expect(res.json).toHaveBeenCalledWith([{ _id: "store-1" }]);
  });

  it("filters stores by query params", async () => {
    const toArray = vi.fn().mockResolvedValue([]);
    const sort = vi.fn().mockReturnValue({ toArray });
    const find = vi.fn().mockReturnValue({ sort });
    vi.mocked(getDB).mockReturnValue({
      collection: () => ({ find }),
    } as any);

    const req: any = {
      query: {
        region: "Dhaka",
        storeCode: "dhk-001",
        search: "Outlet",
        isActive: "false",
      },
    };
    const res = createRes();

    await getStoresHandler(req, res);

    expect(find).toHaveBeenCalledWith({
      isActive: false,
      region: "Dhaka",
      storeCode: "DHK-001",
      $or: [
        { storeName: expect.any(RegExp) },
        { storeCode: expect.any(RegExp) },
        { address: expect.any(RegExp) },
        { region: expect.any(RegExp) },
      ],
    });
  });

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
