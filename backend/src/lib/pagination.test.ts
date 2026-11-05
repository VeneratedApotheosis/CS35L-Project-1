import { describe, expect, it } from "vitest";
import { paginationQuery } from "./pagination.js";

const rejects = (query: unknown) =>
  expect(paginationQuery.safeParse(query).success).toBe(false);

describe("paginationQuery", () => {
  it("defaults to limit 50 and offset 0", () => {
    expect(paginationQuery.parse({})).toEqual({ limit: 50, offset: 0 });
  });

  it("turns string values into numbers", () => {
    expect(paginationQuery.parse({ limit: "10", offset: "20" })).toEqual({
      limit: 10,
      offset: 20,
    });
  });

  it("accepts the limits 1, 100 and offset 0", () => {
    expect(paginationQuery.parse({ limit: "1" }).limit).toBe(1);
    expect(paginationQuery.parse({ limit: "100" }).limit).toBe(100);
  });

  it("rejects limit 0 and 101", () => {
    rejects({ limit: "0" });
    rejects({ limit: "101" });
  });

  it("rejects a negative offset", () => rejects({ offset: "-1" }));

  it("rejects a fractional number", () => rejects({ limit: "1.5" }));

  it("rejects a value that is not a number", () => {
    rejects({ limit: "abc" });
    rejects({ offset: "abc" });
  });

  it("rejects an unknown key", () => rejects({ limt: "10" }));
});
