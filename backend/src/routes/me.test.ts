import { describe, expect, it } from "vitest";
import { updateMeBody } from "./me.js";

const rejects = (body: unknown) =>
  expect(updateMeBody.safeParse(body).success).toBe(false);

describe("updateMeBody", () => {
  it("accepts a display_name", () => {
    const result = updateMeBody.safeParse({ display_name: "Sam" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ display_name: "Sam" });
  });

  it("trims the display_name", () => {
    const result = updateMeBody.safeParse({ display_name: "  Sam  " });
    expect(result.data?.display_name).toBe("Sam");
  });

  it("accepts an IANA timezone", () => {
    const result = updateMeBody.safeParse({ timezone: "America/Los_Angeles" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ timezone: "America/Los_Angeles" });
  });

  it("accepts a null timezone", () => {
    const result = updateMeBody.safeParse({ timezone: null });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ timezone: null });
  });

  it("rejects an empty body", () => rejects({}));

  it("rejects an empty display_name", () => rejects({ display_name: "" }));

  it("rejects a 51-character display_name", () =>
    rejects({ display_name: "a".repeat(51) }));

  it("rejects a timezone that is not an IANA name", () =>
    rejects({ timezone: "Not/AZone" }));

  it("rejects an unknown key", () =>
    rejects({ display_name: "Sam", owner_id: "x" }));
});
