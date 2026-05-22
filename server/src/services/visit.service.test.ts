import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { checkInVisit, submitVisit } from "./visit.service";
import { getDB } from "../db/mongo";
import { auditLog } from "./audit.service";

vi.mock("../db/mongo", () => ({
  getDB: vi.fn(),
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

describe("visit.service", () => {
  let collections: Record<string, CollectionMock>;
  let dbMock: DbMock;

  beforeEach(() => {
    collections = {
      stores: createCollectionMock(),
      visits: createCollectionMock(),
      fraud_flags: createCollectionMock(),
    };

    dbMock = {
      collection: (name: string) => collections[name],
    };

    vi.mocked(getDB).mockReturnValue(dbMock as unknown as ReturnType<typeof getDB>);
    vi.clearAllMocks();
  });

  it("creates a pending visit when GPS is within range", async () => {
    const repId = new ObjectId();
    const storeId = new ObjectId();
    const visitId = new ObjectId();

    collections.stores.findOne.mockResolvedValue({
      _id: storeId,
      isActive: true,
      latitude: 23.7806,
      longitude: 90.2794,
      gpsRadiusM: 300,
    });

    collections.visits.insertOne.mockResolvedValue({ insertedId: visitId });

    const visit = await checkInVisit({
      repId: repId.toHexString(),
      storeId: storeId.toHexString(),
      gpsLat: 23.7806,
      gpsLng: 90.2794,
      repNotes: "Arrived on time",
    });

    expect(visit._id).toEqual(visitId);
    expect(visit.status).toBe("pending");
    expect(visit.fraudFlags).toHaveLength(0);
    expect(collections.fraud_flags.insertOne).not.toHaveBeenCalled();
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "visit_create",
        entityType: "visit",
      })
    );
  });

  it("flags a visit when GPS is outside the store radius", async () => {
    const repId = new ObjectId();
    const storeId = new ObjectId();
    const visitId = new ObjectId();
    const flagId = new ObjectId();

    collections.stores.findOne.mockResolvedValue({
      _id: storeId,
      isActive: true,
      latitude: 0,
      longitude: 0,
      gpsRadiusM: 100,
    });

    collections.visits.insertOne.mockResolvedValue({ insertedId: visitId });
    collections.fraud_flags.insertOne.mockResolvedValue({ insertedId: flagId });
    collections.visits.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const visit = await checkInVisit({
      repId: repId.toHexString(),
      storeId: storeId.toHexString(),
      gpsLat: 1,
      gpsLng: 1,
      gpsAccuracyM: 12,
    });

    expect(visit.status).toBe("flagged");
    expect(visit.fraudFlags).toEqual([flagId]);
    expect(collections.fraud_flags.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        visitId,
        fraudType: "gps_mismatch",
        confidence: 1,
        detail: {
          distanceM: 157249,
          limitM: 100,
          storeGps: {
            lat: 0,
            lng: 0,
          },
          checkInGps: {
            lat: 1,
            lng: 1,
            accuracyM: 12,
          },
        },
      })
    );
    expect(collections.visits.updateOne).toHaveBeenCalledWith(
      { _id: visitId, deletedAt: null },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "flagged" }),
        $push: expect.objectContaining({ fraudFlags: flagId }),
      })
    );
  });

  it("submits a pending visit and sets it to processing", async () => {
    const repId = new ObjectId();
    const visitId = new ObjectId();

    collections.visits.findOne.mockResolvedValue({
      _id: visitId,
      repId,
      status: "pending",
      deletedAt: null,
    });

    collections.visits.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

    const visit = await submitVisit({
      visitId: visitId.toHexString(),
      repId: repId.toHexString(),
    });

    expect(visit.status).toBe("processing");
    expect(collections.visits.updateOne).toHaveBeenCalledWith(
      { _id: visitId, repId, deletedAt: null },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "processing" }),
      })
    );
    expect(auditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "visit_submit",
        entityType: "visit",
      })
    );
  });

  it("rejects submit for a non-pending visit", async () => {
    const repId = new ObjectId();
    const visitId = new ObjectId();

    collections.visits.findOne.mockResolvedValue({
      _id: visitId,
      repId,
      status: "processing",
      deletedAt: null,
    });

    await expect(
      submitVisit({
        visitId: visitId.toHexString(),
        repId: repId.toHexString(),
      })
    ).rejects.toThrow("Visit is not in a pending state");
  });
});
