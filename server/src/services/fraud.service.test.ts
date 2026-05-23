import { describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import path from "path";
import { analyzeImageFraud, computePHash } from "./fraud.service";
import { FraudFlag } from "../models/FraudFlag.model";

vi.mock("../models/FraudFlag.model", () => ({
  FraudFlag: {
    create: vi.fn(),
    find: vi.fn(),
  },
}));

describe("analyzeImageFraud", () => {
  it("flags a duplicate image against a previous image from the same sales rep", async () => {
    const imageId = new ObjectId();
    const visitId = new ObjectId();
    const repId = new ObjectId();
    const previousImageId = new ObjectId();
    const previousVisitId = new ObjectId();
    const imagePath = path.resolve(__dirname, "../../media/dup2.jpeg");
    const previousHash = await computePHash(path.resolve(__dirname, "../../media/dup1.jpeg"));
    const visitsFindOne = vi.fn().mockResolvedValue({
      _id: visitId,
      repId,
      deletedAt: null,
    });
    const visitsUpdateOne = vi.fn().mockResolvedValue({ modifiedCount: 1 });
    const aggregate = vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: previousImageId,
          visitId: previousVisitId,
          imageHash: previousHash,
        },
      ]),
    });

    const db = {
      collection: vi.fn((name: string) => {
        if (name === "visits") {
          return { findOne: visitsFindOne, updateOne: visitsUpdateOne };
        }

        return { aggregate };
      }),
    } as any;
    const fraudFlagId = new ObjectId();
    vi.mocked(FraudFlag.create).mockResolvedValue({ _id: fraudFlagId } as any);

    const result = await analyzeImageFraud(db, imageId, visitId, imagePath);

    expect(visitsFindOne).toHaveBeenCalledWith({ _id: visitId, deletedAt: null });
    expect(aggregate).toHaveBeenCalledWith(
      expect.arrayContaining([
        {
          $match: {
            "visit.repId": repId,
            "visit.deletedAt": null,
          },
        },
      ])
    );
    expect(FraudFlag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        visitId,
        imageId,
        fraudType: "duplicate_image",
        duplicateOfImageId: previousImageId,
      })
    );
    expect(visitsUpdateOne).toHaveBeenCalledWith(
      { _id: visitId, deletedAt: null },
      {
        $set: { status: "flagged" },
        $addToSet: {
          fraudFlags: { $each: [fraudFlagId] },
        },
      }
    );
    expect(result.isRejected).toBe(true);
    expect(result.rejectionReason).toBe("duplicate");
  });
});
