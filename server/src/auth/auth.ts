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
  user: {
    additionalFields: {
      fullName: {
        type: "string",
        required: false,
        input: true,
      },
      role: {
        type: "string",
        required: false,
        defaultValue: "rep",
        input: true,
      },
      region: {
        type: "string",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: true,
      },
    },
  },
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
  advanced: {
    disableOriginCheck: process.env.NODE_ENV === "development",
  },
});
