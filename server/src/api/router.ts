import { Router, Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { getDB } from "../db/mongo";
import { getRedis } from "../db/redis";
import { CloudinaryService } from "../cloudinary/service";
import { requireAuth, requireRole } from "../middleware/auth";
import { visitRouter } from "./routes/visit.routes";
import { imageRouter, visitImageRouter } from "./routes/image.routes";
import { storeRouter } from "./routes/store.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { adminRouter } from "./routes/admin.routes";
import { upload } from "../middleware/upload";

const router = Router();

// Register sub-routers under authenticated path
router.use("/visits", requireAuth, requireRole("rep"), visitRouter);
router.use("/visits", requireAuth, requireRole("rep"), visitImageRouter);
router.use("/images", requireAuth, requireRole("rep"), imageRouter);
router.use("/stores", requireAuth, requireRole("rep"), storeRouter);
router.use("/dashboard", requireAuth, requireRole("rep"), dashboardRouter);
router.use("/admin", requireAuth, requireRole("admin"), adminRouter);

router.get("/test", async (req: Request, res: Response): Promise<void> => {
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

router.post("/upload/image", upload, async (req: Request, res: Response): Promise<void> => {
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

router.post("/upload/url", async (req: Request, res: Response): Promise<void> => {
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

router.post("/upload/video", async (req: Request, res: Response): Promise<void> => {
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

router.delete("/assets/:publicId", async (req: Request, res: Response): Promise<void> => {
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

router.get("/me",requireAuth, (req: Request, res: Response): void => {
    const user = (req as any).user;
    if (!user) {
        res.status(401).json({ error: "Unauthorized - No user found" });
        return;
    }
    res.json({ user });
});

router.get("/error", (req: Request, res: Response): void => {
  throw new Error("Test error");
});

export { router };
