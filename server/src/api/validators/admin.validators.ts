import { z } from "zod";

export const adminChatBodySchema = z.object({
  message: z.string().trim().min(1, "message is required").max(1000),
});
