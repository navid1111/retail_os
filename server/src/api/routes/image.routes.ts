import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { uploadVisitImage } from "../../services/image.service";
import {
  getImageFraudByImageId,
  getImageFraudByPublicId,
  listVisitImages,
} from "../../services/fraud.service";
import {
  imageParamsSchema,
  listImagesQuerySchema,
  uploadImageBodySchema,
  uploadImageParamsSchema,
} from "../validators/image.validators";
import { upload } from "../../middleware/upload";
import { getDB } from "../../db/mongo";

export const imageRouter = Router();
export const visitImageRouter = Router();

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

visitImageRouter.post("/:visitId/images", upload, uploadImageHandler);

export const listImagesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const query = listImagesQuerySchema.parse(req.query);
    const images = await listVisitImages(getDB(), query);

    res.status(200).json(images);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch visit images" });
  }
};

export const getImageFraudByIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = imageParamsSchema.parse(req.params);
    const result = await getImageFraudByImageId(getDB(), params.imageId);

    if (!result) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud flags" });
  }
};

export const getImageFraudHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const publicIdRaw = req.params.publicId;
    const publicId = Array.isArray(publicIdRaw) ? publicIdRaw[0] : publicIdRaw;
    if (!publicId) {
      res.status(400).json({ error: "publicId is required" });
      return;
    }

    const result = await getImageFraudByPublicId(getDB(), publicId);

    if (!result) {
      res.status(404).json({ error: "Image not found for the given publicId" });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud flags" });
  }
};

imageRouter.get("/", listImagesHandler);
imageRouter.get("/:imageId/fraud", getImageFraudByIdHandler);
imageRouter.get("/public/:publicId/fraud", getImageFraudHandler);
