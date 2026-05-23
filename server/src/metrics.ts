import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import client from "prom-client";
import { getDB } from "./db/mongo";
import { getRedis } from "./db/redis";

const registry = new client.Registry();

registry.setDefaultLabels({
  app: "retail-os-api",
});

client.collectDefaultMetrics({
  register: registry,
  prefix: "retailos_",
});

const httpRequestsTotal = new client.Counter({
  name: "retailos_http_requests_total",
  help: "Total HTTP requests handled by the Retail OS API.",
  labelNames: ["method", "route", "status_code"] as const,
  registers: [registry],
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "retailos_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["method", "route", "status_code"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
  registers: [registry],
});

const httpInFlightRequests = new client.Gauge({
  name: "retailos_http_in_flight_requests",
  help: "HTTP requests currently being processed.",
  registers: [registry],
});

const mongoConnected = new client.Gauge({
  name: "retailos_mongodb_connected",
  help: "MongoDB connection status. 1 is connected, 0 is disconnected.",
  registers: [registry],
});

const redisConnected = new client.Gauge({
  name: "retailos_redis_connected",
  help: "Redis connection status. 1 is ready, 0 is unavailable.",
  registers: [registry],
});

const visitsTotal = new client.Gauge({
  name: "retailos_visits_total",
  help: "Current number of visits by status.",
  labelNames: ["status"] as const,
  registers: [registry],
});

const visitImagesTotal = new client.Gauge({
  name: "retailos_visit_images_total",
  help: "Current number of visit images grouped by rejection state.",
  labelNames: ["rejected"] as const,
  registers: [registry],
});

const fraudFlagsTotal = new client.Gauge({
  name: "retailos_fraud_flags_total",
  help: "Current number of fraud flags grouped by resolution and type.",
  labelNames: ["resolution", "type"] as const,
  registers: [registry],
});

const storesTotal = new client.Gauge({
  name: "retailos_stores_total",
  help: "Current number of stores grouped by active state.",
  labelNames: ["active"] as const,
  registers: [registry],
});

const aiAnalysesTotal = new client.Gauge({
  name: "retailos_ai_analyses_total",
  help: "Current number of AI analyses saved in MongoDB.",
  registers: [registry],
});

const complianceScoreAverage = new client.Gauge({
  name: "retailos_compliance_score_average",
  help: "Average compliance score across saved AI analyses.",
  registers: [registry],
});

const aiProcessingSecondsAverage = new client.Gauge({
  name: "retailos_ai_processing_seconds_average",
  help: "Average AI analysis processing time in seconds.",
  registers: [registry],
});

const normalizeRoute = (req: Request): string => {
  if (req.route?.path) {
    const routePath = Array.isArray(req.route.path) ? req.route.path[0] : req.route.path;
    return `${req.baseUrl}${routePath}` || "/";
  }

  return req.path
    .replace(/[0-9a-fA-F]{24}/g, ":id")
    .replace(/\d+/g, ":number");
};

const getCountByField = async (
  collectionName: string,
  fieldName: string
): Promise<Array<{ _id: unknown; count: number }>> => {
  return getDB()
    .collection(collectionName)
    .aggregate<{ _id: unknown; count: number }>([
      { $group: { _id: `$${fieldName}`, count: { $sum: 1 } } },
    ])
    .toArray();
};

const getFraudCounts = async (): Promise<Array<{ _id: { resolution?: string; type?: string }; count: number }>> => {
  return getDB()
    .collection("fraud_flags")
    .aggregate<{ _id: { resolution?: string; type?: string }; count: number }>([
      {
        $group: {
          _id: { resolution: "$resolution", type: "$fraudType" },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();
};

const getAiAverages = async (): Promise<{ total: number; avgComplianceScore: number; avgProcessingMs: number }> => {
  const [result] = await getDB()
    .collection("ai_analyses")
    .aggregate<{ total: number; avgComplianceScore: number; avgProcessingMs: number }>([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgComplianceScore: { $avg: "$complianceScore" },
          avgProcessingMs: { $avg: "$processingMs" },
        },
      },
    ])
    .toArray();

  return result ?? { total: 0, avgComplianceScore: 0, avgProcessingMs: 0 };
};

const refreshBusinessMetrics = async (): Promise<void> => {
  mongoConnected.set(mongoose.connection.readyState === 1 ? 1 : 0);

  try {
    const redis = getRedis();
    redisConnected.set(redis.isReady ? 1 : 0);
  } catch {
    redisConnected.set(0);
  }

  try {
    const [visitCounts, imageCounts, fraudCounts, storeCounts, aiAverages] = await Promise.all([
      getCountByField("visits", "status"),
      getCountByField("visit_images", "isRejected"),
      getFraudCounts(),
      getCountByField("stores", "isActive"),
      getAiAverages(),
    ]);

    visitsTotal.reset();
    visitCounts.forEach(({ _id, count }) => visitsTotal.set({ status: String(_id ?? "unknown") }, count));

    visitImagesTotal.reset();
    imageCounts.forEach(({ _id, count }) => visitImagesTotal.set({ rejected: String(Boolean(_id)) }, count));

    fraudFlagsTotal.reset();
    fraudCounts.forEach(({ _id, count }) => {
      fraudFlagsTotal.set(
        {
          resolution: _id.resolution ?? "unknown",
          type: _id.type ?? "unknown",
        },
        count
      );
    });

    storesTotal.reset();
    storeCounts.forEach(({ _id, count }) => storesTotal.set({ active: String(Boolean(_id)) }, count));

    aiAnalysesTotal.set(aiAverages.total);
    complianceScoreAverage.set(aiAverages.avgComplianceScore ?? 0);
    aiProcessingSecondsAverage.set((aiAverages.avgProcessingMs ?? 0) / 1000);
  } catch {
    mongoConnected.set(0);
  }
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path === "/metrics") {
    next();
    return;
  }

  httpInFlightRequests.inc();
  const endTimer = httpRequestDurationSeconds.startTimer();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };

    httpInFlightRequests.dec();
    httpRequestsTotal.inc(labels);
    endTimer(labels);
  });

  next();
};

export const metricsHandler = async (_req: Request, res: Response): Promise<void> => {
  await refreshBusinessMetrics();
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
};
