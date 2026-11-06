import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { validationFailed } from "../lib/errors.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      valid: { body?: unknown; params?: unknown; query?: unknown };
    }
  }
}

type Schemas = { body?: ZodType; params?: ZodType; query?: ZodType };

// Checks the request against zod schemas. The parsed values are put on
// res.locals.valid so routes use the checked data, not the raw request.
export function validate(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    const valid: Record<string, unknown> = {};

    for (const part of ["body", "params", "query"] as const) {
      const schema = schemas[part];
      if (!schema) continue;

      const result = schema.safeParse(req[part]);
      if (!result.success) {
        const message = result.error.issues
          .map(
            (issue) => `${[part, ...issue.path].join(".")}: ${issue.message}`,
          )
          .join("; ");
        throw validationFailed(message);
      }
      valid[part] = result.data;
    }

    res.locals.valid = valid;
    next();
  };
}
