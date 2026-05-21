import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { checkInVisit, submitVisit } from "../../services/visit.service";
import { checkInVisitBodySchema, submitVisitParamsSchema } from "../validators/visit.validators";

export const visitRouter = Router();

const resolveUserId = (req: Request): string | undefined => {
  const user = (req as any).user;
  return user?._id ?? user?.id;
};

export const checkInHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = checkInVisitBodySchema.parse(req.body);
    const visit = await checkInVisit({
      repId,
      storeId: body.storeId,
      gpsLat: body.gpsLat,
      gpsLng: body.gpsLng,
      gpsAccuracyM: body.gpsAccuracyM,
      repNotes: body.repNotes,
    });

    res.status(201).json(visit);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to check in visit" });
  }
};

export const submitVisitHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = submitVisitParamsSchema.parse(req.params);
    const visit = await submitVisit({
      repId,
      visitId: params.visitId,
    });

    res.json(visit);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to submit visit" });
  }
};

visitRouter.post("/check-in", checkInHandler);
visitRouter.post("/:visitId/submit", submitVisitHandler);
