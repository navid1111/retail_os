import { ObjectId } from "mongodb";
import * as Sentry from "@sentry/node";
import { getDB } from "../db/mongo";
import { CloudinaryService, CloudinaryUploadResponse } from "../cloudinary/service";
import { addJobToQueue } from "../queues/queues";
import { auditLog } from "./audit.service";
import { analyzeImageFraud } from "./fraud.service";

export type VisitStatus = "pending" | "processing" | "completed" | "flagged";

export interface VisitImageRecord {
  _id: ObjectId;
  visitId: ObjectId;
  imageUrl: string;
  publicId?: string;
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

export interface ListImagesByRepInput {
  repId: string;
  isRejected?: boolean;
  rejectionReason?: "blurry" | "duplicate" | "exif_old";
  limit?: number;
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

const withTimeout = async <T>(
  label: string,
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

export const uploadVisitImage = async (input: UploadVisitImageInput): Promise<VisitImageRecord> => {
  const db = getDB();
  const visitId = toObjectId(input.visitId, "visitId");
  const repId = toObjectId(input.repId, "repId");

  const visitsCollection = db.collection<{
    _id: ObjectId;
    repId: ObjectId;
    storeId?: ObjectId;
    status?: VisitStatus;
    deletedAt?: Date | null;
    images?: ObjectId[];
  }>("visits");
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

  let permanentFilePath: string | undefined;
  if (input.filePath) {
    const fs = await import("fs/promises");
    const os = await import("os");
    permanentFilePath = `${os.tmpdir()}/visit_img_${Date.now()}_${Math.random().toString(36).slice(2)}.tmp`;
    await fs.copyFile(input.filePath, permanentFilePath);
    try {
      await fs.unlink(input.filePath);
    } catch {
      // Multer temp cleanup is best-effort; the worker uses the copied file.
    }
  }

  const generatedPublicId = input.publicId || `visit_${visitId}_${Date.now()}`;
  const image: VisitImageRecord = {
    _id: new ObjectId(),
    visitId,
    imageUrl: "",
    publicId: generatedPublicId,
    isRejected: false,
    uploadedAt: new Date(),
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
      filePath: permanentFilePath,
      sourceUrl: input.sourceUrl,
      publicId: generatedPublicId,
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
      cloudinaryPublicId: generatedPublicId,
    },
  });

  return image;
};

export const processVisitImageJob = async (jobData: any): Promise<void> => {
  const { imageId, visitId, filePath, sourceUrl, publicId } = jobData;
  const db = getDB();
  const imageIdObj = new ObjectId(imageId);
  const visitIdObj = new ObjectId(visitId);

  try {
    console.log("Image job: uploading source", { imageId, visitId });
    const cloudinaryOptions = publicId ? { public_id: publicId } : undefined;
    const upload = await withTimeout(
      "Cloudinary source upload",
      filePath
        ? CloudinaryService.uploadImage(filePath, cloudinaryOptions)
        : CloudinaryService.uploadFromUrl(sourceUrl, cloudinaryOptions),
      45000
    );

    const imageUrl = resolveImageUrl(upload);
    const fileSizeKb = resolveFileSizeKb(upload.bytes);
    const widthPx = upload.width;
    const heightPx = upload.height;

    let imageInput: Buffer | string = filePath;
    if (!filePath && sourceUrl) {
      const response = await fetch(sourceUrl);
      const arrayBuffer = await response.arrayBuffer();
      imageInput = Buffer.from(arrayBuffer);
    }

    console.log("Image job: running fraud analysis", { imageId, visitId });
    const fraudResult = await withTimeout(
      "Fraud analysis",
      analyzeImageFraud(db, imageIdObj, visitIdObj, imageInput),
      45000
    );

    await db.collection<VisitImageRecord>("visit_images").updateOne(
      { _id: imageIdObj },
      {
        $set: {
          imageUrl,
          fileSizeKb,
          widthPx,
          heightPx,
          blurScore: fraudResult.blurScore,
          imageHash: fraudResult.imageHash,
          isRejected: fraudResult.isRejected,
          ...(fraudResult.rejectionReason
            ? { rejectionReason: fraudResult.rejectionReason }
            : {}),
        },
      }
    );

    // If the image is not rejected and YOLO is enabled, perform YOLO + Gemini audit analysis
    if (!fraudResult.isRejected && process.env.YOLO_ENABLED === "true") {
      try {
        const fs = await import("fs/promises");
        const imageBuffer = typeof imageInput === "string"
          ? await fs.readFile(imageInput)
          : imageInput;

        const { YoloService } = await import("../yolo/service");
        const { GeminiService } = await import("../gemini/service");
        const { AiAnalysis } = await import("../models/AiAnalysis.model");

        console.log("Image job: running YOLO analysis", { imageId, visitId });
        const yoloResult = await withTimeout(
          "YOLO analysis",
          YoloService.predict(imageBuffer, "image.jpg"),
          35000
        );

        // Upload the base64 annotated image from YOLO to Cloudinary
        let annotatedImageUrl = "";
        if (yoloResult.annotatedImage) {
          console.log("Image job: uploading annotated image", { imageId, visitId });
          const uploadResult = await withTimeout(
            "Cloudinary annotated upload",
            CloudinaryService.uploadImage(yoloResult.annotatedImage),
            45000
          );
          annotatedImageUrl = uploadResult.secure_url || uploadResult.url;
        }

        // Generate report using Gemini
        console.log("Image job: generating Gemini report", { imageId, visitId });
        const inputData = yoloResult.rawResponse || yoloResult;
        const report = await withTimeout(
          "Gemini report generation",
          GeminiService.generateSupervisorReport(inputData),
          65000
        );

        // Persist the complete AI analysis payload. Upsert keeps queue retries from duplicating records.
        await AiAnalysis.updateOne(
          { imageId: imageIdObj },
          {
            $set: {
              imageId: imageIdObj,
              visitId: visitIdObj,
              provider: yoloResult.provider,
              modelName: yoloResult.modelName,
              complianceScore: yoloResult.complianceScore,
              productsDetected: yoloResult.productsDetected,
              competitorsDetected: yoloResult.competitorsDetected,
              posmPresent: yoloResult.posmPresent,
              missingSkus: yoloResult.missingSkus,
              issues: yoloResult.issues,
              supervisorSummary: report,
              rawResponse: yoloResult.rawResponse,
              annotatedImageUrl,
              processingMs: yoloResult.processingMs,
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        );

        // Update the visit's overall score with the computed compliance score and mark completed
        await db.collection("visits").updateOne(
          { _id: visitIdObj },
          {
            $set: { overallScore: yoloResult.complianceScore, status: "completed" },
            $unset: { analysisError: "" },
          }
        );
        console.log("Image job: analysis completed", { imageId, visitId });
      } catch (aiError) {
        console.error("AI analysis during background processing failed:", aiError);
        const message = aiError instanceof Error ? aiError.message : String(aiError);
        await db.collection("visits").updateOne(
          { _id: visitIdObj },
          {
            $set: {
              status: "processing",
              analysisError: message,
              analysisFailedAt: new Date(),
            },
          }
        );
        Sentry.captureException(aiError);
      }
    } else {
      // If rejected or YOLO disabled, mark the visit as completed or flagged
      const visitStatus = fraudResult.isRejected ? "flagged" : "completed";
      await db.collection("visits").updateOne(
        { _id: visitIdObj },
        { $set: { status: visitStatus } }
      );

      // If the image was rejected due to fraud, dispatch a WhatsApp alert to the salesperson
      if (fraudResult.isRejected) {
        try {
          const visit = await db.collection("visits").findOne({ _id: visitIdObj });
          if (visit && visit.repId) {
            const rep = await db.collection("user").findOne({ _id: visit.repId });
            const phoneNumber = rep?.whatsapp || rep?.phone;
            if (phoneNumber) {
              const { WhatsAppService } = await import("../whatsapp/service");
              const reason = fraudResult.rejectionReason || "Validation check failed";
              
              // Non-blocking trigger
              await WhatsAppService.sendFraudAlert(phoneNumber, visitId, reason);
            }
          }
        } catch (alertErr) {
          console.error("Failed to trigger WhatsApp alert workflow:", alertErr);
        }
      }
    }
  } catch (error) {
    console.error("Failed to process image job", error);
    throw error;
  } finally {
    if (filePath) {
      const fs = await import("fs/promises");
      await fs.unlink(filePath).catch(() => {});
    }
  }
};

export const listImagesByRep = async (
  input: ListImagesByRepInput
): Promise<unknown[]> => {
  const db = getDB();
  const repId = toObjectId(input.repId, "repId");

  const imageMatch: Record<string, unknown> = {};

  if (input.isRejected !== undefined) {
    imageMatch.isRejected = input.isRejected;
  }

  if (input.rejectionReason) {
    imageMatch.rejectionReason = input.rejectionReason;
  }

  return db
    .collection<VisitImageRecord>("visit_images")
    .aggregate([
      ...(Object.keys(imageMatch).length > 0 ? [{ $match: imageMatch }] : []),
      {
        $lookup: {
          from: "visits",
          localField: "visitId",
          foreignField: "_id",
          as: "visit",
        },
      },
      {
        $unwind: "$visit",
      },
      {
        $match: {
          "visit.repId": repId,
          "visit.deletedAt": null,
        },
      },
      {
        $lookup: {
          from: "stores",
          localField: "visit.storeId",
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
      { $sort: { uploadedAt: -1 } },
      { $limit: input.limit ?? 50 },
      {
        $project: {
          _id: 1,
          visitId: 1,
          imageUrl: 1,
          publicId: 1,
          imageHash: 1,
          exifTakenAt: 1,
          fileSizeKb: 1,
          widthPx: 1,
          heightPx: 1,
          blurScore: 1,
          isRejected: 1,
          rejectionReason: 1,
          uploadedAt: 1,
          hasFraudFlag: 1,
          fraudFlags: 1,
          visit: {
            _id: "$visit._id",
            repId: "$visit.repId",
            storeId: "$visit.storeId",
            status: "$visit.status",
            checkInTime: "$visit.checkInTime",
            checkOutTime: "$visit.checkOutTime",
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
    ])
    .toArray();
};
