import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { auditLog } from "./audit.service";
import { haversineDistanceM } from "../utils/haversine";

export type VisitStatus =
  | "pending"
  | "processing"
  | "completed"
  | "flagged";

/*
|--------------------------------------------------------------------------
| Store Interface
|--------------------------------------------------------------------------
| This fixes the TypeScript error because MongoDB now knows
| what fields exist inside the "stores" collection.
|--------------------------------------------------------------------------
*/
export interface Store {
  _id: ObjectId;
  name: string;
  latitude?: number;
  longitude?: number;
  gpsRadiusM?: number;
  isActive: boolean;
}

export interface VisitRecord {
  _id: ObjectId;
  repId: ObjectId;
  storeId: ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracyM?: number;
  status: VisitStatus;
  overallScore?: number;
  repNotes?: string;
  images: ObjectId[];
  fraudFlags: ObjectId[];
  deletedAt: Date | null;
  createdAt: Date;
}

export interface CheckInVisitInput {
  repId: string;
  storeId: string;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracyM?: number;
  repNotes?: string;
}

export interface SubmitVisitInput {
  visitId: string;
  repId: string;
}

export interface ListVisitsByRepInput {
  repId: string;
  status?: VisitStatus;
  limit?: number;
}

const toObjectId = (
  value: string,
  fieldName: string
): ObjectId => {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return new ObjectId(value);
};

const resolveGpsMismatchDistance = (
  store: {
    latitude?: number;
    longitude?: number;
    gpsRadiusM?: number;
  },
  input: {
    gpsLat?: number;
    gpsLng?: number;
  }
): { distanceM: number; limitM: number } | null => {
  if (
    store.latitude === undefined ||
    store.longitude === undefined ||
    input.gpsLat === undefined ||
    input.gpsLng === undefined
  ) {
    return null;
  }

  const distanceM = haversineDistanceM(
    {
      latitude: store.latitude,
      longitude: store.longitude,
    },
    {
      latitude: input.gpsLat,
      longitude: input.gpsLng,
    }
  );

  const limitM = store.gpsRadiusM ?? 300;

  if (distanceM <= limitM) {
    return null;
  }

  return {
    distanceM,
    limitM,
  };
};

export const checkInVisit = async (
  input: CheckInVisitInput
): Promise<VisitRecord> => {
  const db = getDB();

  const repId = toObjectId(input.repId, "repId");
  const storeId = toObjectId(input.storeId, "storeId");

  /*
  |--------------------------------------------------------------------------
  | FIXED HERE
  |--------------------------------------------------------------------------
  | collection<Store>("stores")
  | tells MongoDB + TypeScript that this collection
  | contains Store documents.
  |--------------------------------------------------------------------------
  */
  const store = await db
    .collection<Store>("stores")
    .findOne({
      _id: storeId,
      isActive: true,
    });

  if (!store) {
    throw new Error("Store not found or inactive");
  }

  const now = new Date();

  const visit: VisitRecord = {
    _id: new ObjectId(),
    repId,
    storeId,
    checkInTime: now,
    gpsLat: input.gpsLat,
    gpsLng: input.gpsLng,
    gpsAccuracyM: input.gpsAccuracyM,
    status: "pending",
    repNotes: input.repNotes,
    images: [],
    fraudFlags: [],
    deletedAt: null,
    createdAt: now,
  };

  const insertResult = await db
    .collection<VisitRecord>("visits")
    .insertOne(visit);

  visit._id = insertResult.insertedId;

  const mismatch = resolveGpsMismatchDistance(
    store,
    input
  );

  if (mismatch) {
    const fraudFlag = {
      visitId: visit._id,
      fraudType: "gps_mismatch",
      confidence: 1,
      detail: {
        distanceM: Math.round(mismatch.distanceM),
        limitM: mismatch.limitM,
        storeGps: {
          lat: store.latitude,
          lng: store.longitude,
        },
        checkInGps: {
          lat: input.gpsLat,
          lng: input.gpsLng,
          accuracyM: input.gpsAccuracyM,
        },
      },
      resolution: "pending",
      deletedAt: null,
      createdAt: now,
    };

    const fraudResult = await db
      .collection("fraud_flags")
      .insertOne(fraudFlag);

    await db.collection<VisitRecord>("visits").updateOne(
      {
        _id: visit._id,
        deletedAt: null,
      },
      {
        $set: {
          status: "flagged",
        },
        $push: {
          fraudFlags: fraudResult.insertedId,
        },
      }
    );

    visit.status = "flagged";
    visit.fraudFlags = [fraudResult.insertedId];
  }

  await auditLog({
    actorId: repId.toHexString(),
    action: "visit_create",
    entityType: "visit",
    entityId: visit._id.toHexString(),
    meta: {
      storeId: storeId.toHexString(),
    },
  });

  return visit;
};

export const submitVisit = async (
  input: SubmitVisitInput
): Promise<VisitRecord> => {
  const db = getDB();

  const visitId = toObjectId(
    input.visitId,
    "visitId"
  );

  const repId = toObjectId(
    input.repId,
    "repId"
  );

  const visit = await db
    .collection<VisitRecord>("visits")
    .findOne({
      _id: visitId,
      repId,
      deletedAt: null,
    });

  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.status !== "pending") {
    throw new Error(
      "Visit is not in a pending state"
    );
  }

  const checkOutTime = new Date();

  await db.collection<VisitRecord>("visits").updateOne(
    {
      _id: visitId,
      repId,
      deletedAt: null,
    },
    {
      $set: {
        status: "processing",
        checkOutTime,
      },
      $unset: {
        analysisError: "",
        analysisFailedAt: "",
      },
    }
  );

  await auditLog({
    actorId: repId.toHexString(),
    action: "visit_submit",
    entityType: "visit",
    entityId: visitId.toHexString(),
  });

  return {
    ...visit,
    status: "processing",
    checkOutTime,
  };
};

export const listVisitsByRep = async (
  input: ListVisitsByRepInput
): Promise<unknown[]> => {
  const db = getDB();
  const repId = toObjectId(input.repId, "repId");

  const match: Record<string, unknown> = {
    repId,
    deletedAt: null,
  };

  if (input.status) {
    match.status = input.status;
  }

  return db
    .collection<VisitRecord>("visits")
    .aggregate([
      { $match: match },
      { $sort: { checkInTime: -1, createdAt: -1 } },
      { $limit: input.limit ?? 50 },
      {
        $lookup: {
          from: "stores",
          localField: "storeId",
          foreignField: "_id",
          as: "store",
        },
      },
      {
        $unwind: {
          path: "$store",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          repId: 1,
          storeId: 1,
          checkInTime: 1,
          checkOutTime: 1,
          gpsLat: 1,
          gpsLng: 1,
          gpsAccuracyM: 1,
          status: 1,
          overallScore: 1,
          repNotes: 1,
          images: 1,
          fraudFlags: 1,
          createdAt: 1,
          store: {
            _id: "$store._id",
            storeCode: "$store.storeCode",
            storeName: "$store.storeName",
            address: "$store.address",
            region: "$store.region",
          },
        },
      },
    ])
    .toArray();
};
