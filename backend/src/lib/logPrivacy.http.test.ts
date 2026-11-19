import express from "express";
import pino from "pino";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { expect, it } from "vitest";
import { safeHttpRequest } from "./logPrivacy.js";

it("redacts invite URLs in actual HTTP completion logs, including 404 and 500", async () => {
  const lines: string[] = [];
  const logger = pino(
    { level: "info" },
    {
      write: (line: string) => {
        lines.push(line);
      },
    },
  );
  const app = express();
  app.use(pinoHttp({ logger, serializers: { req: safeHttpRequest } }));
  app.get("/shared-habits/join/:code", (req, res) =>
    res.sendStatus(req.query.fail ? 500 : 404),
  );
  for (const suffix of ["", "?fail=1&code=secret-invite"]) {
    await request(app).get("/shared-habits/join/secret-invite" + suffix);
  }
  expect(lines).toHaveLength(2);
  for (const line of lines) {
    expect(line).not.toContain("secret-invite");
    expect(JSON.parse(line).req.url).toBe("/shared-habits/join/[REDACTED]");
  }
});
