import { createInviteRateLimit } from "../middleware/inviteRateLimit.js";
import {
  previewSharedHabit,
  joinSharedHabit,
} from "../services/sharedHabitJoin.js";
import { notFound } from "../lib/errors.js";
import { Router } from "express";
import { z } from "zod";
import { type Pagination } from "../lib/pagination.js";
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
import {
  removeSharedMember,
  transferSharedHabit,
} from "../services/sharedHabitMembers.js";
import {
  editSharedHabit,
  manageSharedCode,
  deleteSharedHabit,
} from "../services/sharedHabitManagement.js";
import { addLogBody, logParams } from "./logs.js";
import { createHabitBody, habitListQuery, habitParams } from "./habits.js";

export const createSharedHabitBody = createHabitBody.extend({
  join_by: createHabitBody.shape.start_date.unwrap(),
  max_members: z.number().int().min(2).max(50),
});
// PATCH preserves an explicit null so an owner can clear the description.
export const editSharedHabitBody = z
  .strictObject({
    name: createHabitBody.shape.name.optional(),
    description: z.string().max(500).nullable().optional(),
    plant_type: createHabitBody.shape.plant_type.optional(),
    target_count: createHabitBody.shape.target_count.optional(),
    interval_count: createHabitBody.shape.interval_count.optional(),
    interval_unit: createHabitBody.shape.interval_unit.optional(),
    num_periods: createHabitBody.shape.num_periods.optional(),
    start_date: createHabitBody.shape.start_date,
    join_by: createHabitBody.shape.start_date,
    max_members: z.number().int().min(2).max(50).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "provide at least one field",
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
  validate({ query: habitListQuery }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res.json(
      await listSharedHabits(
        supabase,
        user.id,
        valid.query as Pagination & { status: "active" | "finished" | "both" },
      ),
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

const memberParams = z.strictObject({
  id: z.string().uuid(),
  userId: z.string().uuid(),
});
const transferBody = z.strictObject({ user_id: z.string().uuid() });

sharedHabitsRouter.delete(
  "/shared-habits/:id/members/me",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id } = valid.params as z.infer<typeof habitParams>;
    await removeSharedMember(supabase, user.id, id, user.id, true);
    res.status(204).end();
  },
);
sharedHabitsRouter.delete(
  "/shared-habits/:id/members/:userId",
  requireAuth,
  validate({ params: memberParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id, userId } = valid.params as z.infer<typeof memberParams>;
    await removeSharedMember(supabase, user.id, id, userId, false);
    res.status(204).end();
  },
);
sharedHabitsRouter.post(
  "/shared-habits/:id/transfer",
  requireAuth,
  validate({ params: habitParams, body: transferBody }),
  async (_req, res) => {
    const { supabase, valid } = res.locals;
    const { id } = valid.params as z.infer<typeof habitParams>;
    const { user_id } = valid.body as z.infer<typeof transferBody>;
    await transferSharedHabit(supabase, id, user_id);
    res.status(204).end();
  },
);

sharedHabitsRouter.patch(
  "/shared-habits/:id",
  requireAuth,
  validate({ params: habitParams, body: editSharedHabitBody }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    const { id } = valid.params as z.infer<typeof habitParams>;
    res.json(
      await editSharedHabit(
        supabase,
        user.id,
        id,
        valid.body as z.infer<typeof editSharedHabitBody>,
      ),
    );
  },
);
sharedHabitsRouter.delete(
  "/shared-habits/:id",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    await deleteSharedHabit(
      supabase,
      user.id,
      (valid.params as z.infer<typeof habitParams>).id,
    );
    res.status(204).end();
  },
);
sharedHabitsRouter.post(
  "/shared-habits/:id/code",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    res.json(
      await manageSharedCode(
        supabase,
        user.id,
        (valid.params as z.infer<typeof habitParams>).id,
        true,
      ),
    );
  },
);
sharedHabitsRouter.delete(
  "/shared-habits/:id/code",
  requireAuth,
  validate({ params: habitParams }),
  async (_req, res) => {
    const { user, supabase, valid } = res.locals;
    await manageSharedCode(
      supabase,
      user.id,
      (valid.params as z.infer<typeof habitParams>).id,
      false,
    );
    res.status(204).end();
  },
);
