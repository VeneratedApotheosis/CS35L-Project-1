import pino from "pino";

// The authorization header carries the user's token, so it is never logged.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: ["req.headers.authorization", "req.headers.cookie"],
});
