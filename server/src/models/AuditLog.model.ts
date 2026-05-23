import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type AuditAction =
  | "login"
  | "logout"
  | "visit_create"
  | "visit_submit"
  | "user_create"
  | "image_upload"
  | "fraud_review"
  | "fraud_confirm"
  | "fraud_dismiss";

export type AuditEntityType = "visit" | "image" | "fraud_flag" | "user";

export interface IAuditLog {
  actorId?: Types.ObjectId;
  action: AuditAction;
  entityType?: AuditEntityType;
  entityId?: Types.ObjectId;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

const AuditLogSchema = new Schema<IAuditLogDocument>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    action: {
      type: String,
      required: true,
      enum: [
        "login",
        "logout",
        "visit_create",
        "visit_submit",
        "user_create",
        "image_upload",
        "fraud_review",
        "fraud_confirm",
        "fraud_dismiss",
      ],
    },
    entityType: { type: String, enum: ["visit", "image", "fraud_flag", "user"] },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: "createdAt", updatedAt: false },
  }
);

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityId: 1 });

AuditLogSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "deleteOne", "deleteMany"],
  function () {
    throw new Error("AuditLog is append-only. Updates and deletes are not permitted.");
  }
);

export const AuditLog: Model<IAuditLogDocument> =
  mongoose.model<IAuditLogDocument>("AuditLog", AuditLogSchema);
