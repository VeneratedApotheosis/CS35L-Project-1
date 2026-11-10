import { Router } from "express";
import { DateTime } from "luxon";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { addLog, deleteLog } from "../services/habitLogs.js";

export const logsRouter = Router();

// The body is optional: with no body, the log is for today.
export const addLogBody = z
  .strictObject({
    occurred_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "must be a date like 2026-11-05")
      .refine((value) => DateTime.fromISO(value).isValid, {
        message: "not a real calendar date",
      })
      .optional(),
  })
  .optional();

export const habitLogsParams = z.strictObject({ id: z.string().uuid() });
export const logParams = z.strictObject({
  id: z.string().uuid(),
  logId: z.string().uuid(),
});

logsRouter.post(
  "/habits/:id/logs",
  requireAuth,
  validate({ params: habitLogsParams, body: addLogBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id } = valid.params as z.infer<typeof habitLogsParams>;
    const body = valid.body as z.infer<typeof addLogBody>;
    const result = await addLog(supabase, user.id, id, body?.occurred_on);
    res.status(201).json(result);
  },
);

logsRouter.delete(
  "/habits/:id/logs/:logId",
  requireAuth,
  validate({ params: logParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id, logId } = valid.params as z.infer<typeof logParams>;
    res.json(await deleteLog(supabase, user.id, id, logId));
  },
);
