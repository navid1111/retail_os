import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth/auth";
import { router } from "./api/router";
export const app = express();

app.use(express.json());
// CORS Configuration

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use("/api", router);
// Mount Better Auth BEFORE express.json()
app.use("/api/auth", toNodeHandler(auth));

// Then mount other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


export default app;