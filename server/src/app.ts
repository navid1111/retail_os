import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";
import { router } from "./api/router";
import { metricsHandler, metricsMiddleware } from "./metrics";
import { isAllowedOrigin } from "./config/origins";

export const app = express();

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
