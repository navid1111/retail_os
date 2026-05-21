import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { dash } from "@better-auth/infra";
import { getDB, mongoClient } from "../db/mongo";

const db = getDB();

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client: mongoClient,
    
  }),
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET || "your-dev-secret-key",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
});