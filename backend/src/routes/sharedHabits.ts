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
  createSharedHabit,
  getSharedHabit,
  listSharedHabits,
  type CreateSharedInput,
} from "../services/sharedHabits.js";
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
      const code = req.params.code as string;
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
