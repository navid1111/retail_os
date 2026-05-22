import { describe, expect, it, vi } from "vitest";
import { uploadImageHandler } from "./image.routes";
import { uploadVisitImage } from "../../services/image.service";

vi.mock("../../services/image.service", () => ({
  uploadVisitImage: vi.fn(),
}));

const createRes = () => {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("image routes", () => {
  it("returns 401 when user is missing", async () => {
    const req: any = { body: {}, params: {} };
    const res = createRes();

    await uploadImageHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("uploads an image for a visit", async () => {
    vi.mocked(uploadVisitImage).mockResolvedValue({ _id: "img" } as any);

    const req: any = {
      params: { visitId: "507f1f77bcf86cd799439011" },
      body: { filePath: "/tmp/photo.jpg" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await uploadImageHandler(req, res);

    expect(uploadVisitImage).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      visitId: "507f1f77bcf86cd799439011",
      filePath: "/tmp/photo.jpg",
      sourceUrl: undefined,
      publicId: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
