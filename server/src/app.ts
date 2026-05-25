import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";
import { router } from "./api/router";
import { metricsHandler, metricsMiddleware } from "./metrics";

export const app = express();

const parseOriginList = (value?: string): string[] =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const allowedOrigins = [
  ...parseOriginList(process.env.FRONTEND_URL),
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const isAllowedOrigin = (origin: string): boolean => {
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

// CORS Configuration
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/metrics", metricsHandler);
app.use(metricsMiddleware);

// Mount Better Auth BEFORE express.json()
app.use("/api/auth", toNodeHandler(auth));

// Then mount other middleware and routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
