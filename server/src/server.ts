import "./logger/instrument"; // Must be first!
import express, { Request, Response, NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { connectDB, getDB, closeDB } from "./db/mongo";
import { connectRedis, getRedis, closeRedis } from "./db/redis";
import { initializeCloudinary } from "./cloudinary/client";
import { CloudinaryService } from "./cloudinary/service";

const app = express();
app.use(express.json());

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB, Redis, and Cloudinary on startup
    await connectDB();
    await connectRedis();
    initializeCloudinary(); // Initialize Cloudinary

    app.get("/test", async (req: Request, res: Response): Promise<void> => {
      try {
        const db = getDB();
        const redis = getRedis();

        const cachedUsers = await redis.get("users");

        if (cachedUsers) {
          res.json(JSON.parse(cachedUsers));
          return;
        }

        const users = await db.collection("users").findOne({});
        await redis.setEx("users", 3600, JSON.stringify(users));

        res.json(users);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: "Failed to fetch users" });
      }
    });

    // Upload image endpoint
    app.post("/upload/image", async (req: Request, res: Response): Promise<void> => {
      try {
        const { filePath, publicId: publicIdRaw } = req.body;
        const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

        if (!filePath) {
          res.status(400).json({ error: "filePath is required" });
          return;
        }

        const result = await CloudinaryService.uploadImage(filePath, {
          public_id: publicId,
        });

        res.json(result);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: `Upload failed: ${err}` });
      }
    });

    // Upload from URL endpoint
    app.post("/upload/url", async (req: Request, res: Response): Promise<void> => {
      try {
        const { url, publicId: publicIdRaw } = req.body;
        const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

        if (!url) {
          res.status(400).json({ error: "url is required" });
          return;
        }

        const result = await CloudinaryService.uploadFromUrl(url, {
          public_id: publicId,
        });

        res.json(result);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: `Upload failed: ${err}` });
      }
    });

    // Upload video endpoint
    app.post("/upload/video", async (req: Request, res: Response): Promise<void> => {
      try {
        const { filePath, publicId: publicIdRaw } = req.body;
        const publicId = typeof publicIdRaw === "string" ? publicIdRaw : undefined;

        if (!filePath) {
          res.status(400).json({ error: "filePath is required" });
          return;
        }

        const result = await CloudinaryService.uploadVideo(filePath, {
          public_id: publicId,
        });

        res.json(result);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: `Upload failed: ${err}` });
      }
    });

    // Delete asset endpoint
    app.delete("/assets/:publicId", async (req: Request, res: Response): Promise<void> => {
      try {
        const { publicId: publicIdRaw } = req.params;
        const publicId = Array.isArray(publicIdRaw) ? publicIdRaw[0] : publicIdRaw;
        const result = await CloudinaryService.deleteAsset(publicId);
        res.json(result);
      } catch (err) {
        Sentry.captureException(err);
        res.status(500).json({ error: `Delete failed: ${err}` });
      }
    });

    app.get("/error", (req: Request, res: Response): void => {
      throw new Error("Test error");
    });

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