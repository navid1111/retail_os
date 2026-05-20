import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.DATABASE_URL!);
const db = client.db();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client, // Enables database transactions
  }),
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
});