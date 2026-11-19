import type { NextFunction, Request, Response } from "express";
import { AppError, notFound } from "../lib/errors.js";
import { safeRequestPath, isInvitePath } from "../lib/logPrivacy.js";
import { logger } from "../lib/logger.js";

// Unknown route.
export function notFoundHandler(
  _req: Request,
  _res: Response,
  next: NextFunction,
) {
  next(notFound("Route not found"));
}

// Every error leaves the server in one shape: { error: { code, message } }.
// Express only treats a function as an error handler if it takes four arguments.
/* eslint-disable @typescript-eslint/no-unused-vars */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
    return;
  }

  // Bad JSON bodies and similar errors raised by Express itself.
  const status = (err as { status?: number })?.status;
  if (status && status >= 400 && status < 500) {
    res
      .status(status)
      .json({ error: { code: "bad_request", message: "Bad request" } });
    return;
  }

  // Error messages/stacks may echo a code or RPC payload. Invite failures use
  // safe metadata only, never the raw exception.
  logger.error(
    {
      ...(isInvitePath(req.originalUrl)
        ? { errorType: "invite_request_failure" }
        : { err }),
      path: safeRequestPath(req.originalUrl),
    },
    "unhandled error",
  );
  res.status(500).json({
    error: { code: "internal_error", message: "Something went wrong" },
  });
}
