import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/auth";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      res.status(401).json({ error: "Unauthorized - No session found" });
      return;
    }

    // Attach user to request for use in route handlers
    (req as any).user = session.user;
    (req as any).session = session;

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Unauthorized" });
  }
}