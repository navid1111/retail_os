import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { uploadVisitImage } from "./image.service";
import { getDB } from "../db/mongo";
import { CloudinaryService } from "../cloudinary/service";
import { addJobToQueue } from "../queues/queues";
import { auditLog } from "./audit.service";

vi.mock("../db/mongo", () => ({
  getDB: vi.fn(),
}));

vi.mock("../cloudinary/service", () => ({
  CloudinaryService: {
    uploadImage: vi.fn(),
    uploadFromUrl: vi.fn(),
  },
}));

vi.mock("../queues/queues", () => ({
  addJobToQueue: vi.fn(),
}));

vi.mock("./audit.service", () => ({
  auditLog: vi.fn(),
}));

type CollectionMock = {
  findOne: ReturnType<typeof vi.fn>;
  insertOne: ReturnType<typeof vi.fn>;
  updateOne: ReturnType<typeof vi.fn>;
};

type DbMock = {
  collection: (name: string) => CollectionMock;
};

const createCollectionMock = (): CollectionMock => ({
  findOne: vi.fn(),
  insertOne: vi.fn(),
  updateOne: vi.fn(),
});

describe("image.service", () => {
  let collections: Record<string, CollectionMock>;
  let dbMock: DbMock;

  beforeEach(() => {
    collections = {
      visits: createCollectionMock(),
      visit_images: createCollectionMock(),
    };

    dbMock = {
      collection: (name: string) => collections[name],
    };

    vi.mocked(getDB).mockReturnValue(dbMock as unknown as ReturnType<typeof getDB>);
    vi.clearAllMocks();
  });

  it("uploads an image, stores it, and enqueues processing", async () => {
    const visitId = new ObjectId();
    const repId = new ObjectId();
    const storeId = new ObjectId();
    const imageId = new ObjectId();

    collections.visits.findOne.mockResolvedValue({
      _id: visitId,
      repId,
      storeId,
      status: "pending",
      deletedAt: null,
    });

    vi.mocked(CloudinaryService.uploadImage).mockResolvedValue({
      public_id: "visit-1",
      secure_url: "https://cdn.example.com/image.jpg",
      url: "https://cdn.example.com/image.jpg",
      format: "jpg",
      resource_type: "image",
      created_at: new Date().toISOString(),
      bytes: 2048,
      width: 1200,
      height: 800,
    });

    collections.visit_images.insertOne.mockResolvedValue({ insertedId: imageId });
    collections.visits.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    vi.mocked(addJobToQueue).mockResolvedValue({ id: "job-1" } as any);

    const result = await uploadVisitImage({
      visitId: visitId.toHexString(),
      repId: repId.toHexString(),
      filePath: "/tmp/photo.jpg",
    });

    expect(result._id).toEqual(imageId);
    expect(result.imageUrl).toBe("https://cdn.example.com/image.jpg");
    expect(collections.visit_images.insertOne).toHaveBeenCalled();
    expect(collections.visits.updateOne).toHaveBeenCalledWith(
      { _id: visitId, repId, deletedAt: null },
      { $push: { images: imageId } }
    );
    expect(addJobToQueue).toHaveBeenCalledWith(
      "PROCESS_IMAGE",
      "process-image",
      expect.objectContaining({
        imageId: imageId.toHexString(),
        visitId: visitId.toHexString(),
        storeId: storeId.toHexString(),
        imageUrl: "https://cdn.example.com/image.jpg",
      }),
      undefined
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "image_upload",
        entityType: "image",
      })
    );
  });

  it("uploads from URL when sourceUrl is provided", async () => {
    const visitId = new ObjectId();
    const repId = new ObjectId();
    const imageId = new ObjectId();

    collections.visits.findOne.mockResolvedValue({
      _id: visitId,
      repId,
      status: "processing",
      deletedAt: null,
    });

    vi.mocked(CloudinaryService.uploadFromUrl).mockResolvedValue({
      public_id: "visit-2",
      secure_url: "https://cdn.example.com/image2.jpg",
      url: "https://cdn.example.com/image2.jpg",
      format: "jpg",
      resource_type: "image",
      created_at: new Date().toISOString(),
      bytes: 512,
      width: 100,
      height: 100,
    });

    collections.visit_images.insertOne.mockResolvedValue({ insertedId: imageId });
    collections.visits.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
    vi.mocked(addJobToQueue).mockResolvedValue({ id: "job-2" } as any);

    const result = await uploadVisitImage({
      visitId: visitId.toHexString(),
      repId: repId.toHexString(),
      sourceUrl: "https://example.com/image.jpg",
    });

    expect(result._id).toEqual(imageId);
    expect(CloudinaryService.uploadFromUrl).toHaveBeenCalledWith(
      "https://example.com/image.jpg",
      undefined
    );
  });

  it("throws when visit is not found", async () => {
    collections.visits.findOne.mockResolvedValue(null);

    await expect(
      uploadVisitImage({
        visitId: new ObjectId().toHexString(),
        repId: new ObjectId().toHexString(),
        filePath: "/tmp/photo.jpg",
      })
    ).rejects.toThrow("Visit not found");
  });

  it("throws when no image source is provided", async () => {
    const visitId = new ObjectId();
    const repId = new ObjectId();

    collections.visits.findOne.mockResolvedValue({
      _id: visitId,
      repId,
      status: "pending",
      deletedAt: null,
    });

    await expect(
      uploadVisitImage({
        visitId: visitId.toHexString(),
        repId: repId.toHexString(),
      })
    ).rejects.toThrow("Image source is required");
  });
});
