import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { ObjectId } from "mongodb";
import { getDB } from "../../db/mongo";
import { checkInVisit, listVisitsByRep, submitVisit } from "../../services/visit.service";
import {
  checkInVisitBodySchema,
  repVisitsParamsSchema,
  submitVisitParamsSchema,
  visitListQuerySchema,
} from "../validators/visit.validators";

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
    const message = error instanceof Error ? error.message : "Failed to check in visit";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    Sentry.captureException(error);
    res.status(status).json({ error: message });
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
    const message = error instanceof Error ? error.message : "Failed to submit visit";
    const status = message.toLowerCase().includes("not found") ? 404 : 400;
    Sentry.captureException(error);
    res.status(status).json({ error: message });
  }
};

export const listRepVisitsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const params = repVisitsParamsSchema.parse(req.params);
    const query = visitListQuerySchema.parse(req.query);

    const visits = await listVisitsByRep({
      repId: params.repId,
      status: query.status,
      limit: query.limit,
    });

    res.json(visits);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch visits" });
  }
};

export const listMyVisitsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const query = visitListQuerySchema.parse(req.query);
    const visits = await listVisitsByRep({
      repId,
      status: query.status,
      limit: query.limit,
    });

    res.json(visits);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch visits" });
  }
};

export const getVisitAnalysisHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { visitId } = req.params;
    if (typeof visitId !== "string") {
      res.status(400).json({ error: "Invalid visitId parameter" });
      return;
    }
    const db = getDB();

    const analysis = await db.collection("aianalyses").findOne({ visitId: new ObjectId(visitId) });

    if (!analysis) {
      const visit = await db.collection("visits").findOne({ _id: new ObjectId(visitId) });
      if (!visit) {
        res.status(404).json({ error: "Visit not found" });
        return;
      }

      if (visit.status === "pending" || visit.status === "processing") {
        res.status(202).json({ status: "processing", message: "AI analysis is currently running in the background." });
        return;
      }

      if (visit.status === "flagged") {
        const image = await db.collection("visit_images").findOne({ visitId: visit._id, isRejected: true });
        const fraudFlag = image ? await db.collection("fraud_flags").findOne({ imageId: image._id }) : null;
        const reason = fraudFlag 
          ? `Image was rejected due to: ${fraudFlag.fraudType.replace("_", " ")}.`
          : "Image was rejected by the fraud detection system (blurry or duplicate).";
        res.status(400).json({ error: "Visit flagged", reason });
        return;
      }

      res.status(404).json({ error: "AI analysis was not performed or failed." });
      return;
    }

    res.json({
      status: "completed",
      prediction: {
        provider: analysis.provider,
        modelName: analysis.modelName,
        complianceScore: analysis.complianceScore,
        productsDetected: analysis.productsDetected,
        competitorsDetected: analysis.competitorsDetected,
        missingSkus: analysis.missingSkus,
        issues: analysis.issues,
        annotatedImage: analysis.annotatedImageUrl,
        processingMs: analysis.processingMs,
      },
      report: analysis.supervisorSummary,
    });
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: `Failed to retrieve analysis: ${error}` });
  }
};

visitRouter.post("/check-in", checkInHandler);
visitRouter.get("/mine", listMyVisitsHandler);
visitRouter.get("/rep/:repId", listRepVisitsHandler);
visitRouter.post("/:visitId/submit", submitVisitHandler);
visitRouter.get("/:visitId/analysis", getVisitAnalysisHandler);
