import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import multer from "multer";
import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { getRedis } from "../db/redis";
import { CloudinaryService } from "../cloudinary/service";
import { requireAuth, requireRole } from "../middleware/auth";

import { YoloService } from "../yolo/service";
import { GeminiService } from "../gemini/service";

const yoloUpload = multer({ storage: multer.memoryStorage() });
import { visitRouter } from "./routes/visit.routes";
import { imageRouter, visitImageRouter } from "./routes/image.routes";
import { storeRouter } from "./routes/store.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { adminRouter } from "./routes/admin.routes";
import { fraudRouter } from "./routes/fraud.routes";
import { upload } from "../middleware/upload";


const router = Router();

// Register sub-routers under authenticated path
router.use("/visits", requireAuth, requireRole("rep"), visitRouter);
router.use("/visits", requireAuth, requireRole("rep"), visitImageRouter);
router.use("/images", requireAuth, requireRole("rep"), imageRouter);
router.use("/stores", requireAuth, requireRole("rep"), storeRouter);
router.use("/dashboard", requireAuth, requireRole("rep"), dashboardRouter);
router.use("/fraud", requireAuth, requireRole("rep"), fraudRouter);
router.use("/admin", requireAuth, requireRole("admin"), adminRouter);

router.get("/test", async (req: Request, res: Response): Promise<void> => {
  try {
    const db = getDB();
    const redis = getRedis();

    const cachedUsers = await redis.get("users");

    if (cachedUsers) {
      res.json(JSON.parse(cachedUsers));
      return;
    }

    const users = await db.collection("users").findOne({});
    await redis.setEx("users", 3600, JSON.stringify(users));

    res.json(users);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/upload/image", upload, async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, publicId: publicIdRaw } = req.body;
    const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

    if (!filePath) {
      res.status(400).json({ error: "filePath is required" });
      return;
    }

    const result = await CloudinaryService.uploadImage(filePath, {
      public_id: publicId,
    });

    res.json(result);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Upload failed: ${err}` });
  }
});

router.post("/upload/url", async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, publicId: publicIdRaw } = req.body;
    const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

    if (!url) {
      res.status(400).json({ error: "url is required" });
      return;
    }

    const result = await CloudinaryService.uploadFromUrl(url, {
      public_id: publicId,
    });

    res.json(result);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Upload failed: ${err}` });
  }
});

router.post("/upload/video", async (req: Request, res: Response): Promise<void> => {
  try {
    const { filePath, publicId: publicIdRaw } = req.body;
    const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

    if (!filePath) {
      res.status(400).json({ error: "filePath is required" });
      return;
    }

    const result = await CloudinaryService.uploadVideo(filePath, {
      public_id: publicId,
    });

    res.json(result);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Upload failed: ${err}` });
  }
});

router.delete("/assets/:publicId", async (req: Request, res: Response): Promise<void> => {
  try {
    const { publicId: publicIdRaw } = req.params;
    const publicId = Array.isArray(publicIdRaw) ? publicIdRaw[0] : publicIdRaw;
    const result = await CloudinaryService.deleteAsset(publicId);
    res.json(result);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Delete failed: ${err}` });
  }
});

router.get("/me", requireAuth, (req: Request, res: Response): void => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: "Unauthorized - No user found" });
    return;
  }
  res.json({ user });
});

router.get("/yolo/health", async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await YoloService.healthCheck();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: `YOLO health check failed: ${err}` });
  }
});

router.post("/yolo/predict", yoloUpload.single("file"), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided. Use form-data with key 'file'" });
      return;
    }

    const result = await YoloService.predict(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (err) {
    Sentry.captureException(err);
    res.status(500).json({ error: `YOLO prediction failed: ${err}` });
  }
});

router.post("/yolo/report", async (req: Request, res: Response): Promise<void> => {
  try {
    const inputData = req.body?.rawResponse || req.body;
    const report = await GeminiService.generateSupervisorReport(inputData);
    res.json({ report });
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Report generation failed: ${err.message}` });
  }
});

router.post(
  "/yolo/analyze",
  requireAuth,
  requireRole("rep"),
  yoloUpload.single("file"),
  async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided. Use form-data with key 'file'" });
      return;
    }

    const db = getDB();
    const visitIdRaw = typeof req.body?.visitId === "string" ? req.body.visitId : undefined;
    const storeIdRaw = typeof req.body?.storeId === "string" ? req.body.storeId : undefined;
    let visitId = visitIdRaw && ObjectId.isValid(visitIdRaw) ? new ObjectId(visitIdRaw) : undefined;
    const user = (req as any).user;
    const repIdRaw = user?._id ?? user?.id;
    const repId = repIdRaw && ObjectId.isValid(repIdRaw) ? new ObjectId(repIdRaw) : undefined;

    let imageId: ObjectId | undefined;
    if (visitId) {
      const visit = await db.collection("visits").findOne({
        _id: visitId,
        ...(repId ? { repId } : {}),
        deletedAt: null,
      });

      if (!visit) {
        res.status(404).json({ error: "Visit not found" });
        return;
      }
    } else if (storeIdRaw) {
      if (!repId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      if (!ObjectId.isValid(storeIdRaw)) {
        res.status(400).json({ error: "Invalid storeId" });
        return;
      }

      const storeId = new ObjectId(storeIdRaw);
      const store = await db.collection("stores").findOne({ _id: storeId });
      if (!store) {
        res.status(404).json({ error: "Store not found" });
        return;
      }

      const insertVisitResult = await db.collection("visits").insertOne({
        repId,
        storeId,
        checkInTime: new Date(),
        checkOutTime: new Date(),
        status: "processing",
        images: [],
        fraudFlags: [],
        deletedAt: null,
        createdAt: new Date(),
      });
      visitId = insertVisitResult.insertedId;
    }

    const prediction = await YoloService.predict(req.file.buffer, req.file.originalname);

    let sourceImageUrl = "";
    let sourcePublicId = "";
    let sourceWidth: number | undefined;
    let sourceHeight: number | undefined;
    let sourceBytes: number | undefined;

    if (visitId) {
      const sourceDataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      const sourceUpload = await CloudinaryService.uploadImage(sourceDataUri, {
        public_id: `visit_${visitId.toHexString()}_${Date.now()}`,
      });
      sourceImageUrl = sourceUpload.secure_url || sourceUpload.url;
      sourcePublicId = sourceUpload.public_id;
      sourceWidth = sourceUpload.width;
      sourceHeight = sourceUpload.height;
      sourceBytes = sourceUpload.bytes;
    }

    // Upload the base64-encoded image to Cloudinary
    let cloudinaryUrl = "";
    if (prediction.annotatedImage) {
      const uploadResult = await CloudinaryService.uploadImage(prediction.annotatedImage);
      cloudinaryUrl = uploadResult.secure_url || uploadResult.url;
    }

    // Replace the heavy base64 string with the clean Cloudinary URL
    prediction.annotatedImage = cloudinaryUrl;

    const inputData = prediction.rawResponse || prediction;
    const report = await GeminiService.generateSupervisorReport(inputData);

    if (visitId) {
      imageId = new ObjectId();
      await db.collection("visit_images").insertOne({
        _id: imageId,
        visitId,
        imageUrl: sourceImageUrl,
        publicId: sourcePublicId,
        fileSizeKb: sourceBytes === undefined ? undefined : Math.round(sourceBytes / 1024),
        widthPx: sourceWidth,
        heightPx: sourceHeight,
        isRejected: false,
        uploadedAt: new Date(),
      });

      await db.collection<{ _id: ObjectId; images: ObjectId[] }>("visits").updateOne(
        { _id: visitId },
        {
          $push: { images: imageId },
          $set: { overallScore: prediction.complianceScore, status: "completed" },
          $unset: { analysisError: "", analysisFailedAt: "" },
        }
      );

      const { AiAnalysis } = await import("../models/AiAnalysis.model");
      await AiAnalysis.updateOne(
        { imageId },
        {
          $set: {
            imageId,
            visitId,
            provider: prediction.provider,
            modelName: prediction.modelName,
            complianceScore: prediction.complianceScore,
            productsDetected: prediction.productsDetected ?? [],
            competitorsDetected: prediction.competitorsDetected ?? [],
            posmPresent: prediction.posmPresent,
            missingSkus: prediction.missingSkus ?? [],
            issues: prediction.issues ?? [],
            supervisorSummary: report,
            rawResponse: prediction.rawResponse,
            annotatedImageUrl: cloudinaryUrl,
            processingMs: prediction.processingMs,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );
    }

    res.json({
      prediction,
      report,
      persisted: Boolean(visitId),
      imageId: imageId?.toHexString(),
      visitId: visitId?.toHexString(),
    });
  } catch (err: any) {
    Sentry.captureException(err);
    res.status(500).json({ error: `Analysis failed: ${err.message || err}` });
  }
});

export { router };
