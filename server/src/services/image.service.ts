import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { CloudinaryService, CloudinaryUploadResponse } from "../cloudinary/service";
import { addJobToQueue } from "../queues/queues";
import { auditLog } from "./audit.service";

export type VisitStatus = "pending" | "processing" | "completed" | "flagged";

export interface VisitImageRecord {
  _id: ObjectId;
  visitId: ObjectId;
  imageUrl: string;
  imageHash?: string;
  exifTakenAt?: Date;
  fileSizeKb?: number;
  widthPx?: number;
  heightPx?: number;
  blurScore?: number;
  isRejected: boolean;
  rejectionReason?: "blurry" | "duplicate" | "exif_old";
  uploadedAt: Date;
}

export interface UploadVisitImageInput {
  visitId: string;
  repId: string;
  filePath?: string;
  sourceUrl?: string;
  publicId?: string;
}

const toObjectId = (value: string, fieldName: string): ObjectId => {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new ObjectId(value);
};

const resolveImageUrl = (upload: CloudinaryUploadResponse): string => {
  const url = upload.secure_url || upload.url;
  if (!url) {
    throw new Error("Image upload failed");
  }
  return url;
};

const resolveFileSizeKb = (bytes?: number): number | undefined => {
  if (bytes === undefined) {
    return undefined;
  }
  return Math.round(bytes / 1024);
};

export const uploadVisitImage = async (input: UploadVisitImageInput): Promise<VisitImageRecord> => {
  const db = getDB();
  const visitId = toObjectId(input.visitId, "visitId");
  const repId = toObjectId(input.repId, "repId");

  const visitsCollection = db.collection<{ _id: ObjectId; repId: ObjectId; storeId?: ObjectId; status?: VisitStatus; deletedAt?: Date | null; images?: ObjectId[] }>(
    "visits"
  );
  const visit = await visitsCollection.findOne({ _id: visitId, repId, deletedAt: null });

  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.status === "completed") {
    throw new Error("Visit is already completed");
  }

  if (!input.filePath && !input.sourceUrl) {
    throw new Error("Image source is required");
  }

  const cloudinaryOptions = input.publicId ? { public_id: input.publicId } : undefined;
  const upload = input.filePath
    ? await CloudinaryService.uploadImage(input.filePath, cloudinaryOptions)
    : await CloudinaryService.uploadFromUrl(input.sourceUrl as string, cloudinaryOptions);

  const now = new Date();
  const image: VisitImageRecord = {
    _id: new ObjectId(),
    visitId,
    imageUrl: resolveImageUrl(upload),
    fileSizeKb: resolveFileSizeKb(upload.bytes),
    widthPx: upload.width,
    heightPx: upload.height,
    isRejected: false,
    uploadedAt: now,
  };

  const imagesCollection = db.collection<VisitImageRecord>("visit_images");
  const insertResult = await imagesCollection.insertOne(image);
  image._id = insertResult.insertedId;

  await visitsCollection.updateOne(
    { _id: visitId, repId, deletedAt: null },
    { $push: { images: image._id } }
  );

  await addJobToQueue(
    "PROCESS_IMAGE",
    "process-image",
    {
      imageId: image._id.toHexString(),
      visitId: visitId.toHexString(),
      storeId: visit.storeId?.toHexString?.() ?? visit.storeId?.toString?.(),
      imageUrl: image.imageUrl,
    },
    undefined
  );

  await auditLog({
    actorId: repId.toHexString(),
    action: "image_upload",
    entityType: "image",
    entityId: image._id.toHexString(),
    meta: {
      visitId: visitId.toHexString(),
      cloudinaryPublicId: upload.public_id,
    },
  });

  return image;
};
