import { describe, expect, it } from "vitest";
import { safeHttpRequest, safeRequestPath } from "./logPrivacy.js";

describe("invite request log privacy", () => {
  it.each([
    "/shared-habits/join/secret",
    "/shared-habits/join/secret?code=secret",
    "/SHARED-HABITS/JOIN/secret",
    "/shared-habits/%6aoin/secret",
    "/shared-habits/join/secret/extra",
  ])("redacts %s without changing the original request", (url) => {
    const req = { url, method: "GET" };
    const output = safeHttpRequest(req);
    expect(output.url).not.toContain("secret");
    expect(output.url).toContain("[REDACTED]");
    expect(req.url).toBe(url);
  });
  it("retains normal route paths but drops query strings", () => {
    expect(safeRequestPath("/habits?limit=20")).toBe("/habits");
  });
});
