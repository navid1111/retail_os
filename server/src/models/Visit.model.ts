import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type VisitStatus = "pending" | "processing" | "completed" | "flagged";

export interface IVisit {
  repId: Types.ObjectId;
  storeId: Types.ObjectId;
  checkInTime: Date;
  checkOutTime?: Date;
  gpsLat?: number;
  gpsLng?: number;
  gpsAccuracyM?: number;
  status: VisitStatus;
  overallScore?: number;
  repNotes?: string;
  images: Types.ObjectId[];
  fraudFlags: Types.ObjectId[];
  deletedAt?: Date;
  createdAt: Date;
}

export interface IVisitDocument extends IVisit, Document {}

const VisitSchema = new Schema<IVisitDocument>(
  {
    repId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    storeId: { type: Schema.Types.ObjectId, ref: "Store", required: true },
    checkInTime: { type: Date, required: true, default: () => new Date() },
    checkOutTime: { type: Date },
    gpsLat: { type: Number },
    gpsLng: { type: Number },
    gpsAccuracyM: { type: Number },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "flagged"],
      default: "pending",
    },
    overallScore: { type: Number, min: 0, max: 100 },
    repNotes: { type: String },
    images: [{ type: Schema.Types.ObjectId, ref: "VisitImage" }],
    fraudFlags: [{ type: Schema.Types.ObjectId, ref: "FraudFlag" }],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

VisitSchema.index({ repId: 1 });
VisitSchema.index({ storeId: 1, checkInTime: -1 });
VisitSchema.index({ status: 1 }, { partialFilterExpression: { deletedAt: null } });
VisitSchema.index({ deletedAt: 1 });

VisitSchema.pre(/^find/, function (this: mongoose.Query<unknown, IVisitDocument>, next: any) {
  if (this.getFilter().deletedAt === undefined) {
    this.where({ deletedAt: null });
  }
  next();
});

export const Visit: Model<IVisitDocument> = mongoose.model<IVisitDocument>("Visit", VisitSchema);
