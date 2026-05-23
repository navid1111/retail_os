import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import {
  getFraudVisit,
  listFraudVisits,
  resolveFraudVisit,
} from "../../services/fraudReview.service";
import {
  fraudVisitListQuerySchema,
  fraudVisitParamsSchema,
  resolveFraudVisitBodySchema,
} from "../validators/fraud.validators";

export const fraudRouter = Router();
export const adminFraudRouter = Router();

const resolveUserId = (req: Request): string | undefined => {
  const user = (req as any).user;
  return user?._id ?? user?.id;
};

export const listMyFraudVisitsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const query = fraudVisitListQuerySchema.parse(req.query);
    const visits = await listFraudVisits({
      repId,
      resolution: query.resolution,
      limit: query.limit,
    });

    res.json(visits);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud visits" });
  }
};

export const getMyFraudVisitHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const repId = resolveUserId(req);
    if (!repId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const params = fraudVisitParamsSchema.parse(req.params);
    const visit = await getFraudVisit(params.visitId, repId);
    if (!visit) {
      res.status(404).json({ error: "Fraud visit not found" });
      return;
    }

    res.json(visit);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud visit" });
  }
};

export const listAdminFraudVisitsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query = fraudVisitListQuerySchema.parse(req.query);
    const visits = await listFraudVisits({
      repId: query.repId,
      resolution: query.resolution,
      limit: query.limit,
    });

    res.json(visits);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud visits" });
  }
};

export const getAdminFraudVisitHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const params = fraudVisitParamsSchema.parse(req.params);
    const visit = await getFraudVisit(params.visitId);
    if (!visit) {
      res.status(404).json({ error: "Fraud visit not found" });
      return;
    }

    res.json(visit);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch fraud visit" });
  }
};

export const resolveAdminFraudVisitHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const params = fraudVisitParamsSchema.parse(req.params);
    const body = resolveFraudVisitBodySchema.parse(req.body);
    const actorId = resolveUserId(req);

    const visit = await resolveFraudVisit({
      visitId: params.visitId,
      resolution: body.resolution,
      notes: body.notes,
      actorId,
    });

    res.json(visit);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    if (error instanceof Error && error.message === "Fraud visit not found") {
      res.status(404).json({ error: error.message });
      return;
    }

    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to resolve fraud visit" });
  }
};

fraudRouter.get("/visits", listMyFraudVisitsHandler);
fraudRouter.get("/visits/:visitId", getMyFraudVisitHandler);

adminFraudRouter.get("/visits", listAdminFraudVisitsHandler);
adminFraudRouter.get("/visits/:visitId", getAdminFraudVisitHandler);
adminFraudRouter.patch("/visits/:visitId/resolution", resolveAdminFraudVisitHandler);
