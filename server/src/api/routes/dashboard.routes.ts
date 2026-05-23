import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { ZodError } from "zod";
import { getDashboardFeed, getDashboardChart } from "../../services/dashboard.service";
import { dashboardFeedQuerySchema, dashboardChartQuerySchema } from "../validators/dashboard.validators";

export const dashboardRouter = Router();

export const getDashboardFeedHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = dashboardFeedQuerySchema.parse(req.query);
    const feed = await getDashboardFeed(query.date);
    res.json(feed);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard feed";
    res.status(500).json({ error: message });
  }
};

export const getDashboardChartHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = dashboardChartQuerySchema.parse(req.query);
    const chart = await getDashboardChart(query.startDate, query.endDate);
    res.json(chart);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Validation error", details: error.issues });
      return;
    }
    Sentry.captureException(error);
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard chart";
    res.status(500).json({ error: message });
  }
};

dashboardRouter.get("/feed", getDashboardFeedHandler);
dashboardRouter.get("/chart", getDashboardChartHandler);
