import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type JobType = "ai_analysis" | "fraud_check";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface IJob {
  imageId?: Types.ObjectId;
  visitId?: Types.ObjectId;
  jobType: JobType;
  status: JobStatus;
  attempts: number;
  errorMessage?: string;
  queuedAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface IJobDocument extends IJob, Document {}

const JobSchema = new Schema<IJobDocument>(
  {
    imageId: { type: Schema.Types.ObjectId, ref: "VisitImage" },
    visitId: { type: Schema.Types.ObjectId, ref: "Visit" },
    jobType: { type: String, required: true, enum: ["ai_analysis", "fraud_check"] },
    status: {
      type: String,
      enum: ["queued", "running", "done", "failed"],
      default: "queued",
    },
    attempts: { type: Number, default: 0 },
    errorMessage: { type: String },
    queuedAt: { type: Date, default: () => new Date() },
    startedAt: { type: Date },
    finishedAt: { type: Date },
  },
  { timestamps: false }
);

JobSchema.index({ status: 1, queuedAt: 1 });

export const Job: Model<IJobDocument> = mongoose.model<IJobDocument>("Job", JobSchema);
