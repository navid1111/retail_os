import mongoose, { Document, Schema, Model, Types } from "mongoose";

export type NotificationChannel = "whatsapp" | "email" | "push";
export type NotificationStatus = "pending" | "sent" | "failed";
export type NotificationTrigger = "low_compliance" | "fraud_flag";

export interface INotification {
  visitId?: Types.ObjectId;
  recipientId: Types.ObjectId;
  channel: NotificationChannel;
  triggerEvent: NotificationTrigger;
  messageBody?: string;
  status: NotificationStatus;
  providerMsgId?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface INotificationDocument extends INotification, Document {}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    visitId: { type: Schema.Types.ObjectId, ref: "Visit" },
    recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    channel: { type: String, required: true, enum: ["whatsapp", "email", "push"] },
    triggerEvent: { type: String, required: true, enum: ["low_compliance", "fraud_flag"] },
    messageBody: { type: String },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending",
    },
    providerMsgId: { type: String },
    sentAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ status: 1 }, { partialFilterExpression: { status: "pending" } });

export const Notification: Model<INotificationDocument> =
  mongoose.model<INotificationDocument>("Notification", NotificationSchema);
