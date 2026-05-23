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

const formatFraudReason = (value?: string): string | undefined =>
  value?.replace(/_/g, " ");

const resolveVisitFraudState = async (
  db: ReturnType<typeof getDB>,
  visitId: ObjectId
): Promise<{ status: "flagged"; message: string; reason: string } | null> => {
  const image = await db.collection("visit_images").findOne({
    visitId,
    isRejected: true,
  });
  const fraudFlag = await db.collection("fraud_flags").findOne({
    visitId,
    ...(image ? { imageId: image._id } : {}),
  });

  if (!image && !fraudFlag) {
    return null;
  }

  const reason =
    formatFraudReason(fraudFlag?.fraudType) ??
    formatFraudReason(image?.rejectionReason) ??
    "fraud detection";

  return {
    status: "flagged",
    message: "Visit flagged",
    reason: `Image was rejected due to: ${reason}.`,
  };
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
    if (typeof visitId !== "string" || !ObjectId.isValid(visitId)) {
      res.status(400).json({ error: "Invalid visitId parameter" });
      return;
    }
    const db = getDB();
    const visitObjectId = new ObjectId(visitId);

    const visit = await db.collection("visits").findOne({ _id: visitObjectId });
    if (!visit) {
      res.status(404).json({ error: "Visit not found" });
      return;
    }

    const fraudState = await resolveVisitFraudState(db, visitObjectId);
    if (fraudState) {
      res.json(fraudState);
      return;
    }

    const analysis = await db.collection("ai_analyses").findOne({ visitId: visitObjectId });

    if (!analysis) {
      if (visit.analysisError) {
        res.json({
          status: "failed",
          message: visit.analysisError,
          failedAt: visit.analysisFailedAt,
        });
        return;
      }

      if (visit.status === "pending" || visit.status === "processing") {
        const processingStartedAt = visit.checkOutTime ?? visit.createdAt ?? visit.checkInTime;
        const processingAgeMs = processingStartedAt
          ? Date.now() - new Date(processingStartedAt).getTime()
          : 0;

        if (visit.status === "processing" && processingAgeMs > 3 * 60 * 1000) {
          res.json({
            status: "failed",
            message:
              "AI analysis timed out. Check that the YOLO server is running and reachable from the backend.",
          });
          return;
        }

        res.status(202).json({ status: "processing", message: "AI analysis is currently running in the background." });
        return;
      }

      if (visit.status === "flagged") {
        res.json({
          status: "flagged",
          message: "Visit flagged",
          reason: "Image was rejected by the fraud detection system.",
        });
        return;
      }

      res.json({
        status: "failed",
        message:
          "AI analysis was not performed or failed. The visit exists, but no analysis result was saved.",
      });
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
