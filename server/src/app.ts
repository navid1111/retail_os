import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";

export const app = express();

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Mount Better Auth BEFORE express.json()
app.use("/api/auth", toNodeHandler(auth));

// Then mount other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// Your other routes here
app.get("/api/test", (req, res) => {
  res.json({ message: "Test endpoint" });
});

export default app;