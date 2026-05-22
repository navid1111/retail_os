import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { uploadVisitImage } from "../../services/image.service";
import { uploadImageBodySchema, uploadImageParamsSchema } from "../validators/image.validators";
import { upload } from "../../middleware/upload";
import { FraudFlag } from "../../models/FraudFlag.model";
import { getDB } from "../../db/mongo";

export const imageRouter = Router();

const resolveUserId = (req: Request): string | undefined => {
  const user = (req as any).user;
  return user?._id ?? user?.id;
};

export const uploadImageHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = uploadImageParamsSchema.parse(req.params);
    const body = uploadImageBodySchema.parse(req.body);

    const image = await uploadVisitImage({
      repId,
      visitId: params.visitId,
      filePath: body.filePath,
      sourceUrl: body.sourceUrl,
      publicId: body.publicId,
    });

    res.status(201).json(image);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to upload image";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    Sentry.captureException(error);
    res.status(status).json({ error: message });
  }
};

imageRouter.post("/:visitId/images", upload, uploadImageHandler);

export const getImageFraudHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { publicId } = req.params;
    if (!publicId) {
      res.status(400).json({ error: "publicId is required" });
      return;
    }

    const db = getDB();
    const image = await db.collection("visit_images").findOne({ publicId });

    if (!image) {
      res.status(404).json({ error: "Image not found for the given publicId" });
      return;
    }

    const fraudFlags = await FraudFlag.find({ imageId: image._id });

    res.status(200).json({
      publicId,
      imageId: image._id,
      hasFraudFlag: fraudFlags.length > 0,
      fraudFlags,
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud flags" });
  }
};

imageRouter.get("/images/public/:publicId/fraud", getImageFraudHandler);
