import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { askAdminDatabaseAssistant } from "../../services/adminChat.service";
import { createAdminUser, listAdminUsers } from "../../services/adminUser.service";
import { adminChatBodySchema, createAdminUserBodySchema } from "../validators/admin.validators";

export const adminRouter = Router();

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
