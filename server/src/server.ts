import "./logger/instrument"; // Must be first!
import * as Sentry from "@sentry/node";
import type { Request, Response, NextFunction } from "express";
import { app } from "./app";
import { connectDB, closeDB } from "./db/mongo";
import { connectRedis, closeRedis } from "./db/redis";
import { initializeCloudinary } from "./cloudinary/client";

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB, Redis, and Cloudinary on startup
    await connectDB();
    await connectRedis();
    initializeCloudinary(); // Initialize Cloudinary

    Sentry.setupExpressErrorHandler(app);

    app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
      console.error("500 error:", err);
      res.status(500).json({
        error: "Internal server error",
        errorId: (res as any).sentry,
      });
    });

    process.on("SIGINT", async (): Promise<void> => {
      await closeDB();
      await closeRedis();
      process.exit(0);
    });

    app.listen(5000, (): void => {
      console.log("Server running on port 5000");
    });
  } catch (err) {
    console.error("Failed to start server", err);
    Sentry.captureException(err);
    process.exit(1);
  }
};

startServer();