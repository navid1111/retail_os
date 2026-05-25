import { ObjectId } from "mongodb";
import { getDB } from "./mongo";

type BetterAuthUserDocument = {
  _id: ObjectId;
  name: string;
  fullName: string;
  email: string;
  emailVerified: boolean;
  role: "admin";
  region: string;
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

const getBootstrapAdminConfig = () => {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim();
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || "System Admin";
  const region = process.env.ADMIN_REGION?.trim() || "Global";

  if (!email && !password) {
    return null;
  }

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured together.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }

  return { email, password, fullName, region };
};

export const ensureBootstrapAdmin = async (): Promise<void> => {
  const config = getBootstrapAdminConfig();

  if (!config) {
    return;
  }

  const db = getDB();
  const users = db.collection<BetterAuthUserDocument>("user");
  const accounts = db.collection<BetterAuthAccountDocument>("account");
  const now = new Date();

  const existingUser = await users.findOne({ email: config.email });

  if (existingUser) {
    await users.updateOne(
      { _id: existingUser._id },
      {
        $set: {
          role: "admin",
          isActive: true,
          updatedAt: now,
        },
      }
    );

    const existingAccount = await accounts.findOne({
      userId: existingUser._id,
      providerId: "credential",
    });

    if (!existingAccount) {
      const { hashPassword } = await import("better-auth/crypto");

      await accounts.insertOne({
        _id: new ObjectId(),
        accountId: existingUser._id.toHexString(),
        providerId: "credential",
        userId: existingUser._id,
        password: await hashPassword(config.password),
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`Bootstrap admin ready: ${config.email}`);
    return;
  }

  const { hashPassword } = await import("better-auth/crypto");
  const userId = new ObjectId();

  await users.insertOne({
    _id: userId,
    name: config.fullName,
    fullName: config.fullName,
    email: config.email,
    emailVerified: true,
    role: "admin",
    region: config.region,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  await accounts.insertOne({
    _id: new ObjectId(),
    accountId: userId.toHexString(),
    providerId: "credential",
    userId,
    password: await hashPassword(config.password),
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Bootstrap admin created: ${config.email}`);
};

