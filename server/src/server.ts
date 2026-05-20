import "./logger/instrument"; // Must be first!
import express, { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { connectDB, getDB, closeDB } from "./db/mongo";

const app = express();

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB on startup
    await connectDB();

    app.get("/test", async (req: Request, res: Response): Promise<void> => {
      try {
        const db = getDB();
        const users = await db.collection("users").findOne({});
        res.json(users);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    });
    app.get("/error", (req: Request, res: Response): void => {
        throw new Error("Test error");
    });

    // Sentry error handler - MUST be after routes
    Sentry.setupExpressErrorHandler(app);

    // Optional: Fallback error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
      console.error("500 error:", err);
      res.status(500).json({
        error: "Internal server error",
        errorId: (res as any).sentry,
      });
    });

    // Graceful shutdown
    process.on("SIGINT", async (): Promise<void> => {
      await closeDB();
      process.exit(0);
    });

    app.listen(5000, (): void => {
      console.log("Server running on port 3000");
    });
  } catch (err) {
    console.error("Failed to start server", err);
    Sentry.captureException(err);
    process.exit(1);
  }
};

startServer();