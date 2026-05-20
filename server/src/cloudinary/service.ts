import { v2 as cloudinary } from "cloudinary";
import * as Sentry from "@sentry/node";

export interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
  width?: number;
  height?: number;
}

export class CloudinaryService {
  /**
   * Upload image from file path
   */
  static async uploadImage(
    filePath: string,
    options?: Record<string, any>
  ): Promise<CloudinaryUploadResponse> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "auto",
        ...options,
      });

      // Ensure public_id is a string
      const publicId = Array.isArray(result.public_id)
        ? result.public_id[0]
        : result.public_id;

      return {
        public_id: publicId,
        secure_url: result.secure_url || "",
        url: result.url || "",
        format: result.format || "",
        resource_type: result.resource_type || "image",
        created_at: result.created_at || new Date().toISOString(),
        bytes: result.bytes || 0,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  /**
   * Upload image from URL
   */
  static async uploadFromUrl(
    url: string,
    options?: Record<string, any>
  ): Promise<CloudinaryUploadResponse> {
    try {
      const result = await cloudinary.uploader.upload(url, {
        resource_type: "auto",
        ...options,
      });

      const publicId = Array.isArray(result.public_id)
        ? result.public_id[0]
        : result.public_id;

      return {
        public_id: publicId,
        secure_url: result.secure_url || "",
        url: result.url || "",
        format: result.format || "",
        resource_type: result.resource_type || "image",
        created_at: result.created_at || new Date().toISOString(),
        bytes: result.bytes || 0,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to upload from URL: ${error}`);
    }
  }

  /**
   * Upload video from file path
   */
  static async uploadVideo(
    filePath: string,
    options?: Record<string, any>
  ): Promise<CloudinaryUploadResponse> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        resource_type: "video",
        chunk_size: 6000000,
        ...options,
      });

      const publicId = Array.isArray(result.public_id)
        ? result.public_id[0]
        : result.public_id;

      return {
        public_id: publicId,
        secure_url: result.secure_url || "",
        url: result.url || "",
        format: result.format || "",
        resource_type: result.resource_type || "video",
        created_at: result.created_at || new Date().toISOString(),
        bytes: result.bytes || 0,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to upload video: ${error}`);
    }
  }

  /**
   * Delete asset by public_id
   */
  static async deleteAsset(publicId: string): Promise<{ result: string }> {
    try {
      // Ensure publicId is a string
      const id = Array.isArray(publicId) ? publicId[0] : publicId;
      const result = await cloudinary.uploader.destroy(id);
      return result;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to delete asset: ${error}`);
    }
  }

  /**
   * Get asset metadata
   */
  static async getAssetMetadata(publicId: string): Promise<any> {
    try {
      const id = Array.isArray(publicId) ? publicId[0] : publicId;
      const result = await cloudinary.api.resource(id);
      return result;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`Failed to fetch asset metadata: ${error}`);
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  static generateUrl(
    publicId: string,
    transformations?: Record<string, any>
  ): string {
    const id = Array.isArray(publicId) ? publicId[0] : publicId;
    return cloudinary.url(id, {
      secure: true,
      ...transformations,
    });
  }
}