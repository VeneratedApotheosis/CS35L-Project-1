import { createInviteRateLimit } from "../middleware/inviteRateLimit.js";
import {
  previewSharedHabit,
  joinSharedHabit,
} from "../services/sharedHabitJoin.js";
import { notFound } from "../lib/errors.js";
import { Router } from "express";
import { z } from "zod";
import { paginationQuery, type Pagination } from "../lib/pagination.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import {
  addSharedLog,
  deleteSharedLog,
  createSharedHabit,
  getSharedHabit,
  listSharedHabits,
  type CreateSharedInput,
} from "../services/sharedHabits.js";
import { addLogBody, logParams } from "./logs.js";
import { createHabitBody, habitParams } from "./habits.js";

export const createSharedHabitBody = createHabitBody.extend({
  join_by: createHabitBody.shape.start_date.unwrap(),
  max_members: z.number().int().min(2).max(50),
});
export const sharedHabitsRouter = Router();
sharedHabitsRouter.post(
  "/shared-habits",
  requireAuth,
  validate({ body: createSharedHabitBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res
      .status(201)
      .json(
        await createSharedHabit(
          supabase,
          user.id,
          valid.body as CreateSharedInput,
        ),
      );
  },
);
sharedHabitsRouter.get(
  "/shared-habits",
  requireAuth,
  validate({ query: paginationQuery }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res.json(
      await listSharedHabits(supabase, user.id, valid.query as Pagination),
    );
  },
);
sharedHabitsRouter.get(
  "/shared-habits/:id",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res.json(
      await getSharedHabit(
        supabase,
        user.id,
        (valid.params as { id: string }).id,
      ),
    );
  },
);

// Both routes share a budget keyed by verified identity, not the invite code.
const inviteLimit = createInviteRateLimit();
for (const method of ["get", "post"] as const) {
  sharedHabitsRouter[method](
    "/shared-habits/join/:code",
    requireAuth,
    inviteLimit,
    async (req, res) => {
      // Invite codes are stored lowercase; accept any casing a user pastes.
      const code = (req.params.code as string).toLowerCase();
      // Same public error for malformed, unknown and closed codes.
      if (!/^[a-f0-9]{32}$/.test(code)) throw notFound("Invite not available");
      const { user, supabase } = res.locals;
      res.json(
        method === "get"
          ? await previewSharedHabit(supabase, user.id, code)
          : await joinSharedHabit(supabase, code),
      );
    },
  );
}

sharedHabitsRouter.post(
  "/shared-habits/:id/logs",
  requireAuth,
  validate({ params: habitParams, body: addLogBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const params = valid.params as z.infer<typeof habitParams>;
    const body = valid.body as z.infer<typeof addLogBody>;
    res
      .status(201)
      .json(
        await addSharedLog(supabase, user.id, params.id, body?.occurred_on),
      );
  },
);
sharedHabitsRouter.delete(
  "/shared-habits/:id/logs/:logId",
  requireAuth,
  validate({ params: logParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const params = valid.params as z.infer<typeof logParams>;
    res.json(await deleteSharedLog(supabase, user.id, params.id, params.logId));
  },
);
