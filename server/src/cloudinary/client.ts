import { v2 as cloudinary } from "cloudinary";
import * as Sentry from "@sentry/node";

export const initializeCloudinary = (): void => {
  try {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    console.log("✓ Cloudinary initialized successfully");
  } catch (error) {
    Sentry.captureException(error);
    console.error("Failed to initialize Cloudinary:", error);
    throw error;
  }
};

export const getCloudinary = () => cloudinary;