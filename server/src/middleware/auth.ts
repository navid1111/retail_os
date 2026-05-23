import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/auth";

const toHeaders = (headers: Request["headers"]): Headers => {
  const result = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(key, item));
      return;
    }

    if (value !== undefined) {
      result.set(key, value);
    }
  });

  return result;
};

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: toHeaders(req.headers),
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

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized - No session found" });
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      res.status(403).json({ error: "Forbidden - Insufficient permissions" });
      return;
    }

    next();
  };
}
