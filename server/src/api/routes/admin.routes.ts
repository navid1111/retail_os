import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { askAdminDatabaseAssistant } from "../../services/adminChat.service";
import { adminChatBodySchema } from "../validators/admin.validators";

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
