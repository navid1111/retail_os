import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { Filter, ObjectId } from "mongodb";
import { getDB } from "../../db/mongo";
import { storeParamsSchema, storeQuerySchema } from "../validators/store.validators";

export const storeRouter = Router();

type StoreDocument = {
  _id: ObjectId;
  storeCode: string;
  storeName: string;
  address?: string;
  region?: string;
  isActive: boolean;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getStoresHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = storeQuerySchema.parse(req.query);
    const db = getDB();
    const filter: Filter<StoreDocument> = {
      isActive: query.isActive ?? true,
    };

    if (query.region) {
      filter.region = query.region;
    }

    if (query.storeCode) {
      filter.storeCode = query.storeCode.toUpperCase();
    }

    if (query.search) {
      const searchRegex = new RegExp(escapeRegex(query.search), "i");
      filter.$or = [
        { storeName: searchRegex },
        { storeCode: searchRegex },
        { address: searchRegex },
        { region: searchRegex },
      ];
    }

    const stores = await db
      .collection<StoreDocument>("stores")
      .find(filter)
      .sort({ storeName: 1 })
      .toArray();

    res.json(stores);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    res.status(500).json({ error: "Failed to fetch stores" });
  }
};

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

storeRouter.get("/", getStoresHandler);
storeRouter.get("/:storeId", getStoreHandler);
