import request from "supertest";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { _id: "507f1f77bcf86cd799439012" };
    next();
  },
}));

vi.mock("../../src/services/image.service", () => ({
  uploadVisitImage: vi.fn(),
}));

import { app } from "../../src/app";
import { uploadVisitImage } from "../../src/services/image.service";

describe("image routes integration", () => {
  it("uploads a visit image", async () => {
    vi.mocked(uploadVisitImage).mockResolvedValue({ _id: "image-1" } as any);

    const response = await request(app)
      .post("/api/visits/507f1f77bcf86cd799439011/images")
      .send({ filePath: "/tmp/photo.jpg" });

    expect(response.status).toBe(201);
    expect(uploadVisitImage).toHaveBeenCalledWith({
      repId: "507f1f77bcf86cd799439012",
      visitId: "507f1f77bcf86cd799439011",
      filePath: "/tmp/photo.jpg",
      sourceUrl: undefined,
      publicId: undefined,
    });
  });
});
