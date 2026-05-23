import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type RejectionReason = "blurry" | "duplicate" | "exif_old";

export interface IVisitImage {
  visitId: Types.ObjectId;
  imageUrl: string;
  publicId?: string;
  imageHash?: string;
  exifTakenAt?: Date;
  fileSizeKb?: number;
  widthPx?: number;
  heightPx?: number;
  blurScore?: number;
  isRejected: boolean;
  rejectionReason?: RejectionReason;
  uploadedAt: Date;
}

export interface IVisitImageDocument extends IVisitImage, Document {}

const VisitImageSchema = new Schema<IVisitImageDocument>(
  {
    visitId: { type: Schema.Types.ObjectId, ref: "Visit", required: true },
    imageUrl: { type: String, required: true },
    publicId: { type: String, index: true },
    imageHash: { type: String },
    exifTakenAt: { type: Date },
    fileSizeKb: { type: Number },
    widthPx: { type: Number },
    heightPx: { type: Number },
    blurScore: { type: Number },
    isRejected: { type: Boolean, default: false },
    rejectionReason: { type: String, enum: ["blurry", "duplicate", "exif_old"] },
    uploadedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

VisitImageSchema.index({ imageHash: 1 });
VisitImageSchema.index({ visitId: 1 });

export const VisitImage: Model<IVisitImageDocument> =
  mongoose.model<IVisitImageDocument>("VisitImage", VisitImageSchema);
