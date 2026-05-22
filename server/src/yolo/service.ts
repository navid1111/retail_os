import axios from "axios";
import * as Sentry from "@sentry/node";
import FormData from "form-data";

const YOLO_SERVER_URL = process.env.YOLO_SERVER_URL || "http://localhost:8000";

export interface YoloProductDetection {
  name: string;
  brand: string;
  confidence: number;
}

export interface YoloCompetitorDetection {
  brand: string;
  count: number;
}

export interface YoloPredictResponse {
  provider: string;
  modelName: string;
  complianceScore: number;
  productsDetected: YoloProductDetection[];
  competitorsDetected: YoloCompetitorDetection[];
  missingSkus: string[];
  issues: string[];
  rawResponse: Record<string, any>;
  processingMs: number;
}

export class YoloService {
  /**
   * Check if the YOLO server is reachable
   */
  static async healthCheck(): Promise<{ status: string; url: string }> {
    try {
      const response = await axios.get(`${YOLO_SERVER_URL}/`, {
        timeout: 5000,
      });
      return { status: "online", url: YOLO_SERVER_URL };
    } catch (error) {
      // FastAPI might not have a root endpoint, try /docs
      try {
        await axios.get(`${YOLO_SERVER_URL}/docs`, { timeout: 5000 });
        return { status: "online", url: YOLO_SERVER_URL };
      } catch {
        return { status: "offline", url: YOLO_SERVER_URL };
      }
    }
  }

  /**
   * Send an image buffer to the YOLO server for prediction
   */
  static async predict(
    imageBuffer: Buffer,
    filename: string = "image.jpg"
  ): Promise<YoloPredictResponse> {
    try {
      const form = new FormData();
      form.append("file", imageBuffer, { filename });

      const response = await axios.post(`${YOLO_SERVER_URL}/predict`, form, {
        headers: form.getHeaders(),
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`YOLO prediction failed: ${error}`);
    }
  }

  /**
   * Send an image from a URL to the YOLO server for prediction.
   * Downloads the image first, then forwards it to the YOLO server.
   */
  static async predictFromUrl(imageUrl: string): Promise<YoloPredictResponse> {
    try {
      // Download the image
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 10000,
      });

      const imageBuffer = Buffer.from(imageResponse.data);
      return await YoloService.predict(imageBuffer, "image.jpg");
    } catch (error) {
      Sentry.captureException(error);
      throw new Error(`YOLO prediction from URL failed: ${error}`);
    }
  }
}
