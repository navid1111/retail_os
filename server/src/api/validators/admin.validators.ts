import { z } from "zod";

export const adminChatBodySchema = z.object({
  message: z.string().trim().min(1, "message is required").max(1000),
});

export const createAdminUserBodySchema = z.object({
  fullName: z.string().trim().min(1, "fullName is required").max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8, "password must be at least 8 characters").max(128),
  role: z.enum(["rep", "supervisor", "admin"]),
  region: z.string().trim().min(1, "region is required").max(80),
  phone: z.string().trim().optional(),
});
