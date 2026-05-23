import { ObjectId } from "mongodb";
import { getDB } from "../db/mongo";
import { auditLog } from "./audit.service";
import type { UserRole } from "../models/User.model";

type BetterAuthUserDocument = {
  _id: ObjectId;
  name: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  region: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type BetterAuthAccountDocument = {
  _id: ObjectId;
  accountId: string;
  providerId: "credential";
  userId: ObjectId;
  password: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminUserDto = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  region: string;
  phone?: string;
  isActive: boolean;
  createdAt?: Date;
};

export type CreateAdminUserInput = {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  region: string;
  phone?: string;
  actorId?: string;
};

const mapUser = (user: BetterAuthUserDocument): AdminUserDto => ({
  id: user._id.toHexString(),
  fullName: user.fullName || user.name,
  email: user.email,
  role: user.role || "rep",
  region: user.region || "Global",
  phone: user.phone,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
});

export const listAdminUsers = async (): Promise<AdminUserDto[]> => {
  const db = getDB();

  const users = await db
    .collection<BetterAuthUserDocument>("user")
    .find({})
    .sort({ createdAt: -1, name: 1 })
    .toArray();

  return users.map(mapUser);
};

export const createAdminUser = async (
  input: CreateAdminUserInput
): Promise<AdminUserDto> => {
  const db = getDB();
  const email = input.email.toLowerCase();
  const existingUser = await db
    .collection<BetterAuthUserDocument>("user")
    .findOne({ email });

  if (existingUser) {
    throw new Error("User already exists");
  }

  const { hashPassword } = await import("better-auth/crypto");
  const password = await hashPassword(input.password);
  const now = new Date();
  const userId = new ObjectId();

  const user: BetterAuthUserDocument = {
    _id: userId,
    name: input.fullName,
    fullName: input.fullName,
    email,
    emailVerified: false,
    role: input.role,
    region: input.region,
    phone: input.phone,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const account: BetterAuthAccountDocument = {
    _id: new ObjectId(),
    accountId: userId.toHexString(),
    providerId: "credential",
    userId,
    password,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<BetterAuthUserDocument>("user").insertOne(user);
  await db.collection<BetterAuthAccountDocument>("account").insertOne(account);

  if (input.actorId) {
    await auditLog({
      actorId: input.actorId,
      action: "user_create",
      entityType: "user",
      entityId: userId.toHexString(),
      meta: {
        email,
        role: input.role,
        region: input.region,
      },
    });
  }

  return mapUser(user);
};
