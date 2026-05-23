import { Document, ObjectId } from "mongodb";
import { getDB } from "../db/mongo";

export type AdminVisitListInput = {
  page?: number;
  limit?: number;
  status?: string;
  ai?: "all" | "with" | "missing";
  search?: string;
};

export type AdminVisitListResult = {
  items: unknown[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const listAdminVisitsWithAnalysis = async (
  input: AdminVisitListInput = {}
): Promise<AdminVisitListResult> => {
  const db = getDB();
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(input.limit ?? 25, 100));
  const skip = (page - 1) * limit;
  const match: Document = { deletedAt: null };

  if (input.status && input.status !== "all") {
    match.status = input.status;
  }

  const search = input.search?.trim();
  const searchMatch: Document[] = [];
  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    searchMatch.push({
      $match: {
        $or: [
          { status: searchRegex },
          { "store.storeCode": searchRegex },
          { "store.storeName": searchRegex },
          { "store.region": searchRegex },
          { "rep.fullName": searchRegex },
          { "rep.email": searchRegex },
          { "seedRep.fullName": searchRegex },
          { "seedRep.email": searchRegex },
        ],
      },
    });
  }

  const aiMatch: Document[] = [];
  if (input.ai === "with") {
    aiMatch.push({ $match: { aiAnalysis: { $ne: null } } });
  } else if (input.ai === "missing") {
    aiMatch.push({ $match: { aiAnalysis: null } });
  }

  const [result] = await db
    .collection("visits")
    .aggregate([
      { $match: match },
      { $sort: { checkInTime: -1, createdAt: -1, _id: -1 } },
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
          from: "user",
          localField: "repId",
          foreignField: "_id",
          as: "rep",
        },
      },
      { $unwind: { path: "$rep", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "repId",
          foreignField: "_id",
          as: "seedRep",
        },
      },
      { $unwind: { path: "$seedRep", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "visit_images",
          localField: "_id",
          foreignField: "visitId",
          as: "images",
        },
      },
      {
        $lookup: {
          from: "ai_analyses",
          let: { visitId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$visitId", "$$visitId"] } } },
            { $sort: { createdAt: -1, _id: -1 } },
            { $limit: 1 },
          ],
          as: "aiAnalysis",
        },
      },
      { $unwind: { path: "$aiAnalysis", preserveNullAndEmptyArrays: true } },
      ...searchMatch,
      ...aiMatch,
      {
        $project: {
          _id: { $toString: "$_id" },
          repId: { $toString: "$repId" },
          storeId: { $toString: "$storeId" },
          checkInTime: 1,
          checkOutTime: 1,
          status: 1,
          overallScore: 1,
          createdAt: 1,
          store: {
            _id: { $toString: "$store._id" },
            storeCode: "$store.storeCode",
            storeName: "$store.storeName",
            address: "$store.address",
            region: "$store.region",
          },
          rep: {
            _id: { $toString: { $ifNull: ["$rep._id", "$seedRep._id"] } },
            fullName: { $ifNull: ["$rep.fullName", "$seedRep.fullName"] },
            email: { $ifNull: ["$rep.email", "$seedRep.email"] },
            region: { $ifNull: ["$rep.region", "$seedRep.region"] },
          },
          images: {
            $map: {
              input: "$images",
              as: "image",
              in: {
                _id: { $toString: "$$image._id" },
                imageUrl: "$$image.imageUrl",
                uploadedAt: "$$image.uploadedAt",
                isRejected: "$$image.isRejected",
                rejectionReason: "$$image.rejectionReason",
              },
            },
          },
          aiAnalysis: {
            $cond: [
              "$aiAnalysis",
              {
                _id: { $toString: "$aiAnalysis._id" },
                imageId: { $toString: "$aiAnalysis.imageId" },
                provider: "$aiAnalysis.provider",
                modelName: "$aiAnalysis.modelName",
                complianceScore: "$aiAnalysis.complianceScore",
                productsDetected: "$aiAnalysis.productsDetected",
                competitorsDetected: "$aiAnalysis.competitorsDetected",
                posmPresent: "$aiAnalysis.posmPresent",
                missingSkus: "$aiAnalysis.missingSkus",
                issues: "$aiAnalysis.issues",
                supervisorSummary: "$aiAnalysis.supervisorSummary",
                annotatedImageUrl: "$aiAnalysis.annotatedImageUrl",
                processingMs: "$aiAnalysis.processingMs",
                createdAt: "$aiAnalysis.createdAt",
              },
              null,
            ],
          },
        },
      },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          meta: [{ $count: "total" }],
        },
      },
    ])
    .toArray();

  const total = Number((result?.meta as Array<{ total: number }> | undefined)?.[0]?.total ?? 0);

  return {
    items: (result?.items as unknown[] | undefined) ?? [],
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
};

export const getAdminVisitWithAnalysis = async (visitId: string): Promise<unknown | null> => {
  if (!ObjectId.isValid(visitId)) {
    throw new Error("Invalid visitId");
  }

  const { items } = await listAdminVisitsWithAnalysis({ limit: 200 });
  const [visit] = items;
  if (visit && typeof visit === "object" && (visit as { _id?: string })._id === visitId) {
    return visit;
  }

  const db = getDB();
  const [result] = await db
    .collection("visits")
    .aggregate([
      { $match: { _id: new ObjectId(visitId), deletedAt: null } },
      { $limit: 1 },
      {
        $lookup: {
          from: "ai_analyses",
          localField: "_id",
          foreignField: "visitId",
          as: "aiAnalysis",
        },
      },
    ])
    .toArray();

  return result ?? null;
};
