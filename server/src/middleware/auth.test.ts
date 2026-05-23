import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireAuth, requireRole } from "./auth";
import { auth } from "../auth/auth";

type JsonValue = Record<string, unknown> | null;

function createRes() {
  const res = {
    statusCode: 200,
    body: null as JsonValue,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: JsonValue) {
      this.body = payload;
      return this;
    },
  };

  return res as Response & typeof res;
}

describe("requireAuth middleware", () => {
  const getSessionSpy = vi.spyOn(auth.api, "getSession");

  beforeEach(() => {
    getSessionSpy.mockReset();
  });

  it("returns 401 when no session user", async () => {
    const req = { headers: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    getSessionSpy.mockResolvedValue({ user: null } as any);

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized - No session found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches user and calls next when session exists", async () => {
    const req = { headers: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    const session = { user: { id: "u1" }, session: { id: "s1" } };
    getSessionSpy.mockResolvedValue(session as any);

    await requireAuth(req, res, next);

    expect((req as any).user).toEqual(session.user);
    expect((req as any).session).toEqual(session);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("returns 401 on auth errors", async () => {
    const req = { headers: {} } as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    getSessionSpy.mockRejectedValue(new Error("boom"));

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("requireRole middleware", () => {
  it("returns 401 when user is missing", () => {
    const req = {} as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireRole("rep")(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized - No session found" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user role is not allowed", () => {
    const req = { user: { role: "admin" } } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireRole("rep")(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Forbidden - Insufficient permissions" });
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next when the user role is allowed", () => {
    const req = { user: { role: "rep" } } as unknown as Request;
    const res = createRes();
    const next = vi.fn() as NextFunction;

    requireRole("rep")(req, res, next);

    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
