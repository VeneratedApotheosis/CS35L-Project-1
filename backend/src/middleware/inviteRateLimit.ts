import type { RequestHandler } from "express";
import { AppError } from "../lib/errors.js";

/** Shared preview/join budget per verified user, including concurrent attempts.
 * [PLACEHOLDER] Single-process limiter; use shared storage before scaling replicas.
 * Count all attempts so success or changing codes cannot reset a guessing budget.
 */
export function createInviteRateLimit(
  limit = 20,
  windowMs = 60_000,
): RequestHandler {
  const buckets = new Map<string, { count: number; until: number }>();
  return (_req, res, next) => {
    const now = Date.now();
    for (const [key, bucket] of buckets)
      if (bucket.until <= now) buckets.delete(key);
    const key = res.locals.user.id;
    let bucket = buckets.get(key);
    if (!bucket) {
      // Bound memory without evicting active users' limits.
      if (buckets.size >= 10_000) {
        res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
        return next(
          new AppError(
            429,
            "rate_limited",
            "Too many invite requests. Try again later.",
          ),
        );
      }
      bucket = { count: 0, until: now + windowMs };
      buckets.set(key, bucket);
    }
    if (bucket.count >= limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.until - now) / 1000));
      return next(
        new AppError(
          429,
          "rate_limited",
          "Too many invite requests. Try again later.",
        ),
      );
    }
    bucket.count++;
    next();
  };
}
