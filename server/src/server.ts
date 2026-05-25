import "./logger/instrument"; // Must be first!
import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";
import { app } from "./app";
import { connectDB, closeDB } from "./db/mongo";
import { connectRedis, closeRedis } from "./db/redis";
import { ensureBootstrapAdmin } from "./db/admin";
import { initializeCloudinary } from "./cloudinary/client";
import { startQueueScheduler, closeQueueScheduler } from "./queues/schedular";

const startServer = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT || 5000);

    // Connect to MongoDB, Redis, and Cloudinary on startup
    await connectDB();
    await ensureBootstrapAdmin();
    await connectRedis();
    initializeCloudinary(); // Initialize Cloudinary
    const scheduler = startQueueScheduler();

    Sentry.setupExpressErrorHandler(app);

    app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
      console.error("500 error:", err);
      res.status(500).json({
        error: "Internal server error",
        errorId: (res as any).sentry,
      });
    });

    const shutdown = async (): Promise<void> => {
      await closeDB();
      await closeRedis();
      await closeQueueScheduler(scheduler);
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    app.listen(port, (): void => {
      console.log(`Server running on port ${port}`);
      console.log(`Better Auth endpoints available at http://localhost:${port}/api/auth`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
    Sentry.captureException(err);
    process.exit(1);
  }
};

startServer();
