import mongoose, { Document, Schema, Model } from "mongoose";

export type UserRole = "rep" | "supervisor" | "admin";

export interface IUser {
  fullName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  phone?: string;
  region?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ["rep", "supervisor", "admin"] },
    phone: { type: String },
    region: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } }
);

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>("User", UserSchema);
