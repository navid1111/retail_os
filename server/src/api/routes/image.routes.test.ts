import { describe, expect, it, vi } from "vitest";
import { getImageFraudByIdHandler, listImagesHandler, uploadImageHandler } from "./image.routes";
import { uploadVisitImage } from "../../services/image.service";
import { getImageFraudByImageId, listVisitImages } from "../../services/fraud.service";

vi.mock("../../services/image.service", () => ({
  uploadVisitImage: vi.fn(),
}));

vi.mock("../../services/fraud.service", () => ({
  getImageFraudByImageId: vi.fn(),
  listVisitImages: vi.fn(),
}));

vi.mock("../../db/mongo", () => ({
  getDB: vi.fn(() => ({})),
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

  it("returns fraud status for an image", async () => {
    vi.mocked(getImageFraudByImageId).mockResolvedValue({
      publicId: "visit-public-id",
      imageId: "507f1f77bcf86cd799439011" as any,
      hasFraudFlag: true,
      fraudFlags: [{ fraudType: "blurry_image" }] as any,
    });

    const req: any = {
      params: { imageId: "507f1f77bcf86cd799439011" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await getImageFraudByIdHandler(req, res);

    expect(getImageFraudByImageId).toHaveBeenCalledWith({}, "507f1f77bcf86cd799439011");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        hasFraudFlag: true,
      })
    );
  });

  it("lists visit images with fraud filter", async () => {
    vi.mocked(listVisitImages).mockResolvedValue([{ _id: "img", hasFraudFlag: false }] as any);

    const req: any = {
      query: { fraud: "false", isRejected: "false" },
      user: { _id: "507f1f77bcf86cd799439012" },
    };
    const res = createRes();

    await listImagesHandler(req, res);

    expect(listVisitImages).toHaveBeenCalledWith({}, { fraud: false, isRejected: false });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ _id: "img", hasFraudFlag: false }]);
  });
});
