import multer from "multer";
import os from "os";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Configure multer to save files in the system temp directory
const uploader = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// We use .any() to be flexible with field names (e.g., 'image', 'file', etc.)
const anyUpload = uploader.any();

export const upload = (req: Request, res: Response, next: NextFunction): void => {
  anyUpload(req, res, (err: any) => {
    if (err) {
      return next(err);
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (files && files.length > 0) {
      const file = files[0];
      req.file = file;
      // Map req.file.path to req.body.filePath so it's fully backwards compatible with our services
      req.body.filePath = file.path;

      // Register cleanup to run after response is finished or closed
      const cleanup = () => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr && (unlinkErr as any).code !== "ENOENT") {
            console.error("Failed to delete temporary upload file:", file.path, unlinkErr);
          }
        });
      };

      res.on("finish", cleanup);
      res.on("close", cleanup);
    }

    next();
  });
};
