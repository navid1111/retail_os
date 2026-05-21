import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { uploadVisitImage } from "../../services/image.service";
import { uploadImageBodySchema, uploadImageParamsSchema } from "../validators/image.validators";

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
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

imageRouter.post("/:visitId/images", uploadImageHandler);
