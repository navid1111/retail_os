import { ObjectId } from "mongodb";
import sharp from "sharp";
import { getDB } from "../db/mongo";
import { CloudinaryService, CloudinaryUploadResponse } from "../cloudinary/service";
import { addJobToQueue } from "../queues/queues";
import { auditLog } from "./audit.service";

export type VisitStatus = "pending" | "processing" | "completed" | "flagged";

export interface VisitImageRecord {
  _id: ObjectId;
  visitId: ObjectId;
  imageUrl: string;
  imageHash?: string;
  exifTakenAt?: Date;
  fileSizeKb?: number;
  widthPx?: number;
  heightPx?: number;
  blurScore?: number;
  isRejected: boolean;
  rejectionReason?: "blurry" | "duplicate" | "exif_old";
  uploadedAt: Date;
}

export interface UploadVisitImageInput {
  visitId: string;
  repId: string;
  filePath?: string;
  sourceUrl?: string;
  publicId?: string;
}

const toObjectId = (value: string, fieldName: string): ObjectId => {
  if (!ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new ObjectId(value);
};

const resolveImageUrl = (upload: CloudinaryUploadResponse): string => {
  const url = upload.secure_url || upload.url;
  if (!url) {
    throw new Error("Image upload failed");
  }
  return url;
};

const resolveFileSizeKb = (bytes?: number): number | undefined => {
  if (bytes === undefined) {
    return undefined;
  }
  return Math.round(bytes / 1024);
};

export const uploadVisitImage = async (input: UploadVisitImageInput): Promise<VisitImageRecord> => {
  const db = getDB();
  const visitId = toObjectId(input.visitId, "visitId");
  const repId = toObjectId(input.repId, "repId");

  const visitsCollection = db.collection<{ _id: ObjectId; repId: ObjectId; storeId?: ObjectId; status?: VisitStatus; deletedAt?: Date | null; images?: ObjectId[] }>(
    "visits"
  );
  const visit = await visitsCollection.findOne({ _id: visitId, repId, deletedAt: null });

  if (!visit) {
    throw new Error("Visit not found");
  }

  if (visit.status === "completed") {
    throw new Error("Visit is already completed");
  }

  if (!input.filePath && !input.sourceUrl) {
    throw new Error("Image source is required");
  }

  const cloudinaryOptions = input.publicId ? { public_id: input.publicId } : undefined;
  const upload = input.filePath
    ? await CloudinaryService.uploadImage(input.filePath, cloudinaryOptions)
    : await CloudinaryService.uploadFromUrl(input.sourceUrl as string, cloudinaryOptions);

  const now = new Date();
  const image: VisitImageRecord = {
    _id: new ObjectId(),
    visitId,
    imageUrl: resolveImageUrl(upload),
    fileSizeKb: resolveFileSizeKb(upload.bytes),
    widthPx: upload.width,
    heightPx: upload.height,
    isRejected: false,
    uploadedAt: now,
  };

  const imagesCollection = db.collection<VisitImageRecord>("visit_images");
  const insertResult = await imagesCollection.insertOne(image);
  image._id = insertResult.insertedId;

  await visitsCollection.updateOne(
    { _id: visitId, repId, deletedAt: null },
    { $push: { images: image._id } }
  );

  await addJobToQueue(
    "PROCESS_IMAGE",
    "process-image",
    {
      imageId: image._id.toHexString(),
      visitId: visitId.toHexString(),
      storeId: visit.storeId?.toHexString?.() ?? visit.storeId?.toString?.(),
      imageUrl: image.imageUrl,
    },
    undefined
  );

  await auditLog({
    actorId: repId.toHexString(),
    action: "image_upload",
    entityType: "image",
    entityId: image._id.toHexString(),
    meta: {
      visitId: visitId.toHexString(),
      cloudinaryPublicId: upload.public_id,
    },
  });

  return image;
};

// Laplacian kernel for edge detection
const LAPLACIAN_KERNEL = [0, -1, 0, -1, 4, -1, 0, -1, 0];

/**
 * Calculate variance of pixel values
 */
function calculateVariance(data: Buffer): number {
  const values = Array.from(data);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((x) => Math.pow(x - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate Laplacian variance to detect blur
 * Higher variance = sharp image, Lower variance = blurry image
 */
export async function detectBlur(imagePath: string): Promise<{
  variance: number;
  isBlurry: boolean;
  confidence: number;
}> {
  // Convert image to grayscale, apply Laplacian kernel, get raw pixel data
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(300, 300, { fit: "cover" }) // Resize for faster processing
    .convolve({
      width: 3,
      height: 3,
      kernel: LAPLACIAN_KERNEL,
    })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Calculate variance of the Laplacian response
  const variance = calculateVariance(data);

  // Threshold: typically 100 is a good cutoff
  // Adjust based on your image dataset
  const BLUR_THRESHOLD = 100;
  const isBlurry = variance < BLUR_THRESHOLD;

  // Confidence: how far from threshold (0-1 scale)
  const confidence = Math.min(Math.abs(variance - BLUR_THRESHOLD) / BLUR_THRESHOLD, 1);

  return {
    variance,
    isBlurry,
    confidence,
  };
}

export async function computePHash(input: Buffer | string): Promise<string> {
  // 1. Downsample to 32x32 greyscale — standard pHash prep
  const pixels = await sharp(input)
    .resize(32, 32, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer()

  // 2. Compute 8x8 DCT over the 32x32 pixel grid (low-frequency extraction)
  const dct = computeDCT(pixels, 32)

  // 3. Take top-left 8x8 block
  const block: number[] = []
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      block.push(dct[y * 32 + x])
    }
  }

  // 4. Compute mean (excluding the first DC component), encode each value as above/below mean → 64-bit hash
  const sum = block.reduce((s, v) => s + v, 0) - block[0]
  const mean = sum / 63
  const bits = block.map(v => (v > mean ? 1 : 0))

  // 5. Convert bit array to 16-char hex string
  let hash = ''
  for (let i = 0; i < 64; i += 4) {
    hash += (bits[i] * 8 + bits[i+1] * 4 + bits[i+2] * 2 + bits[i+3]).toString(16)
  }
  return hash  // e.g. "f884c4d8d1193c07"
}

function computeDCT(pixels: Buffer, size: number): number[] {
  const N = size
  const out = new Array(N * N).fill(0)

  for (let u = 0; u < N; u++) {
    for (let v = 0; v < N; v++) {
      let sum = 0
      for (let x = 0; x < N; x++) {
        for (let y = 0; y < N; y++) {
          sum += pixels[y * N + x]
            * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))
            * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * N))
        }
      }
      out[u * N + v] = sum
    }
  }
  return out
}

export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity
  let dist = 0
  for (let i = 0; i < hash1.length; i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16)
    dist += xor.toString(2).split('1').length - 1  // count set bits
  }
  return dist
}
