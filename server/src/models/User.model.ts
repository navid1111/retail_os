import mongoose, { Document, Schema, Model } from "mongoose";

export type UserRole = "rep" | "supervisor" | "admin";

export interface IUser {
  name?: string;
  fullName?: string;
  email: string;
  emailVerified?: boolean;
  passwordHash?: string;
  role?: UserRole;
  phone?: string;
  region?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String },
    role: { type: String, enum: ["rep", "supervisor", "admin"], default: "rep" },
    phone: { type: String },
    region: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { collection: "user", timestamps: true }
);

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>("User", UserSchema);
