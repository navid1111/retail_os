import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { requireAuth } from "./auth";
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

    getSessionSpy.mockResolvedValue({ user: null });

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
    getSessionSpy.mockResolvedValue(session);

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
