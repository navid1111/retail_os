import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { dash } from "@better-auth/infra";
import { getDB, mongoClient } from "../db/mongo";

const db = getDB();

const parseOriginList = (value?: string): string[] =>
  value
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];

const trustedOrigins = [
  ...parseOriginList(process.env.FRONTEND_URL),
  ...parseOriginList(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

export const auth = betterAuth({
  database: mongodbAdapter(db, {
    client: mongoClient,

  }),
  baseURL: process.env.BETTER_AUTH_BASE_URL || "http://localhost:5000",
  secret: process.env.BETTER_AUTH_SECRET || "your-dev-secret-key",
  trustedOrigins,
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
