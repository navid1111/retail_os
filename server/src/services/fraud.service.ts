import { Db, Filter, ObjectId } from "mongodb";
import sharp from "sharp";
import { FraudFlag } from "../models/FraudFlag.model";
import type { VisitImageRecord } from "./image.service";

type ImageInput = string | Buffer;

type FraudCandidate = {
  type: "blurry_image" | "duplicate_image";
  confidence: number;
  detail: Record<string, unknown>;
  duplicateOfImageId?: ObjectId;
};

type VisitRepRecord = {
  _id: ObjectId;
  repId: ObjectId;
  deletedAt?: Date | null;
};

export type ImageFraudResult = {
  imageHash: string;
  blurScore: number;
  isRejected: boolean;
  rejectionReason?: "blurry" | "duplicate";
};

export type PublicImageFraudResult = {
  publicId: string;
  imageId: ObjectId;
  hasFraudFlag: boolean;
  fraudFlags: Awaited<ReturnType<typeof FraudFlag.find>>;
};

export type ListVisitImagesInput = {
  visitId?: string;
  publicId?: string;
  rejectionReason?: "blurry" | "duplicate" | "exif_old";
  fraud?: boolean;
  isRejected?: boolean;
};

const LAPLACIAN_KERNEL = [0, -1, 0, -1, 4, -1, 0, -1, 0];
const BLUR_THRESHOLD = 50;
const MIN_BLUR_CONFIDENCE = 0.4;
const DUPLICATE_DISTANCE_THRESHOLD = 20;

const calculateVariance = (data: Buffer): number => {
  const values = Array.from(data);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((x) => Math.pow(x - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
};

export const detectBlur = async (
  imagePath: ImageInput
): Promise<{ variance: number; isBlurry: boolean; confidence: number }> => {
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(300, 300, { fit: "cover" })
    .convolve({
      width: 3,
      height: 3,
      kernel: LAPLACIAN_KERNEL,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const variance = calculateVariance(data);
  const isBlurry = variance < BLUR_THRESHOLD;
  const confidence = Math.min(Math.abs(variance - BLUR_THRESHOLD) / BLUR_THRESHOLD, 1);

  return {
    variance,
    isBlurry,
    confidence,
  };
};

export const computePHash = async (input: ImageInput): Promise<string> => {
  const pixels = await sharp(input)
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();

  const dct = computeDCT(pixels, 32);
  const block: number[] = [];

  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      block.push(dct[y * 32 + x]);
    }
  }

  const sum = block.reduce((s, v) => s + v, 0) - block[0];
  const mean = sum / 63;
  const bits = block.map((v) => (v > mean ? 1 : 0));

  let hash = "";
  for (let i = 0; i < 64; i += 4) {
    hash += (bits[i] * 8 + bits[i + 1] * 4 + bits[i + 2] * 2 + bits[i + 3]).toString(16);
  }
  return hash;
};

const computeDCT = (pixels: Buffer, size: number): number[] => {
  const out = new Array(size * size).fill(0);

  for (let u = 0; u < size; u++) {
    for (let v = 0; v < size; v++) {
      let sum = 0;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          sum +=
            pixels[y * size + x] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
        }
      }
      out[u * size + v] = sum;
    }
  }

  return out;
};

export const hammingDistance = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) {
    return Infinity;
  }

  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    dist += xor.toString(2).split("1").length - 1;
  }
  return dist;
};

export const analyzeImageFraud = async (
  db: Db,
  imageId: ObjectId,
  visitId: ObjectId,
  imageInput: ImageInput
): Promise<ImageFraudResult> => {
  const [blurResult, imageHash] = await Promise.all([
    detectBlur(imageInput),
    computePHash(imageInput),
  ]);

  const fraudCandidates: FraudCandidate[] = [];

  if (blurResult.isBlurry && blurResult.confidence >= MIN_BLUR_CONFIDENCE) {
    fraudCandidates.push({
      type: "blurry_image",
      confidence: blurResult.confidence,
      detail: { blurScore: blurResult.variance },
    });
  }

  const visit = await db
    .collection<VisitRepRecord>("visits")
    .findOne({ _id: visitId, deletedAt: null });

  const otherImages = visit
    ? await db
        .collection<VisitImageRecord>("visit_images")
        .aggregate<VisitImageRecord>([
          {
            $match: {
              _id: { $ne: imageId },
              imageHash: { $exists: true },
            },
          },
          {
            $lookup: {
              from: "visits",
              localField: "visitId",
              foreignField: "_id",
              as: "visit",
            },
          },
          { $unwind: "$visit" },
          {
            $match: {
              "visit.repId": visit.repId,
              "visit.deletedAt": null,
            },
          },
        ])
        .toArray()
    : [];

  for (const other of otherImages) {
    if (!other.imageHash) {
      continue;
    }

    const pHashDistance = hammingDistance(imageHash, other.imageHash);
    if (pHashDistance <= DUPLICATE_DISTANCE_THRESHOLD) {
      fraudCandidates.push({
        type: "duplicate_image",
        confidence: 1,
        detail: { pHashDistance },
        duplicateOfImageId: other._id,
      });
      break;
    }
  }

  for (const fraud of fraudCandidates) {
    await FraudFlag.create({
      visitId,
      imageId,
      fraudType: fraud.type,
      confidence: fraud.confidence,
      detail: fraud.detail,
      duplicateOfImageId: fraud.duplicateOfImageId,
      createdAt: new Date(),
    });
  }

  return {
    imageHash,
    blurScore: blurResult.variance,
    isRejected: fraudCandidates.length > 0,
    rejectionReason: fraudCandidates.some((fraud) => fraud.type === "duplicate_image")
      ? "duplicate"
      : fraudCandidates.length > 0
        ? "blurry"
        : undefined,
  };
};

export const getImageFraudByPublicId = async (
  db: Db,
  publicId: string
): Promise<PublicImageFraudResult | null> => {
  const image = await db.collection<VisitImageRecord>("visit_images").findOne({ publicId });

  if (!image) {
    return null;
  }

  const fraudFlags = await FraudFlag.find({ imageId: image._id });

  return {
    publicId,
    imageId: image._id,
    hasFraudFlag: fraudFlags.length > 0,
    fraudFlags,
  };
};

export const getImageFraudByImageId = async (
  db: Db,
  imageId: string
): Promise<PublicImageFraudResult | null> => {
  const image = await db
    .collection<VisitImageRecord>("visit_images")
    .findOne({ _id: new ObjectId(imageId) });

  if (!image) {
    return null;
  }

  const fraudFlags = await FraudFlag.find({ imageId: image._id });

  return {
    publicId: image.publicId ?? "",
    imageId: image._id,
    hasFraudFlag: fraudFlags.length > 0,
    fraudFlags,
  };
};

export const listVisitImages = async (db: Db, input: ListVisitImagesInput = {}) => {
  const match: Filter<VisitImageRecord> = {};

  if (input.visitId) {
    match.visitId = new ObjectId(input.visitId);
  }

  if (input.publicId) {
    match.publicId = input.publicId;
  }

  if (input.rejectionReason) {
    match.rejectionReason = input.rejectionReason;
  }

  if (input.isRejected !== undefined) {
    match.isRejected = input.isRejected;
  }

  const pipeline: object[] = [
    { $match: match },
    {
      $lookup: {
        from: "fraud_flags",
        localField: "_id",
        foreignField: "imageId",
        as: "fraudFlags",
      },
    },
    {
      $addFields: {
        hasFraudFlag: { $gt: [{ $size: "$fraudFlags" }, 0] },
      },
    },
  ];

  if (input.fraud !== undefined) {
    pipeline.push({ $match: { hasFraudFlag: input.fraud } });
  }

  pipeline.push({ $sort: { uploadedAt: -1 } });

  return db.collection<VisitImageRecord>("visit_images").aggregate(pipeline).toArray();
};
