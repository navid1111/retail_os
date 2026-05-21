import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { ObjectId } from "mongodb";
import { getDB } from "../../db/mongo";
import { storeParamsSchema } from "../validators/store.validators";

export const storeRouter = Router();

export const getStoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const params = storeParamsSchema.parse(req.params);
    const db = getDB();

    const store = await db
      .collection("stores")
      .findOne({ _id: new ObjectId(params.storeId), isActive: true });

    if (!store) {
      res.status(404).json({ error: "Store not found" });
      return;
    }

    res.json(store);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch store" });
  }
};

storeRouter.get("/:storeId", getStoreHandler);
