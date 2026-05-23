import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { askAdminDatabaseAssistant } from "../../services/adminChat.service";
import { createAdminUser, listAdminUsers } from "../../services/adminUser.service";
import { listAdminVisitsWithAnalysis } from "../../services/adminVisit.service";
import { adminChatBodySchema, createAdminUserBodySchema } from "../validators/admin.validators";
import { adminFraudRouter } from "./fraud.routes";

export const adminRouter = Router();

adminRouter.use("/fraud", adminFraudRouter);

export const postAdminChatHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = adminChatBodySchema.parse(req.body);
    const result = await askAdminDatabaseAssistant(body.message);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    Sentry.captureException(error);
    const message =
      error instanceof Error ? error.message : "Failed to process admin chat request";
    res.status(500).json({ error: message });
  }
};

adminRouter.post("/chat", postAdminChatHandler);

export const listAdminVisitsHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await listAdminVisitsWithAnalysis({
      page: Number(req.query.page ?? 1),
      limit: Number(req.query.limit ?? 25),
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      ai:
        req.query.ai === "with" || req.query.ai === "missing" || req.query.ai === "all"
          ? req.query.ai
          : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
    });
    res.json(result);
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "Failed to list visits";
    res.status(500).json({ error: message });
  }
};

adminRouter.get("/visits", listAdminVisitsHandler);

export const listAdminUsersHandler = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await listAdminUsers();
    res.json(users);
  } catch (error) {
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "Failed to list users";
    res.status(500).json({ error: message });
  }
};

export const createAdminUserHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const body = createAdminUserBodySchema.parse(req.body);
    const actorId = (req as any).user?.id || (req as any).user?._id;
    const user = await createAdminUser({ ...body, actorId });
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }

    if (error instanceof Error && error.message === "User already exists") {
      res.status(409).json({ error: error.message });
      return;
    }

    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    res.status(500).json({ error: message });
  }
};

adminRouter.get("/users", listAdminUsersHandler);
adminRouter.post("/users", createAdminUserHandler);
