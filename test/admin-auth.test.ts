import { afterEach, describe, expect, it, vi } from "vitest";

const original = {
  user: process.env.ADMIN_USER,
  pass: process.env.ADMIN_PASS,
  secret: process.env.AUTH_SECRET,
};

afterEach(() => {
  process.env.ADMIN_USER = original.user;
  process.env.ADMIN_PASS = original.pass;
  process.env.AUTH_SECRET = original.secret;
  vi.resetModules();
});

describe("管理员 token", () => {
  it("支持用户名中包含点号", async () => {
    process.env.ADMIN_USER = "admin.name";
    process.env.ADMIN_PASS = "strong-password";
    process.env.AUTH_SECRET = "test-secret";
    vi.resetModules();
    const { makeToken, verifyToken } = await import("../lib/auth");

    expect(verifyToken(makeToken("admin.name"))).toBe(true);
  });
});
