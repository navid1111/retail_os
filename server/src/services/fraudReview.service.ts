import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { auditLog } from "./audit.service";
import type { FraudResolution } from "../models/FraudFlag.model";

export type ListFraudVisitsInput = {
  repId?: string;
  resolution?: FraudResolution;
  limit?: number;
};

export type ResolveFraudVisitInput = {
  visitId: string;
  resolution: Exclude<FraudResolution, "pending">;
  actorId?: string;
  notes?: string;
};

const toObjectId = (value: string, fieldName: string): ObjectId => {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return new ObjectId(value);
};

const buildFraudFlagLookup = (resolution?: FraudResolution) => ({
  $lookup: {
    from: "fraud_flags",
    let: { visitId: "$_id" },
    pipeline: [
      {
        $match: {
          $expr: { $eq: ["$visitId", "$$visitId"] },
          deletedAt: null,
          ...(resolution ? { resolution } : {}),
        },
      },
      { $sort: { createdAt: -1 } },
    ],
    as: "fraudFlags",
  },
});

const fraudVisitPipeline = (input: ListFraudVisitsInput & { visitId?: ObjectId }) => {
  const match: Record<string, unknown> = { deletedAt: null };

  if (input.visitId) {
    match._id = input.visitId;
  }

  if (input.repId) {
    match.repId = toObjectId(input.repId, "repId");
  }

  return [
    { $match: match },
    buildFraudFlagLookup(input.resolution),
    { $match: { "fraudFlags.0": { $exists: true } } },
    {
      $lookup: {
        from: "stores",
        localField: "storeId",
        foreignField: "_id",
        as: "store",
      },
    },
    { $unwind: { path: "$store", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "visit_images",
        localField: "_id",
        foreignField: "visitId",
        as: "images",
      },
    },
    {
      $addFields: {
        fraudFlagCount: { $size: "$fraudFlags" },
        pendingFraudFlagCount: {
          $size: {
            $filter: {
              input: "$fraudFlags",
              as: "flag",
              cond: { $eq: ["$$flag.resolution", "pending"] },
            },
          },
        },
      },
    },
    { $sort: { checkInTime: -1 } },
    { $limit: input.limit ?? 50 },
    {
      $project: {
        _id: 1,
        repId: 1,
        storeId: 1,
        status: 1,
        checkInTime: 1,
        checkOutTime: 1,
        gpsLat: 1,
        gpsLng: 1,
        gpsAccuracyM: 1,
        overallScore: 1,
        repNotes: 1,
        fraudFlags: 1,
        fraudFlagCount: 1,
        pendingFraudFlagCount: 1,
        images: {
          _id: 1,
          imageUrl: 1,
          publicId: 1,
          blurScore: 1,
          isRejected: 1,
          rejectionReason: 1,
          uploadedAt: 1,
        },
        store: {
          _id: "$store._id",
          storeCode: "$store.storeCode",
          storeName: "$store.storeName",
          address: "$store.address",
          region: "$store.region",
        },
      },
    },
  ];
};

export const listFraudVisits = async (input: ListFraudVisitsInput = {}) => {
  const db = getDB();
  return db.collection("visits").aggregate(fraudVisitPipeline(input)).toArray();
};

export const getFraudVisit = async (visitId: string, repId?: string) => {
  const db = getDB();
  const visits = await db
    .collection("visits")
    .aggregate(
      fraudVisitPipeline({
        visitId: toObjectId(visitId, "visitId"),
        repId,
        limit: 1,
      })
    )
    .toArray();

  return visits[0] ?? null;
};

export const resolveFraudVisit = async (input: ResolveFraudVisitInput) => {
  const db = getDB();
  const visitId = toObjectId(input.visitId, "visitId");
  const actorId = input.actorId ? toObjectId(input.actorId, "actorId") : undefined;

  const visit = await db.collection("visits").findOne({ _id: visitId, deletedAt: null });
  if (!visit) {
    throw new Error("Fraud visit not found");
  }

  const flagFilter = { visitId, deletedAt: null };
  const flags = await db.collection("fraud_flags").find(flagFilter).toArray();
  if (flags.length === 0) {
    throw new Error("Fraud visit not found");
  }

  const now = new Date();
  await db.collection("fraud_flags").updateMany(flagFilter, {
    $set: {
      resolution: input.resolution,
      reviewedBy: actorId,
      reviewedAt: now,
      ...(input.notes ? { reviewNotes: input.notes } : {}),
    },
  });

  await db.collection("visits").updateOne(
    { _id: visitId, deletedAt: null },
    {
      $set: {
        status: input.resolution === "confirmed" ? "flagged" : "completed",
      },
    }
  );

  await auditLog({
    actorId: input.actorId,
    action: input.resolution === "confirmed" ? "fraud_confirm" : "fraud_dismiss",
    entityType: "visit",
    entityId: input.visitId,
    meta: {
      flagCount: flags.length,
      notes: input.notes,
    },
  });

  return getFraudVisit(input.visitId);
};
