import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type FraudType =
  | "duplicate_image"
  | "blurry_image"
  | "gps_mismatch"
  | "timestamp_anomaly";

export type FraudResolution = "pending" | "confirmed" | "dismissed";

export interface IFraudFlagDetail {
  distanceM?: number;
  limitM?: number;
  deltaHours?: number;
  blurScore?: number;
  pHashDistance?: number;
  [key: string]: unknown;
}

export interface IFraudFlag {
  visitId: Types.ObjectId;
  imageId?: Types.ObjectId;
  fraudType: FraudType;
  confidence: number;
  detail: IFraudFlagDetail;
  duplicateOfImageId?: Types.ObjectId;
  reviewedBy?: Types.ObjectId;
  resolution: FraudResolution;
  deletedAt?: Date;
  createdAt: Date;
}

export interface IFraudFlagDocument extends IFraudFlag, Document {}

const FraudFlagSchema = new Schema<IFraudFlagDocument>(
  {
    visitId: { type: Schema.Types.ObjectId, ref: "Visit", required: true },
    imageId: { type: Schema.Types.ObjectId, ref: "VisitImage" },
    fraudType: {
      type: String,
      required: true,
      enum: ["duplicate_image", "blurry_image", "gps_mismatch", "timestamp_anomaly"],
    },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    detail: { type: Schema.Types.Mixed, default: {} },
    duplicateOfImageId: { type: Schema.Types.ObjectId, ref: "VisitImage" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolution: {
      type: String,
      enum: ["pending", "confirmed", "dismissed"],
      default: "pending",
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

FraudFlagSchema.index({ visitId: 1 });
FraudFlagSchema.index({ resolution: 1 }, { partialFilterExpression: { deletedAt: null } });

export const FraudFlag: Model<IFraudFlagDocument> =
  mongoose.model<IFraudFlagDocument>("FraudFlag", FraudFlagSchema);
