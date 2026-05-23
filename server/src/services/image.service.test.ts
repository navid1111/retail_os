import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { uploadVisitImage } from "./image.service";
import { detectBlur, computePHash, hammingDistance } from "./fraud.service";
import path from "path";
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

vi.mock("fs/promises", () => ({
  default: {
    copyFile: vi.fn(),
    unlink: vi.fn(),
  },
  copyFile: vi.fn(),
  unlink: vi.fn(),
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
    expect(result.imageUrl).toBe(""); // Backgrounded
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
        filePath: expect.any(String),
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
    expect(addJobToQueue).toHaveBeenCalledWith(
      "PROCESS_IMAGE",
      "process-image",
      expect.objectContaining({
        sourceUrl: "https://example.com/image.jpg",
      }),
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

describe("detectBlur", () => {
  it("should detect that media/blury.jpg is blurry", async () => {
    // Determine the absolute path to the blurry image
    const imagePath = path.resolve(__dirname, "../../media/blury.jpg");
    
    const result = await detectBlur(imagePath);

    expect(result).toBeDefined();
    expect(typeof result.variance).toBe("number");
    expect(result.isBlurry).toBe(true);
    expect(result.variance).toBeLessThan(50);
    expect(typeof result.confidence).toBe("number");
  });

  it("should detect that media/dup1.jpeg and media/dup2.jpeg are NOT blurry", async () => {
    const dup1Path = path.resolve(__dirname, "../../media/dup1.jpeg");
    const dup2Path = path.resolve(__dirname, "../../media/dup2.jpeg");
    
    const result1 = await detectBlur(dup1Path);
    const result2 = await detectBlur(dup2Path);

    expect(result1.isBlurry).toBe(false);
    expect(result1.variance).toBeGreaterThanOrEqual(50);
    
    expect(result2.isBlurry).toBe(false);
    expect(result2.variance).toBeGreaterThanOrEqual(50);
  });
});

describe("duplicate image detection", () => {
  it("should compute pHash and detect duplicates with low hamming distance", async () => {
    const dup1Path = path.resolve(__dirname, "../../media/dup1.jpeg");
    const dup2Path = path.resolve(__dirname, "../../media/dup2.jpeg");

    const hash1 = await computePHash(dup1Path);
    const hash2 = await computePHash(dup2Path);

    expect(hash1).toBeDefined();
    expect(hash2).toBeDefined();
    expect(hash1.length).toBe(16);
    expect(hash2.length).toBe(16);

    const distance = hammingDistance(hash1, hash2);
    
    // For duplicates, the hamming distance should be very low (we'll assert <= 20)
    expect(distance).toBeLessThanOrEqual(20);
  });

  it("should NOT detect dup1 and blury as duplicates", async () => {
    const dup1Path = path.resolve(__dirname, "../../media/dup1.jpeg");
    const bluryPath = path.resolve(__dirname, "../../media/blury.jpg");

    const hash1 = await computePHash(dup1Path);
    const hash2 = await computePHash(bluryPath);

    const distance = hammingDistance(hash1, hash2);
    
    // For non-duplicates, the hamming distance should be high
    expect(distance).toBeGreaterThan(20);
  });
});

