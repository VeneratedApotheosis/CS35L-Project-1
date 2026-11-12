import { describe, expect, it } from "vitest";
import { schema } from "./env.js";

const required = {
  SUPABASE_URL: "http://localhost:54321",
  SUPABASE_PUBLISHABLE_KEY: "test-key",
};

const originFor = (value?: string) =>
  schema.parse({ ...required, FRONTEND_ORIGIN: value }).FRONTEND_ORIGIN;

describe("FRONTEND_ORIGIN", () => {
  it("defaults to the local frontend", () => {
    expect(originFor(undefined)).toBe("http://localhost:5173");
  });

  it("keeps an origin that has no trailing slash", () => {
    expect(originFor("https://garden.example.com")).toBe(
      "https://garden.example.com",
    );
  });

  it("drops a trailing slash, which would never match a browser's origin", () => {
    expect(originFor("http://localhost:5173/")).toBe("http://localhost:5173");
  });

  it("drops several trailing slashes and surrounding spaces", () => {
    expect(originFor("  https://garden.example.com//  ")).toBe(
      "https://garden.example.com",
    );
  });

  it("still rejects an empty value", () => {
    expect(() => originFor("")).toThrow();
  });
});
